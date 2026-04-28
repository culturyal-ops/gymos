/**
 * GET /api/admin/health
 *
 * Super-admin health dashboard endpoint.
 * Protected by INTERNAL_API_SECRET header.
 *
 * Returns queue depths, DLQ entries, AI cache stats, and recent errors.
 */

import { NextResponse } from "next/server";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { errorResponse } from "@/lib/api";

export async function GET(request: Request) {
  const authHeader = request.headers.get("x-internal-secret");
  if (authHeader !== process.env.INTERNAL_API_SECRET!) {
    return errorResponse("Forbidden", 403);
  }

  const supabase = getAdminSupabase();

  // Health summary from view
  const { data: summary, error: summaryError } = await supabase
    .from("health_summary")
    .select("*")
    .single();

  if (summaryError) {
    return errorResponse(summaryError.message, 500);
  }

  // Recent DLQ entries (last 20)
  const { data: dlqEntries } = await supabase
    .from("dead_letter_queue")
    .select("id, gym_id, error, retry_count, created_at")
    .order("created_at", { ascending: false })
    .limit(20);

  // Recent errors (last 20)
  const { data: recentErrors } = await supabase
    .from("error_log")
    .select("id, gym_id, context, message, created_at")
    .order("created_at", { ascending: false })
    .limit(20);

  // MRR from active subscriptions (Fix 9 data)
  const { data: mrrData } = await supabase
    .from("subscriptions")
    .select("plan_id, status")
    .eq("status", "active");

  const PLAN_PRICES: Record<string, number> = {
    starter: 2999,
    growth: 5999,
    scale: 9999,
  };

  const mrr = (mrrData ?? []).reduce(
    (sum, s) => sum + (PLAN_PRICES[s.plan_id] ?? 0),
    0
  );

  return NextResponse.json({
    summary,
    mrr_inr: mrr,
    dlq: dlqEntries ?? [],
    recent_errors: recentErrors ?? [],
    checked_at: new Date().toISOString(),
  });
}

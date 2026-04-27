/**
 * POST /api/billing/create-subscription
 *
 * Creates a Razorpay Subscription for a gym owner and persists it.
 *
 * Body: { gym_id: string, plan_item_id: string, coupon_code?: string }
 *   plan_item_id — the Razorpay Plan ID (e.g. "plan_GymOS_Starter")
 *
 * Response: { subscription_id: string, short_url: string }
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { getServerSupabase } from "@/lib/supabase/server";
import { errorResponse, safeJson } from "@/lib/api";
import { logError } from "@/lib/logger";

const RAZORPAY_GYMOS_KEY_ID     = process.env.RAZORPAY_GYMOS_KEY_ID!;
const RAZORPAY_GYMOS_KEY_SECRET = process.env.RAZORPAY_GYMOS_KEY_SECRET!;

const schema = z.object({
  gym_id:       z.string().uuid(),
  plan_item_id: z.string().min(1),   // Razorpay Plan ID for the GymOS tier
  coupon_code:  z.string().optional(),
});

export async function POST(request: Request) {
  const serverClient = await getServerSupabase();
  const { data: { user } } = await serverClient.auth.getUser();
  if (!user) return errorResponse("Unauthorized", 401);

  const parsed = schema.safeParse(await safeJson(request));
  if (!parsed.success) return errorResponse(parsed.error.message, 400);

  const { gym_id, plan_item_id, coupon_code } = parsed.data;

  const supabase = getAdminSupabase();

  // Verify the requesting user owns this gym
  const { data: gym } = await supabase
    .from("gyms")
    .select("id, owner_id, name, phone")
    .eq("id", gym_id)
    .single();

  if (!gym || gym.owner_id !== user.id) {
    return errorResponse("Forbidden", 403);
  }

  // Create Razorpay Subscription
  const auth = Buffer.from(`${RAZORPAY_GYMOS_KEY_ID}:${RAZORPAY_GYMOS_KEY_SECRET}`).toString("base64");

  let rzpSub: { id: string; short_url?: string; status: string } | null = null;
  try {
    const body: Record<string, unknown> = {
      plan_id:        plan_item_id,
      total_count:    120,          // 10 years max; Razorpay stops at expiry
      quantity:       1,
      customer_notify: 1,
      notes: { gym_id, gym_name: gym.name },
    };
    if (coupon_code) body.offer_id = coupon_code;

    const res = await fetch("https://api.razorpay.com/v1/subscriptions", {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.json();
      return errorResponse(err.error?.description ?? "Razorpay error", 502);
    }

    rzpSub = await res.json();
  } catch (e) {
    await logError(e, { gymId: gym_id, context: "create_subscription" });
    return errorResponse("Failed to create subscription", 500);
  }

  if (!rzpSub) return errorResponse("No subscription returned", 500);

  // Persist to subscriptions table
  const { error: dbError } = await supabase.from("subscriptions").insert({
    gym_id,
    plan_id:                  plan_item_id,
    razorpay_subscription_id: rzpSub.id,
    status:                   rzpSub.status,
  });

  if (dbError) {
    await logError(dbError, { gymId: gym_id, context: "subscription_insert" });
    return errorResponse("Subscription created but failed to save", 500);
  }

  return NextResponse.json({
    subscription_id: rzpSub.id,
    short_url:       rzpSub.short_url ?? null,
  });
}

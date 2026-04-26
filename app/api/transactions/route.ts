import { NextResponse } from "next/server";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { TEST_GYM_ID } from "@/lib/gym-context";
import { errorResponse, safeJson } from "@/lib/api";
import { hasServiceSupabaseEnv } from "@/lib/env";
import { demoTransactions } from "@/lib/demo-data";

const transactionSchema = z.object({
  member_id: z.string().uuid(),
  amount: z.number().positive(),
  payment_mode: z.enum(["cash", "counter_upi", "razorpay_link", "razorpay_subscription"]),
  plan_purchased: z.string().optional()
});

export async function GET() {
  if (!hasServiceSupabaseEnv()) {
    return NextResponse.json(demoTransactions);
  }

  const supabase = getAdminSupabase();
  const { data, error } = await supabase
    .from("transactions")
    .select("*")
    .eq("gym_id", TEST_GYM_ID)
    .order("created_at", { ascending: false });
  if (error) return errorResponse(error.message, 500);
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const parsed = transactionSchema.safeParse(await safeJson(request));
  if (!parsed.success) return errorResponse(parsed.error.message);

  if (!hasServiceSupabaseEnv()) {
    return NextResponse.json(
      {
        id: randomUUID(),
        gym_id: TEST_GYM_ID,
        member_id: parsed.data.member_id,
        amount: parsed.data.amount,
        payment_mode: parsed.data.payment_mode,
        plan_purchased: parsed.data.plan_purchased ?? null,
        auto_logged: false,
        created_at: new Date().toISOString(),
        simulated: true
      },
      { status: 201 }
    );
  }

  const supabase = getAdminSupabase();
  const { data, error } = await supabase
    .from("transactions")
    .insert({
      id: randomUUID(),
      gym_id: TEST_GYM_ID,
      member_id: parsed.data.member_id,
      amount: parsed.data.amount,
      payment_mode: parsed.data.payment_mode,
      plan_purchased: parsed.data.plan_purchased ?? null,
      logged_by: "55555555-5555-5555-5555-555555555555",
      auto_logged: false
    })
    .select("*")
    .single();

  if (error) return errorResponse(error.message, 500);
  return NextResponse.json(data, { status: 201 });
}

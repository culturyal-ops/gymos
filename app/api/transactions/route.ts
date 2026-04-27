import { NextResponse } from "next/server";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { getServerSupabase } from "@/lib/supabase/server";
import { TEST_GYM_ID } from "@/lib/gym-context";
import { errorResponse, safeJson } from "@/lib/api";
import { hasServiceSupabaseEnv } from "@/lib/env";
import { demoTransactions } from "@/lib/demo-data";

const transactionSchema = z.object({
  member_id: z.string().uuid(),
  amount: z.number().positive(),
  payment_mode: z.enum(["cash", "counter_upi", "razorpay_link", "razorpay_subscription"]),
  plan_purchased: z.string().optional(),
});

async function resolveGymId(userId: string): Promise<string | null> {
  const supabase = getAdminSupabase();
  const { data: gymData } = await supabase
    .from("gyms")
    .select("id")
    .eq("owner_id", userId)
    .single();
  if (gymData) return gymData.id;

  const { data: staffData } = await supabase
    .from("gym_staff")
    .select("gym_id")
    .eq("user_id", userId)
    .single();
  return staffData?.gym_id ?? null;
}

export async function GET() {
  if (!hasServiceSupabaseEnv()) {
    return NextResponse.json(demoTransactions);
  }

  const serverClient = await getServerSupabase();
  const {
    data: { user },
  } = await serverClient.auth.getUser();

  if (!user) return NextResponse.json(demoTransactions);

  const gymId = await resolveGymId(user.id);
  if (!gymId) return errorResponse("No gym found", 403);

  const supabase = getAdminSupabase();
  const { data, error } = await supabase
    .from("transactions")
    .select("*")
    .eq("gym_id", gymId)
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
        ...parsed.data,
        auto_logged: false,
        created_at: new Date().toISOString(),
        simulated: true,
      },
      { status: 201 }
    );
  }

  const serverClient = await getServerSupabase();
  const {
    data: { user },
  } = await serverClient.auth.getUser();

  const gymId = user ? (await resolveGymId(user.id)) ?? TEST_GYM_ID : TEST_GYM_ID;

  const supabase = getAdminSupabase();
  const { data, error } = await supabase
    .from("transactions")
    .insert({
      id: randomUUID(),
      gym_id: gymId,
      member_id: parsed.data.member_id,
      amount: parsed.data.amount,
      payment_mode: parsed.data.payment_mode,
      plan_purchased: parsed.data.plan_purchased ?? null,
      auto_logged: false,
    })
    .select("*")
    .single();

  if (error) return errorResponse(error.message, 500);
  return NextResponse.json(data, { status: 201 });
}

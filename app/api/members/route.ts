import { NextResponse } from "next/server";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { TEST_GYM_ID } from "@/lib/gym-context";
import { errorResponse, safeJson } from "@/lib/api";
import { hasServiceSupabaseEnv } from "@/lib/env";
import { demoMembers } from "@/lib/demo-data";

const memberSchema = z.object({
  name: z.string().min(1),
  phone: z.string().min(6),
  email: z.string().email().optional(),
  plan_type: z.string().optional(),
  status: z.enum(["active", "expiring", "churned", "paused"]).default("active")
});

export async function GET() {
  if (!hasServiceSupabaseEnv()) {
    return NextResponse.json(demoMembers);
  }

  const supabase = getAdminSupabase();
  const { data, error } = await supabase
    .from("members")
    .select("*")
    .eq("gym_id", TEST_GYM_ID)
    .order("created_at", { ascending: false });
  if (error) return errorResponse(error.message, 500);
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const parsed = memberSchema.safeParse(await safeJson(request));
  if (!parsed.success) return errorResponse(parsed.error.message);

  if (!hasServiceSupabaseEnv()) {
    return NextResponse.json(
      {
        id: randomUUID(),
        gym_id: TEST_GYM_ID,
        name: parsed.data.name,
        phone: parsed.data.phone,
        email: parsed.data.email ?? null,
        plan_type: parsed.data.plan_type ?? "bronze_1m",
        status: parsed.data.status,
        expiry_date: new Date(Date.now() + 30 * 86400000).toISOString(),
        joined_at: new Date().toISOString(),
        added_by: null,
        created_at: new Date().toISOString(),
        simulated: true
      },
      { status: 201 }
    );
  }

  const supabase = getAdminSupabase();
  const { data, error } = await supabase
    .from("members")
    .insert({
      id: randomUUID(),
      gym_id: TEST_GYM_ID,
      name: parsed.data.name,
      phone: parsed.data.phone,
      email: parsed.data.email ?? null,
      plan_type: parsed.data.plan_type ?? "bronze_1m",
      status: parsed.data.status,
      expiry_date: new Date(Date.now() + 30 * 86400000).toISOString(),
      joined_at: new Date().toISOString(),
      added_by: "55555555-5555-5555-5555-555555555555"
    })
    .select("*")
    .single();

  if (error) return errorResponse(error.message, 500);
  return NextResponse.json(data, { status: 201 });
}

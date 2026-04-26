import { NextResponse } from "next/server";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { getServerSupabase } from "@/lib/supabase/server";
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

  const serverClient = await getServerSupabase();
  const { data: { user } } = await serverClient.auth.getUser();

  if (!user) {
    return NextResponse.json(demoMembers);
  }

  const supabase = getAdminSupabase();
  let gymId = null;

  const { data: gymData } = await supabase
    .from("gyms")
    .select("id")
    .eq("owner_id", user.id)
    .single();

  if (gymData) {
    gymId = gymData.id;
  } else {
    const { data: staffData } = await supabase
      .from("gym_staff")
      .select("gym_id")
      .eq("user_id", user.id)
      .single();
    if (staffData) gymId = staffData.gym_id;
  }

  if (!gymId) {
    return errorResponse("User has no associated gym", 403);
  }

  const { data, error } = await supabase
    .from("members")
    .select("*")
    .eq("gym_id", gymId)
    .order("created_at", { ascending: false });

  if (error) return errorResponse(error.message, 500);
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const parsed = memberSchema.safeParse(await safeJson(request));
  if (!parsed.success) return errorResponse(parsed.error.message);

  const serverClient = await getServerSupabase();
  const { data: { user } } = await serverClient.auth.getUser();

  if (!hasServiceSupabaseEnv() || !user) {
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
  
  let gymId = null;
  let addedById = null;

  const { data: gymData } = await supabase
    .from("gyms")
    .select("id")
    .eq("owner_id", user.id)
    .single();

  if (gymData) {
    gymId = gymData.id;
  } else {
    const { data: staffData } = await supabase
      .from("gym_staff")
      .select("id, gym_id")
      .eq("user_id", user.id)
      .single();
    if (staffData) {
      gymId = staffData.gym_id;
      addedById = staffData.id;
    }
  }

  if (!gymId) {
    return errorResponse("User has no associated gym", 403);
  }

  const { data, error } = await supabase
    .from("members")
    .insert({
      id: randomUUID(),
      gym_id: gymId,
      name: parsed.data.name,
      phone: parsed.data.phone,
      email: parsed.data.email ?? null,
      plan_type: parsed.data.plan_type ?? "bronze_1m",
      status: parsed.data.status,
      expiry_date: new Date(Date.now() + 30 * 86400000).toISOString(),
      joined_at: new Date().toISOString(),
      added_by: addedById
    })
    .select("*")
    .single();

  if (error) return errorResponse(error.message, 500);
  return NextResponse.json(data, { status: 201 });
}

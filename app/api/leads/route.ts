import { NextResponse } from "next/server";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { getServerSupabase } from "@/lib/supabase/server";
import { TEST_GYM_ID } from "@/lib/gym-context";
import { errorResponse, safeJson } from "@/lib/api";
import { hasServiceSupabaseEnv } from "@/lib/env";
import { demoLeads } from "@/lib/demo-data";

const leadSchema = z.object({
  name: z.string().min(1),
  phone: z.string().min(6),
  source: z
    .enum(["whatsapp", "instagram_ad", "walkin", "referral"])
    .default("walkin"),
  query_text: z.string().optional(),
  stage: z
    .enum(["new", "ai_replied", "followed_up", "converted", "cold"])
    .default("new"),
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
    return NextResponse.json(demoLeads);
  }

  const serverClient = await getServerSupabase();
  const {
    data: { user },
  } = await serverClient.auth.getUser();

  if (!user) return NextResponse.json(demoLeads);

  const gymId = await resolveGymId(user.id);
  if (!gymId) return errorResponse("No gym found", 403);

  const supabase = getAdminSupabase();
  const { data, error } = await supabase
    .from("leads")
    .select("*")
    .eq("gym_id", gymId)
    .order("created_at", { ascending: false });

  if (error) return errorResponse(error.message, 500);
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const parsed = leadSchema.safeParse(await safeJson(request));
  if (!parsed.success) return errorResponse(parsed.error.message);

  if (!hasServiceSupabaseEnv()) {
    return NextResponse.json(
      {
        id: randomUUID(),
        gym_id: TEST_GYM_ID,
        ...parsed.data,
        ai_reply_sent: false,
        discount_sent: false,
        last_interaction: new Date().toISOString(),
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
    .from("leads")
    .insert({
      id: randomUUID(),
      gym_id: gymId,
      ...parsed.data,
      ai_reply_sent: false,
      discount_sent: false,
      last_interaction: new Date().toISOString(),
    })
    .select("*")
    .single();

  if (error) return errorResponse(error.message, 500);
  return NextResponse.json(data, { status: 201 });
}

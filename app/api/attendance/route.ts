import { NextResponse } from "next/server";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { getServerSupabase } from "@/lib/supabase/server";
import { TEST_GYM_ID } from "@/lib/gym-context";
import { errorResponse, safeJson } from "@/lib/api";
import { hasServiceSupabaseEnv } from "@/lib/env";

const attendanceSchema = z.object({
  member_id: z.string().uuid(),
});

async function resolveGymAndStaff(
  userId: string
): Promise<{ gymId: string; staffId: string | null }> {
  const supabase = getAdminSupabase();
  const { data: gymData } = await supabase
    .from("gyms")
    .select("id")
    .eq("owner_id", userId)
    .single();
  if (gymData) return { gymId: gymData.id, staffId: null };

  const { data: staffData } = await supabase
    .from("gym_staff")
    .select("id, gym_id")
    .eq("user_id", userId)
    .single();
  if (staffData) return { gymId: staffData.gym_id, staffId: staffData.id };

  return { gymId: TEST_GYM_ID, staffId: null };
}

export async function POST(request: Request) {
  const parsed = attendanceSchema.safeParse(await safeJson(request));
  if (!parsed.success) return errorResponse(parsed.error.message);

  if (!hasServiceSupabaseEnv()) {
    return NextResponse.json(
      {
        id: randomUUID(),
        gym_id: TEST_GYM_ID,
        member_id: parsed.data.member_id,
        logged_at: new Date().toISOString(),
        logged_by: null,
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

  const { gymId, staffId } = user
    ? await resolveGymAndStaff(user.id)
    : { gymId: TEST_GYM_ID, staffId: null };

  const supabase = getAdminSupabase();
  const { data, error } = await supabase
    .from("attendance_logs")
    .insert({
      id: randomUUID(),
      gym_id: gymId,
      member_id: parsed.data.member_id,
      logged_at: new Date().toISOString(),
      logged_by: staffId,
    })
    .select("*")
    .single();

  if (error) return errorResponse(error.message, 500);
  return NextResponse.json(data, { status: 201 });
}

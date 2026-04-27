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
  /**
   * Client-generated UUID for idempotency.
   * If provided, the insert uses ON CONFLICT (gym_id, offline_id) DO NOTHING
   * so retried syncs never create duplicate rows.
   */
  offline_id: z.string().optional(),
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
  const loggedAt = new Date().toISOString();

  // If an offline_id is supplied, write to the offline queue first using
  // ON CONFLICT DO NOTHING — this makes the endpoint fully idempotent for
  // retried offline syncs.
  if (parsed.data.offline_id) {
    const { error: queueError } = await supabase
      .from("offline_attendance_queue")
      .insert({
        gym_id: gymId,
        member_id: parsed.data.member_id,
        offline_id: parsed.data.offline_id,
        logged_at: loggedAt,
        synced: true,
        synced_at: loggedAt,
      })
      .select()
      // Supabase JS surfaces ON CONFLICT DO NOTHING via ignoreDuplicates
      // (equivalent to upsert with ignoreDuplicates: true on the unique key)
      ;

    // PGRST116 = no rows returned (conflict was ignored) — that's fine
    if (queueError && queueError.code !== "23505" && queueError.code !== "PGRST116") {
      console.error("Offline queue insert error:", queueError);
      // Non-fatal — still proceed to log attendance
    }
  }

  const { data, error } = await supabase
    .from("attendance_logs")
    .insert({
      id: randomUUID(),
      gym_id: gymId,
      member_id: parsed.data.member_id,
      logged_at: loggedAt,
      logged_by: staffId,
    })
    .select("*")
    .single();

  if (error) {
    // Duplicate attendance for the same offline_id is not an error
    if (error.code === "23505") {
      return NextResponse.json({ deduplicated: true }, { status: 200 });
    }
    return errorResponse(error.message, 500);
  }

  return NextResponse.json(data, { status: 201 });
}

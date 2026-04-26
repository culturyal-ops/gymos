import { NextResponse } from "next/server";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { TEST_GYM_ID } from "@/lib/gym-context";
import { errorResponse, safeJson } from "@/lib/api";
import { hasServiceSupabaseEnv } from "@/lib/env";

const attendanceSchema = z.object({
  member_id: z.string().uuid()
});

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
        simulated: true
      },
      { status: 201 }
    );
  }

  const supabase = getAdminSupabase();
  const { data, error } = await supabase
    .from("attendance_logs")
    .insert({
      id: randomUUID(),
      gym_id: TEST_GYM_ID,
      member_id: parsed.data.member_id,
      logged_at: new Date().toISOString(),
      logged_by: "55555555-5555-5555-5555-555555555555"
    })
    .select("*")
    .single();

  if (error) return errorResponse(error.message, 500);
  return NextResponse.json(data, { status: 201 });
}

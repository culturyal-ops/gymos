import { NextResponse } from "next/server";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { getServerSupabase } from "@/lib/supabase/server";
import { errorResponse, safeJson } from "@/lib/api";

const registerSchema = z.object({
  gymName: z.string().min(2, "Gym name must be at least 2 characters"),
  userId: z.string().uuid().optional(),
});

export async function POST(request: Request) {
  const parsed = registerSchema.safeParse(await safeJson(request));
  if (!parsed.success) return errorResponse(parsed.error.message);

  // Resolve user id — prefer session, fall back to userId passed from client
  let userId: string | null = null;

  try {
    const serverClient = await getServerSupabase();
    const { data: { user } } = await serverClient.auth.getUser();
    if (user) userId = user.id;
  } catch {
    // session not available (e.g. email not confirmed yet)
  }

  if (!userId && parsed.data.userId) {
    userId = parsed.data.userId;
  }

  if (!userId) {
    return errorResponse("Unauthorized", 401);
  }

  const supabase = getAdminSupabase();

  // Check if owner already has a gym
  const { data: existingGym } = await supabase
    .from("gyms")
    .select("id")
    .eq("owner_id", userId)
    .single();

  if (existingGym) {
    return NextResponse.json({ success: true, gym: existingGym }, { status: 200 });
  }

  const gymId = randomUUID();
  const slug =
    parsed.data.gymName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)+/g, "") +
    "-" +
    gymId.split("-")[0];

  const { data, error } = await supabase
    .from("gyms")
    .insert({
      id: gymId,
      owner_id: userId,
      name: parsed.data.gymName,
      slug,
      plan_tier: "starter",
      is_active: true,
      onboarded_at: new Date().toISOString(),
    })
    .select("*")
    .single();

  if (error) return errorResponse(error.message, 500);

  return NextResponse.json({ success: true, gym: data }, { status: 201 });
}

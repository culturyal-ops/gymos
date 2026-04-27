"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { getServerSupabase } from "@/lib/supabase/server";
import { hasServiceSupabaseEnv } from "@/lib/env";
import { TEST_GYM_ID } from "@/lib/gym-context";

// ─── helpers ────────────────────────────────────────────────────────────────

async function resolveGymAndStaff(): Promise<{
  gymId: string;
  staffId: string | null;
  userId: string | null;
}> {
  if (!hasServiceSupabaseEnv()) {
    return { gymId: TEST_GYM_ID, staffId: null, userId: null };
  }

  const serverClient = await getServerSupabase();
  const {
    data: { user },
  } = await serverClient.auth.getUser();

  if (!user) return { gymId: TEST_GYM_ID, staffId: null, userId: null };

  const supabase = getAdminSupabase();

  const { data: gymData } = await supabase
    .from("gyms")
    .select("id")
    .eq("owner_id", user.id)
    .single();

  if (gymData) return { gymId: gymData.id, staffId: null, userId: user.id };

  const { data: staffData } = await supabase
    .from("gym_staff")
    .select("id, gym_id")
    .eq("user_id", user.id)
    .single();

  if (staffData)
    return { gymId: staffData.gym_id, staffId: staffData.id, userId: user.id };

  return { gymId: TEST_GYM_ID, staffId: null, userId: null };
}

// ─── members ────────────────────────────────────────────────────────────────

export async function addMember(formData: FormData) {
  const name = formData.get("name") as string;
  const phone = formData.get("phone") as string;
  const email = (formData.get("email") as string) || null;
  const plan_type = (formData.get("plan") as string) || "bronze_1m";
  const expiry_raw = formData.get("expiry") as string;

  const planDays: Record<string, number> = {
    gold_6m: 180,
    silver_3m: 90,
    bronze_1m: 30,
  };
  const days = planDays[plan_type] ?? 30;
  const expiry_date = expiry_raw
    ? new Date(expiry_raw).toISOString()
    : new Date(Date.now() + days * 86400000).toISOString();

  if (!hasServiceSupabaseEnv()) {
    return { success: true, simulated: true };
  }

  const { gymId, staffId } = await resolveGymAndStaff();
  const supabase = getAdminSupabase();

  const { error } = await supabase.from("members").insert({
    id: randomUUID(),
    gym_id: gymId,
    name,
    phone,
    email,
    plan_type,
    status: "active",
    expiry_date,
    joined_at: new Date().toISOString(),
    streak_count: 0,
    added_by: staffId,
  });

  if (error) return { success: false, error: error.message };

  revalidatePath("/members");
  revalidatePath("/");
  return { success: true };
}

export async function deleteMember(memberId: string) {
  if (!hasServiceSupabaseEnv()) return { success: true, simulated: true };

  const { gymId } = await resolveGymAndStaff();
  const supabase = getAdminSupabase();

  const { error } = await supabase
    .from("members")
    .delete()
    .eq("id", memberId)
    .eq("gym_id", gymId);

  if (error) return { success: false, error: error.message };

  revalidatePath("/members");
  revalidatePath("/");
  return { success: true };
}

export async function updateMemberStatus(
  memberId: string,
  status: "active" | "expiring" | "churned" | "paused"
) {
  if (!hasServiceSupabaseEnv()) return { success: true, simulated: true };

  const { gymId } = await resolveGymAndStaff();
  const supabase = getAdminSupabase();

  const { error } = await supabase
    .from("members")
    .update({ status })
    .eq("id", memberId)
    .eq("gym_id", gymId);

  if (error) return { success: false, error: error.message };

  revalidatePath("/members");
  revalidatePath("/");
  return { success: true };
}

// ─── leads ──────────────────────────────────────────────────────────────────

export async function addLead(formData: FormData) {
  const name = formData.get("name") as string;
  const phone = formData.get("phone") as string;
  const source = (formData.get("source") as string) || "walkin";
  const query_text = (formData.get("query") as string) || null;

  if (!hasServiceSupabaseEnv()) {
    return { success: true, simulated: true };
  }

  const { gymId } = await resolveGymAndStaff();
  const supabase = getAdminSupabase();

  const { error } = await supabase.from("leads").insert({
    id: randomUUID(),
    gym_id: gymId,
    name,
    phone,
    source,
    query_text,
    stage: "new",
    ai_reply_sent: false,
    discount_sent: false,
    last_interaction: new Date().toISOString(),
  });

  if (error) return { success: false, error: error.message };

  revalidatePath("/leads");
  revalidatePath("/");
  return { success: true };
}

export async function updateLeadStage(
  leadId: string,
  stage: "new" | "ai_replied" | "followed_up" | "converted" | "cold"
) {
  if (!hasServiceSupabaseEnv()) return { success: true, simulated: true };

  const { gymId } = await resolveGymAndStaff();
  const supabase = getAdminSupabase();

  const { error } = await supabase
    .from("leads")
    .update({ stage, last_interaction: new Date().toISOString() })
    .eq("id", leadId)
    .eq("gym_id", gymId);

  if (error) return { success: false, error: error.message };

  revalidatePath("/leads");
  return { success: true };
}

// ─── transactions ────────────────────────────────────────────────────────────

export async function logPayment(formData: FormData) {
  const member_id = formData.get("member_id") as string;
  const amount = Number(formData.get("amount"));
  const payment_mode = (formData.get("mode") as string) || "cash";
  const plan_purchased = (formData.get("plan") as string) || null;

  if (!member_id || !amount) return { success: false, error: "Member and amount required" };

  if (!hasServiceSupabaseEnv()) {
    return { success: true, simulated: true };
  }

  const { gymId, staffId } = await resolveGymAndStaff();
  const supabase = getAdminSupabase();

  const { error } = await supabase.from("transactions").insert({
    id: randomUUID(),
    gym_id: gymId,
    member_id,
    amount,
    payment_mode,
    plan_purchased,
    logged_by: staffId,
    auto_logged: false,
  });

  if (error) return { success: false, error: error.message };

  revalidatePath("/transactions");
  revalidatePath("/");
  return { success: true };
}

// ─── attendance ──────────────────────────────────────────────────────────────

export async function markAttendance(memberId: string) {
  if (!hasServiceSupabaseEnv()) return { success: true, simulated: true };

  const { gymId, staffId } = await resolveGymAndStaff();
  const supabase = getAdminSupabase();

  const { error } = await supabase.from("attendance_logs").insert({
    id: randomUUID(),
    gym_id: gymId,
    member_id: memberId,
    logged_at: new Date().toISOString(),
    logged_by: staffId,
  });

  if (error) return { success: false, error: error.message };

  // Increment streak
  await supabase.rpc("increment_streak", { p_member_id: memberId }).maybeSingle();

  revalidatePath("/members");
  return { success: true };
}

// ─── settings ────────────────────────────────────────────────────────────────

export async function saveSettings(formData: FormData) {
  if (!hasServiceSupabaseEnv()) return { success: true, simulated: true };

  const gymName = formData.get("gymName") as string;
  const city = formData.get("city") as string;
  const phone = formData.get("phone") as string;
  const batchTimings = formData.get("batchTimings") as string;
  const aiInstructions = formData.get("aiInstructions") as string;
  const pricingRaw = formData.get("pricing") as string;
  const autoReminders = formData.get("autoReminders") === "true";
  const reminderDays = Number(formData.get("reminderDays")) || 7;
  const supplementEnabled = formData.get("supplementEnabled") === "true";

  let pricing_json: Record<string, number> | null = null;
  try {
    pricing_json = JSON.parse(pricingRaw);
  } catch {
    // keep null
  }

  const { gymId } = await resolveGymAndStaff();
  const supabase = getAdminSupabase();

  // Update gym info
  await supabase
    .from("gyms")
    .update({ name: gymName, city, phone })
    .eq("id", gymId);

  // Upsert settings
  const { error } = await supabase.from("gym_settings").upsert(
    {
      gym_id: gymId,
      pricing_json,
      batch_timings: batchTimings,
      ai_instructions: aiInstructions,
      auto_reminders: autoReminders,
      reminder_days: reminderDays,
      supplement_enabled: supplementEnabled,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "gym_id" }
  );

  if (error) return { success: false, error: error.message };

  revalidatePath("/settings");
  return { success: true };
}

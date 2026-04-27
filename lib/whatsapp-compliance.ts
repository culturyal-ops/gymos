/**
 * WhatsApp Compliance & Rate Limiting
 * 
 * Enforces Meta's WhatsApp Business API policies:
 * - Opt-out management (STOP/UNSUBSCRIBE)
 * - Per-gym rate limiting (max 50 messages/day)
 * - Quality rating monitoring
 */

import { createClient } from "@supabase/supabase-js";
import { db } from "@/lib/supabase/typed-client";

const MAX_MESSAGES_PER_DAY = 50;

/**
 * Check if a phone number has opted out of WhatsApp messages
 */
export async function isPhoneOptedOut(
  supabase: ReturnType<typeof createClient>,
  gymId: string,
  phoneNumber: string
): Promise<boolean> {
  const { data, error } = await db(supabase)
    .from("whatsapp_opt_outs")
    .select("id")
    .eq("gym_id", gymId)
    .eq("phone_number", phoneNumber)
    .single();

  if (error && error.code !== "PGRST116") {
    // PGRST116 = no rows found (expected)
    console.error("Error checking opt-out status:", error);
  }

  return !!data;
}

/**
 * Add a phone number to the opt-out list
 */
export async function addPhoneOptOut(
  supabase: ReturnType<typeof createClient>,
  gymId: string,
  phoneNumber: string,
  reason?: string
): Promise<{ success: boolean; error?: string }> {
  const { error } = await db(supabase)
    .from("whatsapp_opt_outs")
    .insert({
      gym_id: gymId,
      phone_number: phoneNumber,
      reason: reason || "User requested"
    });

  if (error) {
    // Ignore duplicate key errors (already opted out)
    if (error.code === "23505") {
      return { success: true };
    }
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Check if gym has reached daily message limit
 */
export async function hasReachedDailyLimit(
  supabase: ReturnType<typeof createClient>,
  gymId: string
): Promise<boolean> {
  const today = new Date().toISOString().split("T")[0];

  const { data, error } = await db(supabase)
    .from("whatsapp_daily_counts")
    .select("count")
    .eq("gym_id", gymId)
    .eq("date", today)
    .single();

  if (error && error.code !== "PGRST116") {
    console.error("Error checking daily limit:", error);
  }

  return (data?.count || 0) >= MAX_MESSAGES_PER_DAY;
}

/**
 * Get current daily message count for a gym
 */
export async function getDailyMessageCount(
  supabase: ReturnType<typeof createClient>,
  gymId: string
): Promise<number> {
  const today = new Date().toISOString().split("T")[0];

  const { data, error } = await db(supabase)
    .from("whatsapp_daily_counts")
    .select("count")
    .eq("gym_id", gymId)
    .eq("date", today)
    .single();

  if (error && error.code !== "PGRST116") {
    console.error("Error fetching daily count:", error);
  }

  return data?.count || 0;
}

/**
 * Increment daily message count
 */
export async function incrementDailyCount(
  supabase: ReturnType<typeof createClient>,
  gymId: string
): Promise<{ success: boolean; error?: string }> {
  const today = new Date().toISOString().split("T")[0];

  // Try to update existing record
  const { data: existing, error: fetchError } = await db(supabase)
    .from("whatsapp_daily_counts")
    .select("id, count")
    .eq("gym_id", gymId)
    .eq("date", today)
    .single();

  if (fetchError && fetchError.code !== "PGRST116") {
    return { success: false, error: fetchError.message };
  }

  if (existing) {
    // Update existing
    const { error: updateError } = await db(supabase)
      .from("whatsapp_daily_counts")
      .update({ count: existing.count + 1 })
      .eq("id", existing.id);

    if (updateError) {
      return { success: false, error: updateError.message };
    }
  } else {
    // Insert new
    const { error: insertError } = await db(supabase)
      .from("whatsapp_daily_counts")
      .insert({
        gym_id: gymId,
        date: today,
        count: 1
      });

    if (insertError) {
      return { success: false, error: insertError.message };
    }
  }

  return { success: true };
}

/**
 * Validate WhatsApp message before sending
 * Returns validation result with reason if invalid
 */
export async function validateWhatsAppMessage(
  supabase: ReturnType<typeof createClient>,
  gymId: string,
  phoneNumber: string
): Promise<{
  valid: boolean;
  reason?: string;
}> {
  // Check opt-out status
  const optedOut = await isPhoneOptedOut(supabase, gymId, phoneNumber);
  if (optedOut) {
    return {
      valid: false,
      reason: "Recipient has opted out of WhatsApp messages"
    };
  }

  // Check daily limit
  const limitReached = await hasReachedDailyLimit(supabase, gymId);
  if (limitReached) {
    return {
      valid: false,
      reason: `Daily message limit (${MAX_MESSAGES_PER_DAY}) reached for this gym`
    };
  }

  return { valid: true };
}

/**
 * Handle STOP/UNSUBSCRIBE commands from WhatsApp
 * Called when a user sends these keywords
 */
export async function handleOptOutCommand(
  supabase: ReturnType<typeof createClient>,
  gymId: string,
  phoneNumber: string
): Promise<{ success: boolean; message: string }> {
  const result = await addPhoneOptOut(
    supabase,
    gymId,
    phoneNumber,
    "User sent STOP command"
  );

  if (result.success) {
    return {
      success: true,
      message: "You have been unsubscribed from WhatsApp messages. Reply START to resubscribe."
    };
  }

  return {
    success: false,
    message: "Error processing unsubscribe request"
  };
}

/**
 * Get compliance status for a gym
 */
export async function getComplianceStatus(
  supabase: ReturnType<typeof createClient>,
  gymId: string
): Promise<{
  dailyCount: number;
  dailyLimit: number;
  percentageUsed: number;
  isNearLimit: boolean;
  canSendMessages: boolean;
}> {
  const dailyCount = await getDailyMessageCount(supabase, gymId);
  const percentageUsed = (dailyCount / MAX_MESSAGES_PER_DAY) * 100;
  const isNearLimit = percentageUsed >= 80;
  const canSendMessages = dailyCount < MAX_MESSAGES_PER_DAY;

  return {
    dailyCount,
    dailyLimit: MAX_MESSAGES_PER_DAY,
    percentageUsed,
    isNearLimit,
    canSendMessages
  };
}

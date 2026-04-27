/**
 * Concurrency Limiter
 * 
 * Prevents one gym from hogging all resources.
 * Limits concurrent Claude API calls per gym to 10.
 */

import { createClient } from "@supabase/supabase-js";

const DEFAULT_MAX_SLOTS = 10;

/**
 * Check if a gym has available processing slots
 */
export async function hasAvailableSlot(
  supabase: ReturnType<typeof createClient>,
  gymId: string
): Promise<{ available: boolean; activeSlots: number; maxSlots: number }> {
  try {
    const { data, error } = await supabase
      .from("gym_processing_slots")
      .select("active_slots, max_slots")
      .eq("gym_id", gymId)
      .single();

    if (error && error.code !== "PGRST116") {
      console.error("Slot check error:", error);
      return { available: false, activeSlots: 0, maxSlots: DEFAULT_MAX_SLOTS };
    }

    if (!data) {
      // Initialize slots for this gym
      await initializeSlots(supabase, gymId);
      return { available: true, activeSlots: 0, maxSlots: DEFAULT_MAX_SLOTS };
    }

    const slots = data as { active_slots: number; max_slots: number };
    const available = slots.active_slots < slots.max_slots;
    return {
      available,
      activeSlots: slots.active_slots,
      maxSlots: slots.max_slots
    };
  } catch (error) {
    console.error("Slot check error:", error);
    return { available: false, activeSlots: 0, maxSlots: DEFAULT_MAX_SLOTS };
  }
}

/**
 * Acquire a processing slot for a gym
 * Returns true if slot was acquired, false if limit reached
 */
export async function acquireSlot(
  supabase: ReturnType<typeof createClient>,
  gymId: string
): Promise<{ acquired: boolean; activeSlots: number }> {
  try {
    // Check availability first
    const { available, activeSlots } = await hasAvailableSlot(supabase, gymId);

    if (!available) {
      return { acquired: false, activeSlots };
    }

    // Increment active slots
    const { error } = await supabase
      .from("gym_processing_slots")
      // @ts-ignore - Supabase generated types issue
      .update({
        active_slots: activeSlots + 1,
        updated_at: new Date().toISOString()
      })
      .eq("gym_id", gymId);

    if (error) {
      console.error("Slot acquire error:", error);
      return { acquired: false, activeSlots };
    }

    return { acquired: true, activeSlots: activeSlots + 1 };
  } catch (error) {
    console.error("Slot acquire error:", error);
    return { acquired: false, activeSlots: 0 };
  }
}

/**
 * Release a processing slot for a gym
 */
export async function releaseSlot(
  supabase: ReturnType<typeof createClient>,
  gymId: string
): Promise<{ success: boolean; activeSlots: number }> {
  try {
    const { data, error: fetchError } = await supabase
      .from("gym_processing_slots")
      .select("active_slots")
      .eq("gym_id", gymId)
      .single();

    if (fetchError) {
      console.error("Slot fetch error:", fetchError);
      return { success: false, activeSlots: 0 };
    }

    const newActiveSlots = Math.max(0, (data?.active_slots || 1) - 1);

    const { error } = await supabase
      .from("gym_processing_slots")
      // @ts-ignore - Supabase generated types issue
      .update({
        active_slots: newActiveSlots,
        updated_at: new Date().toISOString()
      })
      .eq("gym_id", gymId);

    if (error) {
      console.error("Slot release error:", error);
      return { success: false, activeSlots: newActiveSlots };
    }

    return { success: true, activeSlots: newActiveSlots };
  } catch (error) {
    console.error("Slot release error:", error);
    return { success: false, activeSlots: 0 };
  }
}

/**
 * Initialize slots for a gym
 */
async function initializeSlots(
  supabase: ReturnType<typeof createClient>,
  gymId: string
): Promise<void> {
  try {
    await supabase
      .from("gym_processing_slots")
      // @ts-ignore - Supabase generated types issue
      .insert({
        gym_id: gymId,
        active_slots: 0,
        max_slots: DEFAULT_MAX_SLOTS
      });
  } catch (error) {
    console.error("Slot initialization error:", error);
  }
}

/**
 * Get slot status for a gym
 */
export async function getSlotStatus(
  supabase: ReturnType<typeof createClient>,
  gymId: string
): Promise<{
  activeSlots: number;
  maxSlots: number;
  availableSlots: number;
  utilizationPercent: number;
}> {
  try {
    const { data, error } = await supabase
      .from("gym_processing_slots")
      .select("active_slots, max_slots")
      .eq("gym_id", gymId)
      .single();

    if (error && error.code !== "PGRST116") {
      console.error("Status error:", error);
      return {
        activeSlots: 0,
        maxSlots: DEFAULT_MAX_SLOTS,
        availableSlots: DEFAULT_MAX_SLOTS,
        utilizationPercent: 0
      };
    }

    if (!data) {
      return {
        activeSlots: 0,
        maxSlots: DEFAULT_MAX_SLOTS,
        availableSlots: DEFAULT_MAX_SLOTS,
        utilizationPercent: 0
      };
    }

    const slots = data as { active_slots: number; max_slots: number };
    const availableSlots = Math.max(0, slots.max_slots - slots.active_slots);
    const utilizationPercent = (slots.active_slots / slots.max_slots) * 100;

    return {
      activeSlots: slots.active_slots,
      maxSlots: slots.max_slots,
      availableSlots,
      utilizationPercent
    };
  } catch (error) {
    console.error("Status error:", error);
    return {
      activeSlots: 0,
      maxSlots: DEFAULT_MAX_SLOTS,
      availableSlots: DEFAULT_MAX_SLOTS,
      utilizationPercent: 0
    };
  }
}

/**
 * Example n8n worker usage:
 * 
 * 1. Get message from queue
 * 2. Try to acquire slot:
 *    const { acquired } = await acquireSlot(supabase, gymId);
 *    if (!acquired) {
 *      // Re-queue message with delay
 *      await markFailed(supabase, messageId, "Concurrency limit reached");
 *      return;
 *    }
 * 
 * 3. Process message (call Claude, send WhatsApp, etc.)
 * 
 * 4. Release slot:
 *    await releaseSlot(supabase, gymId);
 */

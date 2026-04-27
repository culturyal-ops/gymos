/**
 * Concurrency Limiter
 *
 * Prevents one gym from hogging all resources.
 * Limits concurrent Claude API calls per gym to 10.
 */

import { createClient } from "@supabase/supabase-js";
import { db } from "@/lib/supabase/typed-client";

const DEFAULT_MAX_SLOTS = 10;

type SlotRow = { active_slots: number; max_slots: number };

export async function hasAvailableSlot(
  supabase: ReturnType<typeof createClient>,
  gymId: string
): Promise<{ available: boolean; activeSlots: number; maxSlots: number }> {
  try {
    const { data, error } = await db(supabase)
      .from("gym_processing_slots")
      .select("active_slots, max_slots")
      .eq("gym_id", gymId)
      .single();

    if (error && error.code !== "PGRST116") {
      console.error("Slot check error:", error);
      return { available: false, activeSlots: 0, maxSlots: DEFAULT_MAX_SLOTS };
    }

    if (!data) {
      await initializeSlots(supabase, gymId);
      return { available: true, activeSlots: 0, maxSlots: DEFAULT_MAX_SLOTS };
    }

    const slots = data as SlotRow;
    return {
      available: slots.active_slots < slots.max_slots,
      activeSlots: slots.active_slots,
      maxSlots: slots.max_slots,
    };
  } catch (error) {
    console.error("Slot check error:", error);
    return { available: false, activeSlots: 0, maxSlots: DEFAULT_MAX_SLOTS };
  }
}

export async function acquireSlot(
  supabase: ReturnType<typeof createClient>,
  gymId: string
): Promise<{ acquired: boolean; activeSlots: number }> {
  try {
    const { available, activeSlots } = await hasAvailableSlot(supabase, gymId);

    if (!available) return { acquired: false, activeSlots };

    const { error } = await db(supabase)
      .from("gym_processing_slots")
      .update({ active_slots: activeSlots + 1, updated_at: new Date().toISOString() })
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

export async function releaseSlot(
  supabase: ReturnType<typeof createClient>,
  gymId: string
): Promise<{ success: boolean; activeSlots: number }> {
  try {
    const { data: rawData, error: fetchError } = await db(supabase)
      .from("gym_processing_slots")
      .select("active_slots")
      .eq("gym_id", gymId)
      .single();

    if (fetchError) {
      console.error("Slot fetch error:", fetchError);
      return { success: false, activeSlots: 0 };
    }

    const row = rawData as { active_slots: number } | null;
    const newActiveSlots = Math.max(0, (row?.active_slots ?? 1) - 1);

    const { error } = await db(supabase)
      .from("gym_processing_slots")
      .update({ active_slots: newActiveSlots, updated_at: new Date().toISOString() })
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

async function initializeSlots(
  supabase: ReturnType<typeof createClient>,
  gymId: string
): Promise<void> {
  try {
    await db(supabase)
      .from("gym_processing_slots")
      .insert({ gym_id: gymId, active_slots: 0, max_slots: DEFAULT_MAX_SLOTS });
  } catch (error) {
    console.error("Slot initialization error:", error);
  }
}

export async function getSlotStatus(
  supabase: ReturnType<typeof createClient>,
  gymId: string
): Promise<{ activeSlots: number; maxSlots: number; availableSlots: number; utilizationPercent: number }> {
  try {
    const { data: rawData, error } = await db(supabase)
      .from("gym_processing_slots")
      .select("active_slots, max_slots")
      .eq("gym_id", gymId)
      .single();

    if (error && error.code !== "PGRST116") {
      console.error("Status error:", error);
      return { activeSlots: 0, maxSlots: DEFAULT_MAX_SLOTS, availableSlots: DEFAULT_MAX_SLOTS, utilizationPercent: 0 };
    }

    if (!rawData) {
      return { activeSlots: 0, maxSlots: DEFAULT_MAX_SLOTS, availableSlots: DEFAULT_MAX_SLOTS, utilizationPercent: 0 };
    }

    const slots = rawData as SlotRow;
    const availableSlots = Math.max(0, slots.max_slots - slots.active_slots);
    return {
      activeSlots: slots.active_slots,
      maxSlots: slots.max_slots,
      availableSlots,
      utilizationPercent: (slots.active_slots / slots.max_slots) * 100,
    };
  } catch (error) {
    console.error("Status error:", error);
    return { activeSlots: 0, maxSlots: DEFAULT_MAX_SLOTS, availableSlots: DEFAULT_MAX_SLOTS, utilizationPercent: 0 };
  }
}

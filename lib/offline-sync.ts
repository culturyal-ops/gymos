/**
 * Offline Sync Utility
 * 
 * Manages syncing of offline attendance and payment records
 * from the reception tablet to the server.
 */

import { createClient } from "@supabase/supabase-js";

export interface OfflineAttendanceRecord {
  offline_id: string;
  member_id: string;
  gym_id: string;
  logged_at: string;
}

export interface OfflinePaymentRecord {
  offline_id: string;
  member_id: string | null;
  gym_id: string;
  amount: number;
  payment_mode: "cash" | "counter_upi";
  logged_at: string;
}

/**
 * Sync offline attendance records to server
 */
export async function syncOfflineAttendance(
  supabase: ReturnType<typeof createClient>,
  gymId: string,
  records: OfflineAttendanceRecord[]
): Promise<{
  success: boolean;
  synced: number;
  failed: number;
  errors: Array<{ offlineId: string; error: string }>;
}> {
  const errors: Array<{ offlineId: string; error: string }> = [];
  let synced = 0;
  let failed = 0;

  for (const record of records) {
    try {
      const syncedAt = new Date().toISOString();

      // Upsert into the queue using offline_id as the idempotency key.
      // ON CONFLICT (gym_id, offline_id) DO NOTHING means retries are safe.
      const { error: queueError } = await supabase
        .from("offline_attendance_queue")
        .upsert(
          {
            gym_id: gymId,
            member_id: record.member_id,
            offline_id: record.offline_id,
            logged_at: record.logged_at,
            synced: true,
            synced_at: syncedAt,
          },
          { onConflict: "gym_id,offline_id", ignoreDuplicates: true }
        );

      if (queueError) {
        console.error("Queue upsert error:", queueError);
      }

      // Insert attendance log — duplicate check is handled by the unique
      // constraint on (gym_id, offline_id) in the queue table above.
      const { error: logError } = await supabase
        .from("attendance_logs")
        .insert({
          gym_id: gymId,
          member_id: record.member_id,
          logged_at: record.logged_at,
          logged_by: null, // Offline, no staff ID
        });

      if (logError && logError.code !== "23505") {
        // 23505 = unique violation (already inserted) — idempotent, skip
        errors.push({ offlineId: record.offline_id, error: logError.message });
        failed++;
        continue;
      }

      synced++;
    } catch (error) {
      errors.push({
        offlineId: record.offline_id,
        error: error instanceof Error ? error.message : "Unknown error"
      });
      failed++;
    }
  }

  return {
    success: failed === 0,
    synced,
    failed,
    errors
  };
}

/**
 * Sync offline payment records to server
 */
export async function syncOfflinePayments(
  supabase: ReturnType<typeof createClient>,
  gymId: string,
  records: OfflinePaymentRecord[]
): Promise<{
  success: boolean;
  synced: number;
  failed: number;
  errors: Array<{ offlineId: string; error: string }>;
}> {
  const errors: Array<{ offlineId: string; error: string }> = [];
  let synced = 0;
  let failed = 0;

  for (const record of records) {
    try {
      const syncedAt = new Date().toISOString();

      // Upsert into the queue using offline_id as the idempotency key.
      const { error: queueError } = await supabase
        .from("offline_payment_queue")
        .upsert(
          {
            gym_id: gymId,
            member_id: record.member_id,
            offline_id: record.offline_id,
            amount: record.amount,
            payment_mode: record.payment_mode,
            logged_at: record.logged_at,
            synced: true,
            synced_at: syncedAt,
          },
          { onConflict: "gym_id,offline_id", ignoreDuplicates: true }
        );

      if (queueError) {
        console.error("Queue upsert error:", queueError);
      }

      // Insert transaction — 23505 means already inserted (idempotent)
      const { error: txError } = await supabase
        .from("transactions")
        .insert({
          gym_id: gymId,
          member_id: record.member_id,
          amount: record.amount,
          payment_mode: record.payment_mode,
          auto_logged: true,
        });

      if (txError && txError.code !== "23505") {
        errors.push({ offlineId: record.offline_id, error: txError.message });
        failed++;
        continue;
      }

      synced++;
    } catch (error) {
      errors.push({
        offlineId: record.offline_id,
        error: error instanceof Error ? error.message : "Unknown error"
      });
      failed++;
    }
  }

  return {
    success: failed === 0,
    synced,
    failed,
    errors
  };
}

/**
 * Get unsynced offline records for a gym
 */
export async function getUnsyncedRecords(
  supabase: ReturnType<typeof createClient>,
  gymId: string
): Promise<{
  attendance: OfflineAttendanceRecord[];
  payments: OfflinePaymentRecord[];
}> {
  try {
    const { data: attendance, error: attError } = await supabase
      .from("offline_attendance_queue")
      .select("offline_id, member_id, gym_id, logged_at")
      .eq("gym_id", gymId)
      .eq("synced", false);

    const { data: payments, error: payError } = await supabase
      .from("offline_payment_queue")
      .select("offline_id, member_id, gym_id, amount, payment_mode, logged_at")
      .eq("gym_id", gymId)
      .eq("synced", false);

    if (attError) console.error("Attendance fetch error:", attError);
    if (payError) console.error("Payment fetch error:", payError);

    return {
      attendance: (attendance || []) as OfflineAttendanceRecord[],
      payments: (payments || []) as OfflinePaymentRecord[]
    };
  } catch (error) {
    console.error("Fetch error:", error);
    return { attendance: [], payments: [] };
  }
}

/**
 * Get sync status for a gym
 */
export async function getSyncStatus(
  supabase: ReturnType<typeof createClient>,
  gymId: string
): Promise<{
  pendingAttendance: number;
  pendingPayments: number;
  totalPending: number;
  lastSyncTime: string | null;
}> {
  try {
    const { count: attCount, error: attError } = await supabase
      .from("offline_attendance_queue")
      .select("*", { count: "exact", head: true })
      .eq("gym_id", gymId)
      .eq("synced", false);

    const { count: payCount, error: payError } = await supabase
      .from("offline_payment_queue")
      .select("*", { count: "exact", head: true })
      .eq("gym_id", gymId)
      .eq("synced", false);

    if (attError) console.error("Count error:", attError);
    if (payError) console.error("Count error:", payError);

    const pendingAttendance = attCount || 0;
    const pendingPayments = payCount || 0;

    // Get last sync time
    const { data: lastSync } = await supabase
      .from("offline_attendance_queue")
      .select("synced_at")
      .eq("gym_id", gymId)
      .eq("synced", true)
      .order("synced_at", { ascending: false })
      .limit(1)
      .single();

    return {
      pendingAttendance,
      pendingPayments,
      totalPending: pendingAttendance + pendingPayments,
      lastSyncTime: lastSync?.synced_at || null
    };
  } catch (error) {
    console.error("Status error:", error);
    return {
      pendingAttendance: 0,
      pendingPayments: 0,
      totalPending: 0,
      lastSyncTime: null
    };
  }
}

/**
 * Example client-side usage (in reception PWA):
 * 
 * 1. When online, sync automatically:
 *    if (navigator.onLine) {
 *      const { attendance, payments } = await getUnsyncedRecords(supabase, gymId);
 *      await syncOfflineAttendance(supabase, gymId, attendance);
 *      await syncOfflinePayments(supabase, gymId, payments);
 *    }
 * 
 * 2. Show sync status:
 *    const status = await getSyncStatus(supabase, gymId);
 *    if (status.totalPending > 0) {
 *      showBanner(`${status.totalPending} records waiting to sync`);
 *    }
 */

/**
 * lib/secrets.ts
 * Gym secret management (fallback version without vault).
 */

import { getAdminSupabase } from "@/lib/supabase/admin";

export type GymSecretKey =
  | "razorpay_key_id"
  | "razorpay_secret"
  | "waba_token";

/**
 * Store a gym secret (encrypted in gym_secrets table)
 */
export async function vaultGymSecret(
  gymId: string,
  key: GymSecretKey,
  value: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = getAdminSupabase();

  // Use the fallback upsert function
  const { data: secretId, error: rpcError } = await supabase.rpc(
    "upsert_gym_secret",
    { p_gym_id: gymId, p_secret_key: key, p_value: value }
  );

  if (rpcError) {
    return { success: false, error: rpcError.message };
  }

  // Update the reference UUID in gyms table (for future vault migration)
  const SECRET_ID_COLUMN: Record<GymSecretKey, string> = {
    razorpay_key_id: "razorpay_key_id_secret_id",
    razorpay_secret: "razorpay_secret_secret_id",
    waba_token: "waba_token_secret_id",
  };

  const column = SECRET_ID_COLUMN[key];
  const { error: updateError } = await supabase
    .from("gyms")
    .update({
      [column]: secretId,
      // Null out the legacy plain-text column
      [key]: null,
    })
    .eq("id", gymId);

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  return { success: true };
}

/**
 * Retrieve a decrypted gym secret (service-role only)
 */
export async function getGymSecret(
  gymId: string,
  key: GymSecretKey
): Promise<string | null> {
  const supabase = getAdminSupabase();

  const { data, error } = await supabase.rpc("get_gym_secret", {
    p_gym_id: gymId,
    p_secret_key: key,
  });

  if (error) {
    console.error(`[secrets] Failed to decrypt ${key} for gym ${gymId}:`, error.message);
    return null;
  }

  return data as string | null;
}

/**
 * Returns a masked display string for the owner dashboard
 */
export function maskSecret(value: string | null): string {
  if (!value || value.length < 8) return "••••••••";
  const tail = value.slice(-4);
  const prefix = value.slice(0, Math.min(8, value.indexOf("_") + 1) || 4);
  return `${prefix}••••••••${tail}`;
}

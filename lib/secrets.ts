/**
 * lib/secrets.ts
 * Gym secret management via Supabase Vault.
 *
 * - Write: vault the value, store only the secret UUID in gyms table.
 * - Read:  decrypt via service-role RPC — never exposed to client bundles.
 * - Display: always return a masked placeholder to the owner dashboard.
 */

import { getAdminSupabase } from "@/lib/supabase/admin";

export type GymSecretKey =
  | "razorpay_key_id"
  | "razorpay_secret"
  | "waba_token";

const SECRET_ID_COLUMN: Record<GymSecretKey, string> = {
  razorpay_key_id: "razorpay_key_id_secret_id",
  razorpay_secret: "razorpay_secret_secret_id",
  waba_token: "waba_token_secret_id",
};

/**
 * Vault a gym secret and store the reference UUID in the gyms table.
 * Call this whenever an owner saves a new API key.
 */
export async function vaultGymSecret(
  gymId: string,
  key: GymSecretKey,
  value: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = getAdminSupabase();

  // Upsert into Vault via the security-definer RPC
  const { data: secretId, error: rpcError } = await supabase.rpc(
    "vault_upsert_gym_secret",
    { p_gym_id: gymId, p_secret_key: key, p_value: value }
  );

  if (rpcError) {
    return { success: false, error: rpcError.message };
  }

  // Store the reference UUID; null out the plain-text column
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
 * Retrieve a decrypted gym secret (service-role only).
 * Never call this from a client component or expose the result in an API
 * response that reaches the browser.
 */
export async function getGymSecret(
  gymId: string,
  key: GymSecretKey
): Promise<string | null> {
  const supabase = getAdminSupabase();

  const { data, error } = await supabase.rpc("vault_get_gym_secret", {
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
 * Returns a masked display string for the owner dashboard.
 * e.g. "rzp_live_••••••••kJ9d"
 */
export function maskSecret(value: string | null): string {
  if (!value || value.length < 8) return "••••••••";
  const tail = value.slice(-4);
  const prefix = value.slice(0, Math.min(8, value.indexOf("_") + 1) || 4);
  return `${prefix}••••••••${tail}`;
}

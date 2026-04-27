/**
 * POST /api/internal/gym-secret
 *
 * Returns a decrypted gym secret to n8n workflows.
 * Protected by INTERNAL_API_SECRET header — never expose to the browser.
 *
 * Body: { gym_id: string, secret_name: "razorpay_key_id" | "razorpay_secret" | "waba_token" }
 * Response: { value: string }
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { safeJson, errorResponse } from "@/lib/api";
import { getGymSecret, type GymSecretKey } from "@/lib/secrets";

const schema = z.object({
  gym_id: z.string().uuid(),
  secret_name: z.enum(["razorpay_key_id", "razorpay_secret", "waba_token"]),
});

export async function POST(request: Request) {
  // Verify internal secret — this endpoint must never be publicly accessible
  const authHeader = request.headers.get("x-internal-secret");
  if (authHeader !== process.env.INTERNAL_API_SECRET) {
    return errorResponse("Forbidden", 403);
  }

  const parsed = schema.safeParse(await safeJson(request));
  if (!parsed.success) return errorResponse(parsed.error.message, 400);

  const value = await getGymSecret(
    parsed.data.gym_id,
    parsed.data.secret_name as GymSecretKey
  );

  if (value === null) {
    return errorResponse("Secret not found", 404);
  }

  return NextResponse.json({ value });
}

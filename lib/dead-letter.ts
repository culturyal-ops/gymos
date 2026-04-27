/**
 * lib/dead-letter.ts
 * Moves a failed inbound message to the dead_letter_queue after max retries,
 * then fires a super-admin alert via webhook.
 */

import { getAdminSupabase } from "@/lib/supabase/admin";
import { logError } from "@/lib/logger";
import { db } from "@/lib/supabase/typed-client";

export async function moveToDeadLetter(
  messageId: string,
  gymId: string,
  messageJson: Record<string, unknown>,
  errorText: string,
  retryCount: number
): Promise<void> {
  const supabase = getAdminSupabase();

  // Insert into DLQ
  const { error: dlqError } = await db(supabase)
    .from("dead_letter_queue")
    .insert({
      gym_id: gymId,
      message_json: messageJson,
      error: errorText,
      retry_count: retryCount,
    });

  if (dlqError) {
    await logError(dlqError, { gymId, context: "dead_letter_insert" });
  }

  // Mark original message as permanently failed
  await db(supabase)
    .from("inbound_message_queue")
    .update({ status: "failed", error_log: errorText })
    .eq("id", messageId);

  // Alert super-admin via webhook (Slack / WhatsApp)
  const webhookUrl = process.env.SUPER_ADMIN_ALERT_WEBHOOK;
  if (webhookUrl) {
    try {
      await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: `🚨 *GymOS Dead Letter* — gym \`${gymId}\`\nMessage failed after ${retryCount} retries.\nError: ${errorText}`,
        }),
      });
    } catch (e) {
      await logError(e, { gymId, context: "dead_letter_alert" });
    }
  }
}

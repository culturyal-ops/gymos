/**
 * POST /api/billing/webhook
 *
 * Razorpay webhook handler for GymOS subscription events.
 * Verify the signature, then handle:
 *   - subscription.charged   → create invoice, activate gym
 *   - subscription.failed    → send WhatsApp reminder to owner
 *   - subscription.cancelled → mark subscription cancelled
 *
 * Set this URL in Razorpay Dashboard → Webhooks:
 *   https://gymos.in/api/billing/webhook
 * Secret: RAZORPAY_WEBHOOK_SECRET env var
 */

import { NextResponse } from "next/server";
import { createHmac } from "node:crypto";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { logError } from "@/lib/logger";

const WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET!;

// GymOS plan prices (paise → rupees mapping for invoice)
const PLAN_PRICES_INR: Record<string, number> = {
  starter: 2999,
  growth:  5999,
  scale:   9999,
};

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-razorpay-signature") ?? "";

  // Verify webhook signature
  const expected = createHmac("sha256", WEBHOOK_SECRET)
    .update(rawBody)
    .digest("hex");

  if (expected !== signature) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  let event: { event: string; payload: Record<string, unknown> };
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const supabase = getAdminSupabase();

  try {
    switch (event.event) {
      case "subscription.charged": {
        const sub = (event.payload as { subscription?: { entity?: Record<string, unknown> } })
          .subscription?.entity as Record<string, unknown> | undefined;
        const payment = (event.payload as { payment?: { entity?: Record<string, unknown> } })
          .payment?.entity as Record<string, unknown> | undefined;

        if (!sub || !payment) break;

        const rzpSubId = sub.id as string;
        const { data: subscription } = await supabase
          .from("subscriptions")
          .select("id, gym_id, plan_id")
          .eq("razorpay_subscription_id", rzpSubId)
          .single();

        if (!subscription) break;

        // Activate gym
        await supabase
          .from("gyms")
          .update({ is_active: true })
          .eq("id", subscription.gym_id);

        // Update subscription period
        await supabase
          .from("subscriptions")
          .update({
            status: "active",
            current_period_start: new Date((sub.current_start as number) * 1000).toISOString(),
            current_period_end:   new Date((sub.current_end   as number) * 1000).toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", subscription.id);

        // Generate invoice number: INV-YYYYMM-GYMID8
        const now = new Date();
        const invoiceNumber = `INV-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}-${subscription.gym_id.slice(0, 8).toUpperCase()}`;

        const baseAmount = PLAN_PRICES_INR[subscription.plan_id] ?? (payment.amount as number) / 100;
        const gstPercent = 18;

        await supabase.from("invoices").insert({
          gym_id:             subscription.gym_id,
          subscription_id:    subscription.id,
          amount:             baseAmount,
          gst_percent:        gstPercent,
          invoice_number:     invoiceNumber,
          razorpay_payment_id: payment.id as string,
          status:             "paid",
        });

        break;
      }

      case "subscription.failed": {
        const sub = (event.payload as { subscription?: { entity?: Record<string, unknown> } })
          .subscription?.entity as Record<string, unknown> | undefined;
        if (!sub) break;

        const { data: subscription } = await supabase
          .from("subscriptions")
          .select("id, gym_id")
          .eq("razorpay_subscription_id", sub.id as string)
          .single();

        if (!subscription) break;

        await supabase
          .from("subscriptions")
          .update({ status: "halted", updated_at: new Date().toISOString() })
          .eq("id", subscription.id);

        // Send WhatsApp reminder to gym owner via webhook
        const alertWebhook = process.env.SUPER_ADMIN_ALERT_WEBHOOK;
        if (alertWebhook) {
          await fetch(alertWebhook, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              text: `⚠️ *GymOS Payment Failed* — gym \`${subscription.gym_id}\`\nSubscription \`${sub.id}\` payment failed. Owner needs to update payment method.`,
            }),
          });
        }

        break;
      }

      case "subscription.cancelled": {
        const sub = (event.payload as { subscription?: { entity?: Record<string, unknown> } })
          .subscription?.entity as Record<string, unknown> | undefined;
        if (!sub) break;

        await supabase
          .from("subscriptions")
          .update({ status: "cancelled", updated_at: new Date().toISOString() })
          .eq("razorpay_subscription_id", sub.id as string);

        break;
      }

      default:
        // Unhandled event — acknowledge and ignore
        break;
    }
  } catch (e) {
    await logError(e, { context: `billing_webhook:${event.event}` });
    // Return 200 so Razorpay doesn't retry — we've logged it
  }

  return NextResponse.json({ received: true });
}

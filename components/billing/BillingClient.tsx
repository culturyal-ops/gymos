"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { StatusPill } from "@/components/ui/StatusPill";

const PLANS = [
  { id: "starter", label: "Starter", price: 2999, features: ["Up to 200 members", "WhatsApp AI", "Basic reports"] },
  { id: "growth",  label: "Growth",  price: 5999, features: ["Up to 500 members", "AI + n8n automations", "Advanced analytics"] },
  { id: "scale",   label: "Scale",   price: 9999, features: ["Unlimited members", "Priority support", "Custom AI persona"] },
];

interface Subscription {
  id: string;
  plan_id: string;
  razorpay_subscription_id: string | null;
  status: string;
  current_period_end: string | null;
}

interface Invoice {
  id: string;
  invoice_number: string;
  amount: number;
  gst_percent: number;
  status: string;
  created_at: string;
  pdf_url: string | null;
}

interface Props {
  gym: { id: string; name: string; is_active: boolean };
  subscription: Subscription | null;
  invoices: Invoice[];
}

export default function BillingClient({ gym, subscription, invoices }: Props) {
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubscribe(planId: string) {
    setError(null);
    startTransition(async () => {
      // Map plan slug to Razorpay Plan ID (set these in your Razorpay dashboard)
      const RAZORPAY_PLAN_IDS: Record<string, string> = {
        starter: process.env.NEXT_PUBLIC_RZP_PLAN_STARTER ?? "",
        growth:  process.env.NEXT_PUBLIC_RZP_PLAN_GROWTH  ?? "",
        scale:   process.env.NEXT_PUBLIC_RZP_PLAN_SCALE   ?? "",
      };

      const res = await fetch("/api/billing/create-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gym_id: gym.id, plan_item_id: RAZORPAY_PLAN_IDS[planId] }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to create subscription");
        return;
      }

      // Redirect to Razorpay hosted checkout
      if (data.short_url) {
        window.location.href = data.short_url;
      }
    });
  }

  const statusColor: Record<string, "green" | "red" | "yellow"> = {
    active:    "green",
    halted:    "red",
    cancelled: "red",
    created:   "yellow",
    pending:   "yellow",
  };

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold">Billing</h1>
        <p className="mt-1 text-sm text-[--color-text-secondary]">
          Manage your GymOS subscription and invoices
        </p>
      </div>

      {/* Current subscription */}
      {subscription ? (
        <section className="card p-6">
          <h2 className="mb-4 text-sm font-medium uppercase tracking-widest text-[--color-text-muted]">
            Current Plan
          </h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-lg font-semibold capitalize">{subscription.plan_id}</p>
              {subscription.current_period_end && (
                <p className="text-xs text-[--color-text-secondary]">
                  Renews {new Date(subscription.current_period_end).toLocaleDateString("en-IN")}
                </p>
              )}
            </div>
            <StatusPill status={(statusColor[subscription.status] ?? "yellow") as "green" | "red" | "yellow"} label={subscription.status} />
          </div>
          {subscription.status === "halted" && (
            <p className="mt-3 rounded-[--radius-sm] bg-[--color-red-dim] px-3 py-2 text-xs text-[--color-red]">
              Payment failed. Please update your payment method via Razorpay.
            </p>
          )}
        </section>
      ) : (
        /* Plan picker */
        <section className="card p-6">
          <h2 className="mb-4 text-sm font-medium uppercase tracking-widest text-[--color-text-muted]">
            Choose a Plan
          </h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {PLANS.map((plan) => (
              <button
                key={plan.id}
                type="button"
                onClick={() => setSelectedPlan(plan.id)}
                className={`rounded-[--radius-md] border p-4 text-left transition-colors ${
                  selectedPlan === plan.id
                    ? "border-[--color-gold] bg-[--color-gold-dim]"
                    : "border-[--color-border] bg-[--color-surface-2] hover:border-[--color-gold-dim]"
                }`}
              >
                <p className="font-semibold">{plan.label}</p>
                <p className="mt-1 text-xl font-bold text-[--color-gold]">
                  ₹{plan.price.toLocaleString("en-IN")}
                  <span className="text-xs font-normal text-[--color-text-muted]">/mo</span>
                </p>
                <ul className="mt-3 space-y-1">
                  {plan.features.map((f) => (
                    <li key={f} className="text-xs text-[--color-text-secondary]">• {f}</li>
                  ))}
                </ul>
              </button>
            ))}
          </div>

          {error && (
            <p className="mt-3 rounded-[--radius-sm] bg-[--color-red-dim] px-3 py-2 text-xs text-[--color-red]">
              {error}
            </p>
          )}

          <div className="mt-4 flex justify-end">
            <Button
              variant="primary"
              disabled={!selectedPlan || isPending}
              onClick={() => selectedPlan && handleSubscribe(selectedPlan)}
            >
              {isPending ? "Redirecting…" : "Subscribe"}
            </Button>
          </div>
        </section>
      )}

      {/* Invoices */}
      <section className="card p-6">
        <h2 className="mb-4 text-sm font-medium uppercase tracking-widest text-[--color-text-muted]">
          Invoices
        </h2>
        {invoices.length === 0 ? (
          <p className="text-sm text-[--color-text-secondary]">No invoices yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-[--color-text-muted]">
                <th className="pb-2 pr-4">Invoice #</th>
                <th className="pb-2 pr-4">Amount</th>
                <th className="pb-2 pr-4">GST</th>
                <th className="pb-2 pr-4">Date</th>
                <th className="pb-2">PDF</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[--color-border]">
              {invoices.map((inv) => {
                const gstAmount = (inv.amount * inv.gst_percent) / 100;
                const total = inv.amount + gstAmount;
                return (
                  <tr key={inv.id}>
                    <td className="py-2 pr-4 font-mono text-xs">{inv.invoice_number}</td>
                    <td className="py-2 pr-4">₹{total.toLocaleString("en-IN")}</td>
                    <td className="py-2 pr-4 text-xs text-[--color-text-muted]">{inv.gst_percent}%</td>
                    <td className="py-2 pr-4 text-xs text-[--color-text-muted]">
                      {new Date(inv.created_at).toLocaleDateString("en-IN")}
                    </td>
                    <td className="py-2">
                      {inv.pdf_url ? (
                        <a
                          href={inv.pdf_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-[--color-gold] underline"
                        >
                          Download
                        </a>
                      ) : (
                        <span className="text-xs text-[--color-text-muted]">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}

"use client";

import { useState, useTransition } from "react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils/cn";
import { saveSettings } from "@/lib/actions";

export default function SettingsPage() {
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [autoReminders, setAutoReminders] = useState(true);
  const [supplementEnabled, setSupplementEnabled] = useState(false);
  const [reminderDays, setReminderDays] = useState(7);
  const [pricing, setPricing] = useState(
    JSON.stringify({ gold_6m: 8000, silver_3m: 4500, bronze_1m: 1500 }, null, 2)
  );
  const [aiInstructions, setAiInstructions] = useState(
    "You are the assistant for this gym. Be professional yet warm. Keep replies under 150 words."
  );

  function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaved(false);
    setSaveError(null);
    const formData = new FormData(e.currentTarget);
    formData.set("autoReminders", String(autoReminders));
    formData.set("reminderDays", String(reminderDays));
    formData.set("supplementEnabled", String(supplementEnabled));
    formData.set("pricing", pricing);
    formData.set("aiInstructions", aiInstructions);

    startTransition(async () => {
      const result = await saveSettings(formData);
      if (result.success) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      } else {
        setSaveError(result.error ?? "Failed to save settings.");
      }
    });
  }

  return (
    <div className="max-w-3xl">
      <h1 className="font-display text-2xl font-bold">Settings</h1>
      <p className="mt-1 text-sm text-[--color-text-secondary]">
        Gym profile, pricing, AI personality &amp; integrations
      </p>

      <form onSubmit={handleSave}>
        <section className="card mt-6 p-6">
          <h2 className="mb-4 text-sm font-medium uppercase tracking-[0.12em] text-[--color-text-muted]">
            Gym Information
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <Input name="gymName" label="Gym Name" defaultValue="Culturyal Fitness" />
            <Input name="city" label="City" defaultValue="Pala" />
            <Input name="phone" label="Phone" defaultValue="+91 9900000100" type="tel" />
            <Input name="wabaPhone" label="WhatsApp Business Phone" defaultValue="+91 9900000100" type="tel" />
          </div>
        </section>

        <section className="card mt-4 p-6">
          <h2 className="mb-4 text-sm font-medium uppercase tracking-[0.12em] text-[--color-text-muted]">
            Pricing Configuration
          </h2>
          <div className="space-y-1.5">
            <label className="block text-xs font-medium uppercase tracking-[0.12em] text-[--color-text-secondary]">
              Plan Pricing (JSON)
            </label>
            <textarea
              value={pricing}
              onChange={(e) => setPricing(e.target.value)}
              className="min-h-[120px] w-full resize-none rounded-[--radius-md] border border-[--color-border] bg-[--color-surface-2] px-3 py-2.5 font-mono text-sm text-[--color-text-primary] transition-colors focus:border-[--color-gold] focus:outline-none focus:ring-1 focus:ring-[--color-gold-dim]"
            />
            <p className="text-[10px] text-[--color-text-muted]">Keys are plan identifiers, values are amounts in ₹</p>
          </div>
        </section>

        <section className="card mt-4 p-6">
          <h2 className="mb-4 text-sm font-medium uppercase tracking-[0.12em] text-[--color-text-muted]">
            Batch Timings
          </h2>
          <Input
            name="batchTimings"
            label="Schedule"
            defaultValue="Morning 5AM-9AM, Evening 5PM-10PM"
          />
        </section>

        <section className="card mt-4 p-6">
          <h2 className="mb-4 text-sm font-medium uppercase tracking-[0.12em] text-[--color-text-muted]">
            AI Personality
          </h2>
          <div className="space-y-1.5">
            <label className="block text-xs font-medium uppercase tracking-[0.12em] text-[--color-text-secondary]">
              AI Instructions
            </label>
            <textarea
              value={aiInstructions}
              onChange={(e) => setAiInstructions(e.target.value)}
              className="min-h-[120px] w-full resize-none rounded-[--radius-md] border border-[--color-border] bg-[--color-surface-2] px-3 py-2.5 text-sm text-[--color-text-primary] transition-colors focus:border-[--color-gold] focus:outline-none focus:ring-1 focus:ring-[--color-gold-dim]"
            />
            <p className="text-[10px] text-[--color-text-muted]">
              System prompt injected into every WhatsApp AI reply for your gym
            </p>
          </div>
        </section>

        <section className="card mt-4 p-6">
          <h2 className="mb-4 text-sm font-medium uppercase tracking-[0.12em] text-[--color-text-muted]">
            Automation
          </h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm">Auto Reminders</p>
                <p className="text-xs text-[--color-text-secondary]">Send expiry reminders via WhatsApp automatically</p>
              </div>
              <button
                type="button"
                onClick={() => setAutoReminders(!autoReminders)}
                className={cn(
                  "relative h-6 w-11 rounded-full transition-colors",
                  autoReminders ? "bg-[--color-gold]" : "bg-[--color-surface-3]"
                )}
              >
                <span
                  className={cn(
                    "absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform",
                    autoReminders ? "left-[22px]" : "left-0.5"
                  )}
                />
              </button>
            </div>

            {autoReminders && (
              <div>
                <label className="block text-xs text-[--color-text-secondary]">
                  Reminder Days Before Expiry: <strong className="text-[--color-gold]">{reminderDays}</strong>
                </label>
                <input
                  type="range"
                  min={3}
                  max={14}
                  value={reminderDays}
                  onChange={(e) => setReminderDays(Number(e.target.value))}
                  className="mt-1 w-full accent-[--color-gold]"
                />
                <div className="flex justify-between text-[10px] text-[--color-text-muted]">
                  <span>3 days</span>
                  <span>14 days</span>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm">Supplements</p>
                <p className="text-xs text-[--color-text-secondary]">Enable supplement discount at streak milestones</p>
              </div>
              <button
                type="button"
                onClick={() => setSupplementEnabled(!supplementEnabled)}
                className={cn(
                  "relative h-6 w-11 rounded-full transition-colors",
                  supplementEnabled ? "bg-[--color-gold]" : "bg-[--color-surface-3]"
                )}
              >
                <span
                  className={cn(
                    "absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform",
                    supplementEnabled ? "left-[22px]" : "left-0.5"
                  )}
                />
              </button>
            </div>
          </div>
        </section>

        <section className="card mt-4 p-6">
          <h2 className="mb-4 text-sm font-medium uppercase tracking-[0.12em] text-[--color-text-muted]">
            Integrations
          </h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-[--radius-md] border border-[--color-border] bg-[--color-surface-2] p-4">
              <div>
                <p className="text-sm font-medium">Razorpay</p>
                <p className="text-xs text-[--color-text-secondary]">rzp_live_••••••••kJ9d</p>
              </div>
              <span className="flex items-center gap-1.5 text-xs text-[--color-green]">
                <span className="h-2 w-2 rounded-full bg-[--color-green]" /> Connected
              </span>
            </div>
            <div className="flex items-center justify-between rounded-[--radius-md] border border-[--color-border] bg-[--color-surface-2] p-4">
              <div>
                <p className="text-sm font-medium">AiSensy (WhatsApp)</p>
                <p className="text-xs text-[--color-text-secondary]">Token: ais_••••••••rT7m</p>
              </div>
              <span className="flex items-center gap-1.5 text-xs text-[--color-green]">
                <span className="h-2 w-2 rounded-full bg-[--color-green]" /> Connected
              </span>
            </div>
          </div>
        </section>

        {saveError && (
          <p className="mt-4 rounded-[--radius-sm] bg-[--color-red-dim] px-3 py-2 text-xs text-[--color-red]">
            {saveError}
          </p>
        )}

        <div className="mt-6 flex items-center justify-end gap-3">
          {saved && (
            <span className="text-sm text-[--color-green]">Settings saved ✓</span>
          )}
          <Button variant="ghost" type="button">Reset</Button>
          <Button variant="primary" type="submit" disabled={isPending}>
            {isPending ? "Saving…" : "Save Settings"}
          </Button>
        </div>
      </form>
    </div>
  );
}

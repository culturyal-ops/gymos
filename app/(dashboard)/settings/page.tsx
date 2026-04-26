"use client";

import { useState } from "react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils/cn";

export default function SettingsPage() {
  const [autoReminders, setAutoReminders] = useState(true);
  const [supplementEnabled, setSupplementEnabled] = useState(false);
  const [reminderDays, setReminderDays] = useState(7);

  const [pricing, setPricing] = useState(
    JSON.stringify({ gold_6m: 8000, silver_3m: 4500, bronze_1m: 1500 }, null, 2)
  );

  const [aiInstructions, setAiInstructions] = useState(
    `You are the assistant for Culturyal Fitness gym in Pala. Be professional yet warm. Always sign off as "Culturyal Fitness Team". Keep replies under 150 words. If asked about anything outside gym services, politely redirect.`
  );

  return (
    <div className="max-w-3xl">
      <h1 className="font-display text-2xl font-bold">Settings</h1>
      <p className="mt-1 text-sm text-[--color-text-secondary]">
        Gym profile, pricing, AI personality & integrations
      </p>

      {/* Section: Gym Info */}
      <section className="card mt-6 p-6">
        <h2 className="mb-4 text-sm font-medium uppercase tracking-[0.12em] text-[--color-text-muted]">
          Gym Information
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <Input label="Gym Name" defaultValue="Culturyal Fitness" />
          <Input label="City" defaultValue="Pala" />
          <Input label="Phone" defaultValue="+91 9900000100" type="tel" />
          <Input label="WhatsApp Business Phone" defaultValue="+91 9900000100" type="tel" />
        </div>
      </section>

      {/* Section: Pricing Config */}
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
          <p className="text-[10px] text-[--color-text-muted]">
            Keys are plan identifiers, values are amounts in ₹
          </p>
        </div>
      </section>

      {/* Section: Batch Timings */}
      <section className="card mt-4 p-6">
        <h2 className="mb-4 text-sm font-medium uppercase tracking-[0.12em] text-[--color-text-muted]">
          Batch Timings
        </h2>
        <Input
          label="Schedule"
          defaultValue="Morning 5AM-9AM, Evening 5PM-10PM"
          placeholder="Morning 5AM-9AM, Evening 5PM-10PM"
        />
        <div className="mt-3 flex gap-4">
          <label className="flex items-center gap-2 text-sm text-[--color-text-secondary]">
            <input type="checkbox" defaultChecked className="accent-[--color-gold]" />
            Ladies Batch
          </label>
          <label className="flex items-center gap-2 text-sm text-[--color-text-secondary]">
            <input type="checkbox" className="accent-[--color-gold]" />
            Personal Training
          </label>
        </div>
      </section>

      {/* Section: AI Personality */}
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
            This is the system prompt injected into every WhatsApp AI reply for your gym
          </p>
        </div>
      </section>

      {/* Section: Automation Toggles */}
      <section className="card mt-4 p-6">
        <h2 className="mb-4 text-sm font-medium uppercase tracking-[0.12em] text-[--color-text-muted]">
          Automation
        </h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm">Auto Reminders</p>
              <p className="text-xs text-[--color-text-secondary]">
                Send expiry reminders via WhatsApp automatically
              </p>
            </div>
            <button
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
              <p className="text-xs text-[--color-text-secondary]">
                Enable supplement discount at streak milestones
              </p>
            </div>
            <button
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

      {/* Section: Integrations */}
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

      {/* Save */}
      <div className="mt-6 flex justify-end gap-3">
        <Button variant="ghost">Reset</Button>
        <Button variant="primary">Save Settings</Button>
      </div>
    </div>
  );
}

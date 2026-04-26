"use client";

import { useState, FormEvent } from "react";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";

interface WhatsAppBlastModalProps {
  open: boolean;
  onClose: () => void;
}

const segmentOptions = [
  { value: "all_active", label: "All Active Members" },
  { value: "expiring", label: "Expiring This Week" },
  { value: "churned", label: "Churned Members" },
  { value: "gold", label: "Gold Plan Members" },
  { value: "silver", label: "Silver Plan Members" },
  { value: "bronze", label: "Bronze Plan Members" },
];

const templateOptions = [
  { value: "renewal_nudge", label: "Renewal Nudge (7-day expiry)" },
  { value: "festive_offer", label: "Festive Season Offer" },
  { value: "new_batch", label: "New Batch Announcement" },
  { value: "supplement_promo", label: "Supplement Promo" },
  { value: "custom", label: "Custom Message" },
];

const templatePreviews: Record<string, string> = {
  renewal_nudge:
    "Hi {name}, your {plan} plan at {gym_name} expires in {days} days! Renew now and keep your streak alive. 💪 Click to pay: {link}",
  festive_offer:
    "🎉 Happy Diwali, {name}! Celebrate with 20% off on Gold plans at {gym_name}. Limited time only. Pay here: {link}",
  new_batch:
    "Hi {name}, exciting news! We've launched a new morning batch at 5 AM. Slots are limited. See you at {gym_name}! 🏋️",
  supplement_promo:
    "{name}, fuel your gains! Get 15% off MuscleBlaze Whey this week exclusively for {gym_name} members. Order via: {link}",
  custom: "",
};

export function WhatsAppBlastModal({ open, onClose }: WhatsAppBlastModalProps) {
  const [loading, setLoading] = useState(false);
  const [segment, setSegment] = useState("all_active");
  const [template, setTemplate] = useState("renewal_nudge");

  // Simulated recipient counts
  const recipientCounts: Record<string, number> = {
    all_active: 247,
    expiring: 18,
    churned: 34,
    gold: 89,
    silver: 102,
    bronze: 56,
  };

  const count = recipientCounts[segment] ?? 0;
  const estimatedCost = (count * 0.6).toFixed(0); // ~₹0.60 per message

  async function handleSend(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    // TODO: Wire to campaign queue
    await new Promise((r) => setTimeout(r, 800));
    setLoading(false);
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="WhatsApp Campaign">
      <form onSubmit={handleSend} className="space-y-4">
        <Select
          label="Segment"
          options={segmentOptions}
          value={segment}
          onChange={(e) => setSegment(e.target.value)}
        />
        <Select
          label="Template"
          options={templateOptions}
          value={template}
          onChange={(e) => setTemplate(e.target.value)}
        />

        {/* Preview */}
        <div className="space-y-1.5">
          <label className="block text-xs font-medium uppercase tracking-[0.12em] text-[--color-text-secondary]">
            Preview
          </label>
          <div className="rounded-[--radius-md] border border-[--color-border] bg-[--color-surface-2] p-3">
            {template === "custom" ? (
              <textarea
                className="min-h-[80px] w-full resize-none bg-transparent text-sm text-[--color-text-primary] placeholder:text-[--color-text-muted] focus:outline-none"
                placeholder="Type your custom message here…"
              />
            ) : (
              <p className="text-sm leading-relaxed text-[--color-text-secondary]">
                {templatePreviews[template]}
              </p>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center justify-between rounded-[--radius-md] border border-[--color-border] bg-[--color-surface-2] p-3">
          <div>
            <p className="text-xs text-[--color-text-secondary]">Recipients</p>
            <p className="font-display text-lg font-bold text-[--color-gold]">{count}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-[--color-text-secondary]">Estimated Cost</p>
            <p className="font-display text-lg font-bold">₹{estimatedCost}</p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <Button variant="ghost" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" disabled={loading}>
            {loading ? "Sending…" : `Send to ${count} Members`}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

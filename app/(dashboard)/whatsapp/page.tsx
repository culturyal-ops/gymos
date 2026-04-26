"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { WhatsAppBlastModal } from "@/components/modals/WhatsAppBlastModal";
import { cn } from "@/lib/utils/cn";

type FeedFilter = "all" | "renewal_reminder" | "payment_receipt" | "lead_followup" | "streak_milestone";

const feedEvents = [
  {
    id: "e1",
    type: "renewal_reminder" as const,
    member: "Riya Thomas",
    preview: "Hi Riya, your Bronze plan expires in 5 days! Renew now: pay.gymos.in/riya",
    status: "sent" as const,
    timestamp: new Date(Date.now() - 2 * 60000).toISOString(),
  },
  {
    id: "e2",
    type: "payment_receipt" as const,
    member: "Arun Mathew",
    preview: "Payment of ₹8,000 received for Gold plan. Thank you, Arun!",
    status: "sent" as const,
    timestamp: new Date(Date.now() - 11 * 60000).toISOString(),
  },
  {
    id: "e3",
    type: "lead_followup" as const,
    member: "Kiran",
    preview: "Hi Kiran! Following up on your inquiry about monthly packages…",
    status: "failed" as const,
    timestamp: new Date(Date.now() - 48 * 60000).toISOString(),
  },
  {
    id: "e4",
    type: "streak_milestone" as const,
    member: "Meera Nair",
    preview: "🎉 You've hit 30 days straight, Meera! Top 10% at Culturyal Fitness.",
    status: "sent" as const,
    timestamp: new Date(Date.now() - 2 * 3600000).toISOString(),
  },
  {
    id: "e5",
    type: "renewal_reminder" as const,
    member: "Sneha George",
    preview: "Hi Sneha, we miss you! Your Silver plan expired 15 days ago. Come back with 10% off.",
    status: "sent" as const,
    timestamp: new Date(Date.now() - 5 * 3600000).toISOString(),
  },
  {
    id: "e6",
    type: "lead_followup" as const,
    member: "Vivek",
    preview: "Hey Vivek! Just checking in about personal training sessions…",
    status: "sent" as const,
    timestamp: new Date(Date.now() - 12 * 3600000).toISOString(),
  },
  {
    id: "e7",
    type: "payment_receipt" as const,
    member: "Meera Nair",
    preview: "Payment of ₹4,500 received for Silver plan renewal.",
    status: "sent" as const,
    timestamp: new Date(Date.now() - 24 * 3600000).toISOString(),
  },
];

const typeLabels: Record<string, string> = {
  renewal_reminder: "Renewal Reminder",
  payment_receipt: "Payment Receipt",
  lead_followup: "Lead Follow-up",
  streak_milestone: "Streak Milestone",
};

const typeBadgeStyles: Record<string, string> = {
  renewal_reminder: "bg-[--color-amber-dim] text-[--color-amber]",
  payment_receipt: "bg-[--color-green-dim] text-[--color-green]",
  lead_followup: "bg-[--color-blue-dim] text-[--color-blue]",
  streak_milestone: "bg-[--color-gold-dim] text-[--color-gold]",
};

function timeAgo(dateStr: string): string {
  const ms = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function WhatsAppPage() {
  const [blastOpen, setBlastOpen] = useState(false);
  const [filter, setFilter] = useState<FeedFilter>("all");

  const filtered =
    filter === "all" ? feedEvents : feedEvents.filter((e) => e.type === filter);

  const filterOptions: { key: FeedFilter; label: string }[] = [
    { key: "all", label: "All" },
    { key: "renewal_reminder", label: "Reminders" },
    { key: "payment_receipt", label: "Receipts" },
    { key: "lead_followup", label: "Follow-ups" },
    { key: "streak_milestone", label: "Milestones" },
  ];

  const sentCount = feedEvents.filter((e) => e.status === "sent").length;
  const failedCount = feedEvents.filter((e) => e.status === "failed").length;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">WhatsApp Hub</h1>
          <p className="mt-1 text-sm text-[--color-text-secondary]">
            Campaign sender & automation feed
          </p>
        </div>
        <Button variant="primary" onClick={() => setBlastOpen(true)}>
          + New Campaign
        </Button>
      </div>

      {/* Stats bar */}
      <div className="mb-6 grid grid-cols-3 gap-4">
        <div className="card flex items-center justify-between p-4">
          <div>
            <p className="text-xs uppercase tracking-[0.12em] text-[--color-text-muted]">Total Sent</p>
            <p className="mt-1 font-display text-xl font-bold text-[--color-green]">{sentCount}</p>
          </div>
          <span className="text-2xl opacity-30">✓</span>
        </div>
        <div className="card flex items-center justify-between p-4">
          <div>
            <p className="text-xs uppercase tracking-[0.12em] text-[--color-text-muted]">Failed</p>
            <p className="mt-1 font-display text-xl font-bold text-[--color-red]">{failedCount}</p>
          </div>
          <span className="text-2xl opacity-30">✕</span>
        </div>
        <div className="card flex items-center justify-between p-4">
          <div>
            <p className="text-xs uppercase tracking-[0.12em] text-[--color-text-muted]">Delivery Rate</p>
            <p className="mt-1 font-display text-xl font-bold text-[--color-gold]">
              {Math.round((sentCount / feedEvents.length) * 100)}%
            </p>
          </div>
          <span className="text-2xl opacity-30">◎</span>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-4 flex gap-2 text-xs">
        {filterOptions.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={cn(
              "rounded-full px-3 py-1.5 transition-colors",
              filter === f.key
                ? "bg-[--color-gold-dim] text-[--color-gold]"
                : "border border-[--color-border] text-[--color-text-secondary] hover:border-[--color-border-hover]"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Feed */}
      <div className="space-y-2">
        {filtered.map((event) => (
          <div
            key={event.id}
            className={cn(
              "card flex items-start gap-4 p-4 transition-colors hover:bg-[--color-surface-2]",
              event.status === "failed" && "border-[--color-red]/30"
            )}
          >
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[10px] font-medium uppercase",
                    typeBadgeStyles[event.type]
                  )}
                >
                  {typeLabels[event.type]}
                </span>
                <span className="text-xs text-[--color-text-muted]">{timeAgo(event.timestamp)}</span>
              </div>
              <p className="mt-1.5 text-sm text-[--color-text-primary]">
                <span className="font-medium">{event.member}</span>
              </p>
              <p className="mt-1 text-xs text-[--color-text-secondary] line-clamp-2">
                {event.preview}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {event.status === "sent" ? (
                <span className="rounded-full bg-[--color-green-dim] px-2 py-1 text-[10px] font-medium text-[--color-green]">
                  Sent
                </span>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-[--color-red-dim] px-2 py-1 text-[10px] font-medium text-[--color-red]">
                    Failed
                  </span>
                  <button className="rounded bg-[--color-surface-3] px-2 py-1 text-[10px] text-[--color-text-secondary] transition-colors hover:bg-[--color-gold-dim] hover:text-[--color-gold]">
                    Retry
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <WhatsAppBlastModal open={blastOpen} onClose={() => setBlastOpen(false)} />
    </div>
  );
}

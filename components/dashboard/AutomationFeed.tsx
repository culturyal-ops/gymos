import { cn } from "@/lib/utils/cn";

interface AutomationEvent {
  id: string;
  type: string;
  status: string;
  created_at: string | null;
  payload: Record<string, unknown> | null;
}

interface AutomationFeedProps {
  events: AutomationEvent[];
}

const typeLabels: Record<string, string> = {
  renewal_reminder: "Renewal Reminder",
  payment_receipt: "Payment Receipt",
  lead_followup: "Lead Follow-up",
  streak_milestone: "Streak Milestone",
  daily_summary: "Daily Summary",
  supplement_upsell: "Supplement Upsell",
};

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return "";
  const ms = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function AutomationFeed({ events }: AutomationFeedProps) {
  return (
    <section className="card p-5">
      <h3 className="mb-3 text-sm uppercase tracking-[0.14em] text-[--color-text-muted]">
        Automation Feed
      </h3>
      {events.length === 0 ? (
        <div className="py-6 text-center text-xs text-[--color-text-muted]">
          No automation events yet. They'll appear here as WhatsApp messages are sent.
        </div>
      ) : (
        <ul className="space-y-3">
          {events.map((event) => (
            <li
              key={event.id}
              className="rounded-md border border-[--color-border] bg-[--color-surface-2] p-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase text-[--color-text-muted]">
                  {typeLabels[event.type] ?? event.type}
                </span>
                <span
                  className={cn(
                    "text-xs",
                    event.status === "sent" ? "text-[--color-green]" : "text-[--color-red]"
                  )}
                >
                  {event.status}
                </span>
              </div>
              {event.payload && typeof event.payload.member_name === "string" && (
                <p className="mt-1 text-sm">{event.payload.member_name}</p>
              )}
              <p className="mt-1 text-xs text-[--color-text-secondary]">
                {timeAgo(event.created_at)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

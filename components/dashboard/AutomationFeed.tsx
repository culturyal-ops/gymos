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
  renewal_reminder: "Renewal",
  payment_receipt: "Payment",
  lead_followup: "Follow-up",
  streak_milestone: "Milestone",
  daily_summary: "Summary",
  supplement_upsell: "Upsell",
};

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return "";
  const ms = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

export function AutomationFeed({ events }: AutomationFeedProps) {
  return (
    <section className="card p-4 sm:p-5">
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-[--color-text-muted]">
        Automation Feed
      </h3>
      {events.length === 0 ? (
        <div className="py-6 text-center text-xs text-[--color-text-muted]">
          No events yet
        </div>
      ) : (
        <ul className="space-y-2">
          {events.slice(0, 5).map((event) => (
            <li
              key={event.id}
              className="rounded-[--radius-md] border border-[--color-border] bg-[--color-surface-2] p-2.5"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-semibold uppercase text-[--color-text-muted]">
                  {typeLabels[event.type] ?? event.type}
                </span>
                <span
                  className={cn(
                    "text-[10px] font-medium",
                    event.status === "sent" ? "text-[--color-green]" : "text-[--color-red]"
                  )}
                >
                  {event.status === "sent" ? "✓" : "✕"}
                </span>
              </div>
              {event.payload && typeof event.payload.member_name === "string" && (
                <p className="mt-1 text-xs text-[--color-text-primary]">{event.payload.member_name}</p>
              )}
              <p className="mt-0.5 text-[10px] text-[--color-text-muted]">
                {timeAgo(event.created_at)} ago
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

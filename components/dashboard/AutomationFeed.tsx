const events = [
  { type: "renewal_reminder", text: "Reminder sent to Arun Mathew", at: "2 min ago", status: "sent" },
  { type: "payment_receipt", text: "Receipt sent for ₹4,500", at: "11 min ago", status: "sent" },
  { type: "lead_followup", text: "Follow-up sent to Kiran", at: "48 min ago", status: "failed" }
];

export function AutomationFeed() {
  return (
    <section className="card p-5">
      <h3 className="mb-3 text-sm uppercase tracking-[0.14em] text-[--color-text-muted]">Automation Feed</h3>
      <ul className="space-y-3">
        {events.map((event) => (
          <li key={`${event.type}-${event.at}`} className="rounded-md border border-[--color-border] bg-[--color-surface-2] p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase text-[--color-text-muted]">{event.type}</span>
              <span className={event.status === "sent" ? "text-xs text-[--color-green]" : "text-xs text-[--color-red]"}>
                {event.status}
              </span>
            </div>
            <p className="mt-1 text-sm">{event.text}</p>
            <p className="mt-1 text-xs text-[--color-text-secondary]">{event.at}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

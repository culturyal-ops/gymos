"use client";

interface QuickActionsProps {
  onLogPayment: () => void;
  onWhatsAppBlast: () => void;
  onAddMember: () => void;
  onAddLead: () => void;
}

const actions = [
  { key: "payment", title: "Log Payment", subtitle: "Cash / UPI", icon: "💳" },
  { key: "whatsapp", title: "WhatsApp Blast", subtitle: "Campaign", icon: "💬" },
  { key: "member", title: "Add Member", subtitle: "New profile", icon: "➕" },
  { key: "lead", title: "Add Lead", subtitle: "Walk-in", icon: "🎯" },
];

export function QuickActions({
  onLogPayment,
  onWhatsAppBlast,
  onAddMember,
  onAddLead,
}: QuickActionsProps) {
  const handlers: Record<string, () => void> = {
    payment: onLogPayment,
    whatsapp: onWhatsAppBlast,
    member: onAddMember,
    lead: onAddLead,
  };

  return (
    <section className="card p-4 sm:p-5">
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-[--color-text-muted]">
        Quick Actions
      </h3>
      <div className="grid grid-cols-2 gap-2">
        {actions.map((item) => (
          <button
            key={item.key}
            onClick={handlers[item.key]}
            className="rounded-[--radius-md] border border-[--color-border] bg-[--color-surface-2] p-3 text-left transition-all hover:border-[--color-border-hover] hover:bg-[--color-surface-3] active:scale-[0.98]"
          >
            <p className="text-lg">{item.icon}</p>
            <p className="mt-1.5 text-xs font-semibold text-[--color-text-primary]">{item.title}</p>
            <p className="text-[10px] text-[--color-text-muted]">{item.subtitle}</p>
          </button>
        ))}
      </div>
    </section>
  );
}

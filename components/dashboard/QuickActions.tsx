"use client";

interface QuickActionsProps {
  onLogPayment: () => void;
  onWhatsAppBlast: () => void;
  onAddMember: () => void;
  onAddLead: () => void;
}

const actions = [
  { key: "payment", title: "Log Payment", subtitle: "Cash / UPI / Razorpay", glyph: "◈" },
  { key: "whatsapp", title: "WhatsApp Blast", subtitle: "Run campaign", glyph: "◎" },
  { key: "member", title: "Add Member", subtitle: "Create new profile", glyph: "◉" },
  { key: "lead", title: "Add Lead", subtitle: "Capture walk-in", glyph: "▣" },
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
    <section className="card p-5">
      <h3 className="mb-3 text-sm uppercase tracking-[0.14em] text-[--color-text-muted]">
        Quick Actions
      </h3>
      <div className="grid grid-cols-2 gap-3">
        {actions.map((item) => (
          <button
            key={item.key}
            onClick={handlers[item.key]}
            className="rounded-md border border-[--color-border] bg-[--color-surface-2] p-3 text-left transition-all hover:border-[--color-border-hover] hover:bg-[--color-surface-3]"
          >
            <p className="text-sm text-[--color-gold]">{item.glyph}</p>
            <p className="mt-1 text-sm font-medium">{item.title}</p>
            <p className="text-xs text-[--color-text-secondary]">{item.subtitle}</p>
          </button>
        ))}
      </div>
    </section>
  );
}

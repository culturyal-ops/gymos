import type { Lead } from "@/lib/types";

interface LeadsMiniProps {
  leads: Lead[];
}

export function LeadsMini({ leads }: LeadsMiniProps) {
  const latestLeads = leads.slice(0, 3);

  return (
    <section className="card p-4 sm:p-5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-[--color-text-muted]">
          Leads Snapshot
        </h3>
        <span className="text-[10px] font-medium text-[--color-text-muted]">{leads.length} total</span>
      </div>
      <div className="space-y-2">
        {latestLeads.length > 0 ? (
          latestLeads.map((lead) => (
            <div key={lead.id} className="rounded-[--radius-md] border border-[--color-border] bg-[--color-surface-2] p-2.5">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-medium text-[--color-text-primary]">{lead.name}</p>
                <span className="text-[9px] font-semibold uppercase tracking-wider text-[--color-gold]">
                  {lead.stage?.replace("_", " ")}
                </span>
              </div>
              <p className="mt-0.5 text-[10px] capitalize text-[--color-text-muted]">{lead.source}</p>
            </div>
          ))
        ) : (
          <p className="py-4 text-center text-xs text-[--color-text-muted]">No leads yet.</p>
        )}
      </div>
    </section>
  );
}

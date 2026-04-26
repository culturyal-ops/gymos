import type { Lead } from "@/lib/types";

interface LeadsMiniProps {
  leads: Lead[];
}

export function LeadsMini({ leads }: LeadsMiniProps) {
  // Show only top 3 latest leads
  const latestLeads = leads.slice(0, 3);

  return (
    <section className="card p-5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm uppercase tracking-[0.14em] text-[--color-text-muted]">Leads Snapshot</h3>
        <span className="text-[10px] text-[--color-text-muted]">{leads.length} total</span>
      </div>
      <div className="space-y-2">
        {latestLeads.length > 0 ? (
          latestLeads.map((lead) => (
            <div key={lead.id} className="rounded-md border border-[--color-border] bg-[--color-surface-2] p-3">
              <div className="flex items-center justify-between">
                <p className="font-medium">{lead.name}</p>
                <span className="text-[10px] uppercase tracking-wider text-[--color-gold]">
                  {lead.stage?.replace("_", " ")}
                </span>
              </div>
              <p className="text-xs text-[--color-text-secondary] capitalize">{lead.source}</p>
            </div>
          ))
        ) : (
          <p className="py-4 text-center text-xs text-[--color-text-muted]">No leads captured yet.</p>
        )}
      </div>
    </section>
  );
}

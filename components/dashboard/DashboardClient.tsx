"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Topbar } from "@/components/layout/Topbar";
import { MetricCard } from "@/components/ui/MetricCard";
import { MemberTable } from "@/components/dashboard/MemberTable";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { AutomationFeed } from "@/components/dashboard/AutomationFeed";
import { RevenueChart } from "@/components/dashboard/RevenueChart";
import { CashReconciliation } from "@/components/dashboard/CashReconciliation";
import { LeadsMini } from "@/components/dashboard/LeadsMini";
import { AddMemberModal } from "@/components/modals/AddMemberModal";
import { LogPaymentModal } from "@/components/modals/LogPaymentModal";
import { WhatsAppBlastModal } from "@/components/modals/WhatsAppBlastModal";
import { AddLeadModal } from "@/components/modals/AddLeadModal";
import type { Member, Lead, Transaction } from "@/lib/types";
import { formatCurrency } from "@/lib/utils/format";

type ModalKey = "addMember" | "logPayment" | "whatsappBlast" | "addLead" | null;

interface AutomationEvent {
  id: string;
  type: string;
  status: string;
  created_at: string | null;
  payload: Record<string, unknown> | null;
}

interface DashboardClientProps {
  members: Member[];
  leads: Lead[];
  transactions: Transaction[];
  metrics: {
    mrr: number;
    active: number;
    expiring: number;
    churned: number;
  };
  automationEvents: AutomationEvent[];
}

export function DashboardClient({
  members,
  leads,
  transactions,
  metrics,
  automationEvents,
}: DashboardClientProps) {
  const [activeModal, setActiveModal] = useState<ModalKey>(null);
  const router = useRouter();

  function handleSuccess() {
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <Topbar onAddMember={() => setActiveModal("addMember")} />

      {/* Metrics grid */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Monthly Revenue"
          value={formatCurrency(metrics.mrr)}
          subtext={`${transactions.length} transactions`}
          accentColor="gold"
          index={0}
        />
        <MetricCard
          label="Active Members"
          value={metrics.active.toString()}
          subtext={`${members.length} total`}
          accentColor="green"
          index={1}
        />
        <MetricCard
          label="Expiring Soon"
          value={metrics.expiring.toString()}
          subtext="Next 7 days"
          badge={metrics.expiring > 0 ? "Urgent" : undefined}
          badgeType={metrics.expiring > 0 ? "down" : undefined}
          accentColor="red"
          index={2}
        />
        <MetricCard
          label="Churned"
          value={metrics.churned.toString()}
          subtext="Need re-engagement"
          accentColor="blue"
          index={3}
        />
      </section>

      {/* Main content grid */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <MemberTable members={members} />
        </div>
        <div className="space-y-6">
          <QuickActions
            onLogPayment={() => setActiveModal("logPayment")}
            onWhatsAppBlast={() => setActiveModal("whatsappBlast")}
            onAddMember={() => setActiveModal("addMember")}
            onAddLead={() => setActiveModal("addLead")}
          />
          <AutomationFeed events={automationEvents} />
        </div>
      </section>

      {/* Charts grid */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <RevenueChart transactions={transactions} />
        </div>
        <div className="space-y-6">
          <CashReconciliation transactions={transactions} />
          <LeadsMini leads={leads} />
        </div>
      </section>

      {/* Modals */}
      <AddMemberModal
        open={activeModal === "addMember"}
        onClose={() => setActiveModal(null)}
        onSuccess={handleSuccess}
      />
      <LogPaymentModal
        open={activeModal === "logPayment"}
        onClose={() => setActiveModal(null)}
        members={members}
        onSuccess={handleSuccess}
      />
      <WhatsAppBlastModal
        open={activeModal === "whatsappBlast"}
        onClose={() => setActiveModal(null)}
      />
      <AddLeadModal
        open={activeModal === "addLead"}
        onClose={() => setActiveModal(null)}
        onSuccess={handleSuccess}
      />
    </div>
  );
}

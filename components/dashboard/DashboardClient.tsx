"use client";

import { useState } from "react";
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
  isDemo: boolean;
}

export function DashboardClient({ members, leads, transactions, metrics, isDemo }: DashboardClientProps) {
  const [activeModal, setActiveModal] = useState<ModalKey>(null);

  return (
    <div>
      {isDemo && (
        <div className="mb-4 rounded-md bg-[--color-gold-dim] p-2 text-center text-xs text-[--color-gold]">
          System is running in Demo Mode. Connect Supabase to see real data.
        </div>
      )}
      
      <Topbar onAddMember={() => setActiveModal("addMember")} />

      <section className="grid grid-cols-4 gap-4">
        <MetricCard
          label="Monthly Revenue"
          value={formatCurrency(metrics.mrr).replace("₹", "₹")}
          subtext="Projected ₹3.2L by month end"
          badge="↑ 18% vs last month"
          badgeType="up"
          accentColor="gold"
          index={0}
        />
        <MetricCard
          label="Active Members"
          value={metrics.active.toString()}
          subtext="12 joined this week"
          badge="↑ 9%"
          badgeType="up"
          accentColor="green"
          index={1}
        />
        <MetricCard
          label="Expiring Soon"
          value={metrics.expiring.toString()}
          subtext="Next 7 days · Auto-remind ON"
          badge="Urgent"
          badgeType="down"
          accentColor="red"
          index={2}
        />
        <MetricCard
          label="Today's Check-ins"
          value="71"
          subtext="Peak batch: 6AM"
          badge="+11 vs yesterday"
          accentColor="blue"
          index={3}
        />
      </section>

      <section className="mt-4 grid grid-cols-[1fr_380px] gap-4">
        <MemberTable members={members} />
        <div className="space-y-4">
          <QuickActions
            onLogPayment={() => setActiveModal("logPayment")}
            onWhatsAppBlast={() => setActiveModal("whatsappBlast")}
            onAddMember={() => setActiveModal("addMember")}
            onAddLead={() => setActiveModal("addLead")}
          />
          <AutomationFeed />
        </div>
      </section>

      <section className="mt-4 grid grid-cols-[1fr_380px] gap-4">
        <RevenueChart transactions={transactions} />
        <div className="space-y-4">
          <CashReconciliation transactions={transactions} />
          <LeadsMini leads={leads} />
        </div>
      </section>

      {/* Modals */}
      <AddMemberModal
        open={activeModal === "addMember"}
        onClose={() => setActiveModal(null)}
      />
      <LogPaymentModal
        open={activeModal === "logPayment"}
        onClose={() => setActiveModal(null)}
      />
      <WhatsAppBlastModal
        open={activeModal === "whatsappBlast"}
        onClose={() => setActiveModal(null)}
      />
      <AddLeadModal
        open={activeModal === "addLead"}
        onClose={() => setActiveModal(null)}
      />
    </div>
  );
}

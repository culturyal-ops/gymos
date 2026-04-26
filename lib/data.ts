import { getServerSupabase } from "@/lib/supabase/server";
import { demoLeads, demoMembers, demoTransactions } from "@/lib/demo-data";
import { hasPublicSupabaseEnv } from "@/lib/env";
import { TEST_GYM_ID } from "@/lib/gym-context";
import type { Lead, Member, Transaction } from "@/lib/types";

function buildMetrics(members: Member[], transactions: Transaction[]) {
  const mrr = transactions.reduce((sum, t) => sum + Number(t.amount ?? 0), 0);
  const active = members.filter((m) => m.status === "active").length;
  const expiring = members.filter((m) => m.status === "expiring").length;
  const churned = members.filter((m) => m.status === "churned").length;

  return { mrr, active, expiring, churned };
}

export async function getDashboardData() {
  if (!hasPublicSupabaseEnv()) {
    return {
      members: demoMembers,
      leads: demoLeads,
      transactions: demoTransactions,
      metrics: buildMetrics(demoMembers, demoTransactions),
      isDemo: true
    };
  }

  const supabase = await getServerSupabase();
  try {
    const [membersRes, leadsRes, txRes] = await Promise.all([
      supabase.from("members").select("*").eq("gym_id", TEST_GYM_ID).order("created_at", { ascending: false }),
      supabase.from("leads").select("*").eq("gym_id", TEST_GYM_ID).order("created_at", { ascending: false }),
      supabase.from("transactions").select("*").eq("gym_id", TEST_GYM_ID).order("created_at", { ascending: false })
    ]);

    if (membersRes.error) throw membersRes.error;
    if (leadsRes.error) throw leadsRes.error;
    if (txRes.error) throw txRes.error;

    const members = (membersRes.data ?? []) as Member[];
    const leads = (leadsRes.data ?? []) as Lead[];
    const transactions = (txRes.data ?? []) as Transaction[];

    return { members, leads, transactions, metrics: buildMetrics(members, transactions), isDemo: false };
  } catch {
    return {
      members: demoMembers,
      leads: demoLeads,
      transactions: demoTransactions,
      metrics: buildMetrics(demoMembers, demoTransactions),
      isDemo: true
    };
  }
}

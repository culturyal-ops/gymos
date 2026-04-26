import { getServerSupabase } from "@/lib/supabase/server";
import type { Lead, Member, Transaction } from "@/lib/types";

function buildMetrics(members: Member[], transactions: Transaction[]) {
  const mrr = transactions.reduce((sum, t) => sum + Number(t.amount ?? 0), 0);
  const active = members.filter((m) => m.status === "active").length;
  const expiring = members.filter((m) => m.status === "expiring").length;
  const churned = members.filter((m) => m.status === "churned").length;
  return { mrr, active, expiring, churned };
}

async function getGymId(supabase: Awaited<ReturnType<typeof getServerSupabase>>, userId: string): Promise<string | null> {
  // Check if owner
  const { data: gymData } = await supabase
    .from("gyms")
    .select("id")
    .eq("owner_id", userId)
    .single();
  if (gymData) return gymData.id;

  // Check if staff
  const { data: staffData } = await supabase
    .from("gym_staff")
    .select("gym_id")
    .eq("user_id", userId)
    .single();
  if (staffData) return staffData.gym_id;

  return null;
}

export async function getDashboardData() {
  const supabase = await getServerSupabase();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return {
      members: [] as Member[],
      leads: [] as Lead[],
      transactions: [] as Transaction[],
      metrics: { mrr: 0, active: 0, expiring: 0, churned: 0 },
      gymId: null,
    };
  }

  const gymId = await getGymId(supabase, user.id);

  if (!gymId) {
    return {
      members: [] as Member[],
      leads: [] as Lead[],
      transactions: [] as Transaction[],
      metrics: { mrr: 0, active: 0, expiring: 0, churned: 0 },
      gymId: null,
    };
  }

  const [membersRes, leadsRes, txRes] = await Promise.all([
    supabase.from("members").select("*").eq("gym_id", gymId).order("created_at", { ascending: false }),
    supabase.from("leads").select("*").eq("gym_id", gymId).order("created_at", { ascending: false }),
    supabase.from("transactions").select("*").eq("gym_id", gymId).order("created_at", { ascending: false }),
  ]);

  const members = (membersRes.data ?? []) as Member[];
  const leads = (leadsRes.data ?? []) as Lead[];
  const transactions = (txRes.data ?? []) as Transaction[];

  return {
    members,
    leads,
    transactions,
    metrics: buildMetrics(members, transactions),
    gymId,
  };
}

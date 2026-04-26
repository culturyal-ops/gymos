import { getDashboardData } from "@/lib/data";
import { DashboardClient } from "@/components/dashboard/DashboardClient";
import { getServerSupabase } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();

  // Fetch notifications_queue for the gym
  let automationEvents: {
    id: string;
    type: string;
    status: string;
    created_at: string | null;
    payload: Record<string, unknown> | null;
  }[] = [];

  if (user) {
    const { data: gymData } = await supabase
      .from("gyms")
      .select("id")
      .eq("owner_id", user.id)
      .single();

    if (gymData) {
      const { data: queueData } = await supabase
        .from("notifications_queue")
        .select("id, type, status, created_at, payload")
        .eq("gym_id", gymData.id)
        .order("created_at", { ascending: false })
        .limit(10);

      automationEvents = (queueData ?? []) as typeof automationEvents;
    }
  }

  const data = await getDashboardData();

  return (
    <DashboardClient
      members={data.members}
      leads={data.leads}
      transactions={data.transactions}
      metrics={data.metrics}
      automationEvents={automationEvents}
    />
  );
}

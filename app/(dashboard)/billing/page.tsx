import { getAdminSupabase } from "@/lib/supabase/admin";
import { getServerSupabase } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import BillingClient from "@/components/billing/BillingClient";

export default async function BillingPage() {
  const serverClient = await getServerSupabase();
  const { data: { user } } = await serverClient.auth.getUser();
  if (!user) redirect("/login");

  const supabase = getAdminSupabase();

  const { data: gym } = await supabase
    .from("gyms")
    .select("id, name, is_active")
    .eq("owner_id", user.id)
    .single();

  if (!gym) redirect("/");

  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("gym_id", gym.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  const { data: invoices } = await supabase
    .from("invoices")
    .select("*")
    .eq("gym_id", gym.id)
    .order("created_at", { ascending: false })
    .limit(12);

  return (
    <BillingClient
      gym={gym}
      subscription={subscription ?? null}
      invoices={invoices ?? []}
    />
  );
}

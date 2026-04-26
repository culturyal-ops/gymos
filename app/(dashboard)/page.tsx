import { getDashboardData } from "@/lib/data";
import { DashboardClient } from "@/components/dashboard/DashboardClient";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const data = await getDashboardData();

  return (
    <DashboardClient 
      members={data.members}
      leads={data.leads}
      transactions={data.transactions}
      metrics={data.metrics}
      isDemo={data.isDemo}
    />
  );
}

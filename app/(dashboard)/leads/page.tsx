import { getDashboardData } from "@/lib/data";
import { LeadsClient } from "@/components/leads/LeadsClient";

export const dynamic = "force-dynamic";

export default async function LeadsPage() {
  const data = await getDashboardData();

  return <LeadsClient initialLeads={data.leads} />;
}

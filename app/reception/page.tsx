import { getDashboardData } from "@/lib/data";
import { ReceptionClient } from "@/components/reception/ReceptionClient";

export const dynamic = "force-dynamic";

export default async function ReceptionPage() {
  const data = await getDashboardData();
  return <ReceptionClient initialMembers={data.members} />;
}

import { getDashboardData } from "@/lib/data";
import { MembersClient } from "@/components/members/MembersClient";

export const dynamic = "force-dynamic";

export default async function MembersPage() {
  const data = await getDashboardData();

  return <MembersClient initialMembers={data.members} />;
}

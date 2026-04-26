import { getDashboardData } from "@/lib/data";
import { TransactionsClient } from "@/components/transactions/TransactionsClient";

export const dynamic = "force-dynamic";

export default async function TransactionsPage() {
  const data = await getDashboardData();

  return (
    <TransactionsClient 
      initialTransactions={data.transactions} 
      members={data.members} 
    />
  );
}

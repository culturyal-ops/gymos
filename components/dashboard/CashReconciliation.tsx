import { formatCurrency } from "@/lib/utils/format";
import type { Transaction } from "@/lib/types";

interface CashReconciliationProps {
  transactions: Transaction[];
}

export function CashReconciliation({ transactions }: CashReconciliationProps) {
  const cashTotal = transactions
    .filter((t) => t.payment_mode === "cash")
    .reduce((sum, t) => sum + (t.amount ?? 0), 0);
  
  const upiTotal = transactions
    .filter((t) => t.payment_mode === "counter_upi")
    .reduce((sum, t) => sum + (t.amount ?? 0), 0);
  
  const razorpayTotal = transactions
    .filter((t) => t.payment_mode?.startsWith("razorpay"))
    .reduce((sum, t) => sum + (t.amount ?? 0), 0);

  const rows = [
    { label: "Cash", detail: "Logged by reception", amount: cashTotal, color: "text-[--color-green]" },
    { label: "Counter UPI", detail: "Logged by reception", amount: upiTotal, color: "text-[--color-blue]" },
    { label: "Razorpay", detail: "Auto-logged webhook", amount: razorpayTotal, color: "text-[--color-gold]" }
  ];

  const total = rows.reduce((sum, row) => sum + row.amount, 0);

  return (
    <section className="card p-5">
      <h3 className="mb-3 text-sm uppercase tracking-[0.14em] text-[--color-text-muted]">Cash Reconciliation</h3>
      <div className="space-y-3">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between border-b border-[--color-border] pb-2 last:border-0 last:pb-0">
            <div>
              <p>{row.label}</p>
              <p className="text-xs text-[--color-text-secondary]">{row.detail}</p>
            </div>
            <p className={row.color}>{formatCurrency(row.amount)}</p>
          </div>
        ))}
      </div>
      <div className="mt-4 flex items-center justify-between border-t border-[--color-border] pt-3">
        <p className="text-sm text-[--color-text-secondary]">Total</p>
        <p className="font-display text-xl text-[--color-gold]">{formatCurrency(total)}</p>
      </div>
    </section>
  );
}

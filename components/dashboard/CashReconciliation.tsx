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
    { label: "Cash", detail: "Logged", amount: cashTotal, color: "text-[--color-green]" },
    { label: "Counter UPI", detail: "Logged", amount: upiTotal, color: "text-[--color-blue]" },
    { label: "Razorpay", detail: "Auto", amount: razorpayTotal, color: "text-[--color-gold]" },
  ];

  const total = rows.reduce((sum, row) => sum + row.amount, 0);

  return (
    <section className="card p-4 sm:p-5">
      <h3 className="mb-3 text-sm font-semibold">Cash Reconciliation</h3>
      <div className="space-y-2.5">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between border-b border-[--color-border] pb-2.5 last:border-0 last:pb-0">
            <div>
              <p className="text-xs font-medium text-[--color-text-primary]">{row.label}</p>
              <p className="text-[10px] text-[--color-text-muted]">{row.detail}</p>
            </div>
            <p className={`text-xs font-semibold ${row.color}`}>{formatCurrency(row.amount)}</p>
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center justify-between border-t border-[--color-border] pt-3">
        <p className="text-xs font-medium text-[--color-text-secondary]">Total</p>
        <p className="font-display text-lg font-bold text-[--color-gold]">{formatCurrency(total)}</p>
      </div>
    </section>
  );
}

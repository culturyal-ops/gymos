"use client";

import { useState, useMemo } from "react";
import { MetricCard } from "@/components/ui/MetricCard";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils/cn";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import type { Transaction, Member, PaymentMode } from "@/lib/types";

type ModeFilter = "all" | PaymentMode;

const modeLabels: Record<string, string> = {
  cash: "Cash",
  counter_upi: "Counter UPI",
  razorpay_link: "Razorpay Link",
  razorpay_subscription: "Razorpay Sub",
};

const modeBadgeStyles: Record<string, string> = {
  cash: "bg-[--color-green-dim] text-[--color-green]",
  counter_upi: "bg-[--color-blue-dim] text-[--color-blue]",
  razorpay_link: "bg-[--color-gold-dim] text-[--color-gold]",
  razorpay_subscription: "bg-[--color-amber-dim] text-[--color-amber]",
};

interface TransactionsClientProps {
  initialTransactions: Transaction[];
  members: Member[];
}

export function TransactionsClient({ initialTransactions, members }: TransactionsClientProps) {
  const [modeFilter, setModeFilter] = useState<ModeFilter>("all");

  function getMemberName(memberId: string | null): string {
    if (!memberId) return "—";
    const m = members.find((x) => x.id === memberId);
    return m?.name ?? "Unknown";
  }

  const filtered = useMemo(() => {
    if (modeFilter === "all") return initialTransactions;
    return initialTransactions.filter((t) => t.payment_mode === modeFilter);
  }, [initialTransactions, modeFilter]);

  const totalToday = initialTransactions.reduce((s, t) => s + (t.amount ?? 0), 0);
  const razorpayTotal = initialTransactions
    .filter((t) => t.payment_mode?.startsWith("razorpay"))
    .reduce((s, t) => s + (t.amount ?? 0), 0);
  const cashTotal = totalToday - razorpayTotal;

  const modeTabs: { key: ModeFilter; label: string }[] = [
    { key: "all", label: "All Modes" },
    { key: "cash", label: "Cash" },
    { key: "counter_upi", label: "Counter UPI" },
    { key: "razorpay_link", label: "Razorpay" },
  ];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Transactions</h1>
          <p className="mt-1 text-sm text-[--color-text-secondary]">
            Financial ledger · {initialTransactions.length} records
          </p>
        </div>
        <Button variant="secondary">Export CSV</Button>
      </div>

      {/* Summary cards */}
      <section className="mb-6 grid grid-cols-3 gap-4">
        <MetricCard
          label="Today's Total"
          value={formatCurrency(totalToday)}
          subtext={`${initialTransactions.length} transactions`}
          accentColor="gold"
          index={0}
        />
        <MetricCard
          label="This Month"
          value={formatCurrency(totalToday * 8)}
          subtext="Projected from daily avg"
          badge="↑ 14%"
          badgeType="up"
          accentColor="green"
          index={1}
        />
        <MetricCard
          label="Razorpay vs Cash"
          value={`${totalToday > 0 ? Math.round((razorpayTotal / totalToday) * 100) : 0}% / ${totalToday > 0 ? Math.round((cashTotal / totalToday) * 100) : 0}%`}
          subtext={`${formatCurrency(razorpayTotal)} · ${formatCurrency(cashTotal)}`}
          accentColor="blue"
          index={2}
        />
      </section>

      {/* Filters */}
      <div className="mb-4 flex gap-2 text-xs">
        {modeTabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setModeFilter(t.key)}
            className={cn(
              "rounded-full px-3 py-1.5 transition-colors",
              modeFilter === t.key
                ? "bg-[--color-gold-dim] text-[--color-gold]"
                : "border border-[--color-border] text-[--color-text-secondary] hover:border-[--color-border-hover]"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <section className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="text-[10px] uppercase tracking-[0.14em] text-[--color-text-muted]">
            <tr className="border-b border-[--color-border]">
              <th className="px-5 py-3 text-left">Date</th>
              <th className="py-3 text-left">Member</th>
              <th className="py-3 text-left">Amount</th>
              <th className="py-3 text-left">Mode</th>
              <th className="py-3 text-left">Plan</th>
              <th className="py-3 text-left">Logged By</th>
              <th className="py-3 text-left">Type</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length > 0 ? (
              filtered.map((txn) => (
                <tr
                  key={txn.id}
                  className="border-b border-[--color-border] text-[--color-text-secondary] transition-colors hover:bg-[--color-surface-2]"
                >
                  <td className="px-5 py-3 text-xs">
                    {txn.created_at ? formatDate(txn.created_at) : "—"}
                  </td>
                  <td className="py-3 text-[--color-text-primary]">
                    {getMemberName(txn.member_id)}
                  </td>
                  <td className="py-3 font-display font-bold text-[--color-gold]">
                    {txn.amount ? formatCurrency(txn.amount) : "—"}
                  </td>
                  <td className="py-3">
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-xs",
                        modeBadgeStyles[txn.payment_mode ?? "cash"]
                      )}
                    >
                      {modeLabels[txn.payment_mode ?? "cash"]}
                    </span>
                  </td>
                  <td className="py-3">
                    <span className="rounded bg-[--color-surface-3] px-2 py-0.5 text-xs uppercase">
                      {txn.plan_purchased?.replace("_", " ") ?? "—"}
                    </span>
                  </td>
                  <td className="py-3 text-xs">{txn.logged_by ?? "System"}</td>
                  <td className="py-3">
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[10px] font-medium",
                        txn.auto_logged
                          ? "bg-[--color-gold-dim] text-[--color-gold]"
                          : "bg-[--color-surface-3] text-[--color-text-secondary]"
                      )}
                    >
                      {txn.auto_logged ? "Auto" : "Manual"}
                    </span>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className="py-12 text-center text-[--color-text-muted]">
                  No transactions found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}

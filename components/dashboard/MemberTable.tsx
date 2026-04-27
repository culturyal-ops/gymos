"use client";

import { useState } from "react";
import { StatusPill } from "@/components/ui/StatusPill";
import { cn } from "@/lib/utils/cn";
import type { Member, MemberStatus } from "@/lib/types";

type TabFilter = "all" | "expiring" | "churned";

interface MemberTableProps {
  members: Member[];
}

function getDaysLeft(expiryDate: string | null): number {
  if (!expiryDate) return 0;
  const now = new Date();
  const expiry = new Date(expiryDate);
  return Math.ceil((expiry.getTime() - now.getTime()) / 86400000);
}

function getDaysColor(days: number): string {
  if (days < 0) return "text-[--color-red]";
  if (days <= 30) return "text-[--color-amber]";
  return "text-[--color-green]";
}

function getDaysLabel(days: number): string {
  if (days < 0) return `${Math.abs(days)}d overdue`;
  if (days === 0) return "Today";
  return `${days}d`;
}

export function MemberTable({ members }: MemberTableProps) {
  const [tab, setTab] = useState<TabFilter>("all");

  const filtered = members.filter((m) => {
    if (tab === "all") return true;
    return m.status === tab;
  });

  const tabs: { key: TabFilter; label: string }[] = [
    { key: "all", label: "All" },
    { key: "expiring", label: "Expiring" },
    { key: "churned", label: "Churned" },
  ];

  return (
    <section className="card p-4 sm:p-5">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-semibold">Members</h2>
        <div className="flex gap-2 text-xs">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                "rounded-full px-3 py-1.5 transition-colors",
                tab === t.key
                  ? "bg-[--color-gold-dim] text-[--color-gold] font-medium"
                  : "border border-[--color-border] text-[--color-text-secondary] hover:border-[--color-border-hover]"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Mobile cards */}
      <div className="space-y-2 sm:hidden">
        {filtered.length > 0 ? (
          filtered.map((member) => {
            const days = getDaysLeft(member.expiry_date);
            return (
              <div
                key={member.id}
                className="rounded-[--radius-md] border border-[--color-border] bg-[--color-surface-2] p-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <p className="font-medium text-[--color-text-primary]">{member.name}</p>
                    <p className="text-xs text-[--color-text-secondary]">{member.phone}</p>
                  </div>
                  <StatusPill status={(member.status as MemberStatus) ?? "paused"} />
                </div>
                <div className="mt-2 flex items-center justify-between text-xs">
                  <span className="uppercase text-[--color-text-muted]">
                    {member.plan_type?.replace("_", " ")}
                  </span>
                  <span className={cn("font-display font-bold", getDaysColor(days))}>
                    {getDaysLabel(days)}
                  </span>
                </div>
              </div>
            );
          })
        ) : (
          <p className="py-6 text-center text-sm text-[--color-text-muted]">No members found.</p>
        )}
      </div>

      {/* Desktop table */}
      <div className="hidden overflow-x-auto sm:block">
        <table className="w-full text-sm">
          <thead className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[--color-text-muted]">
            <tr className="border-b border-[--color-border]">
              <th className="py-3 text-left">Member</th>
              <th className="py-3 text-left">Plan</th>
              <th className="py-3 text-left">Status</th>
              <th className="py-3 text-left">Days Left</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length > 0 ? (
              filtered.map((member) => {
                const days = getDaysLeft(member.expiry_date);
                return (
                  <tr
                    key={member.id}
                    className="border-b border-[--color-border] text-[--color-text-secondary] transition-colors hover:bg-[--color-surface-2]"
                  >
                    <td className="py-3">
                      <p className="text-[--color-text-primary]">{member.name}</p>
                      <p className="text-xs">{member.phone}</p>
                    </td>
                    <td className="py-3 uppercase">{member.plan_type?.replace("_", " ")}</td>
                    <td className="py-3">
                      <StatusPill status={(member.status as MemberStatus) ?? "paused"} />
                    </td>
                    <td className={cn("py-3 font-display font-bold", getDaysColor(days))}>
                      {getDaysLabel(days)}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={4} className="py-8 text-center text-[--color-text-muted]">
                  No members found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

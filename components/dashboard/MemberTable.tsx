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
    <section className="card p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-medium">Members</h2>
        <div className="flex gap-2 text-xs">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                "rounded-full px-3 py-1 transition-colors",
                tab === t.key
                  ? "bg-[--color-gold-dim] text-[--color-gold]"
                  : "border border-[--color-border] text-[--color-text-secondary] hover:border-[--color-border-hover]"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>
      <table className="w-full text-sm">
        <thead className="text-[10px] uppercase tracking-[0.14em] text-[--color-text-muted]">
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
    </section>
  );
}

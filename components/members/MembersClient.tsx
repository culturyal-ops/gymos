"use client";

import { useState, useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import { StatusPill } from "@/components/ui/StatusPill";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { AddMemberModal } from "@/components/modals/AddMemberModal";
import { LogPaymentModal } from "@/components/modals/LogPaymentModal";
import { cn } from "@/lib/utils/cn";
import { formatDate } from "@/lib/utils/format";
import { deleteMember, updateMemberStatus } from "@/lib/actions";
import type { Member, MemberStatus } from "@/lib/types";

type StatusFilter = "all" | "active" | "expiring" | "churned" | "paused";
type PlanFilter = "all" | "gold_6m" | "silver_3m" | "bronze_1m";

interface MembersClientProps {
  initialMembers: Member[];
}

function getDaysLeft(expiryDate: string | null): number {
  if (!expiryDate) return 0;
  return Math.ceil((new Date(expiryDate).getTime() - Date.now()) / 86400000);
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

const planLabels: Record<string, string> = {
  gold_6m: "Gold",
  silver_3m: "Silver",
  bronze_1m: "Bronze",
};

export function MembersClient({ initialMembers }: MembersClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [planFilter, setPlanFilter] = useState<PlanFilter>("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [addOpen, setAddOpen] = useState(false);
  const [paymentMember, setPaymentMember] = useState<Member | null>(null);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return initialMembers.filter((m) => {
      const matchesSearch =
        !search ||
        m.name?.toLowerCase().includes(search.toLowerCase()) ||
        m.phone?.includes(search);
      const matchesStatus = statusFilter === "all" || m.status === statusFilter;
      const matchesPlan = planFilter === "all" || m.plan_type === planFilter;
      return matchesSearch && matchesStatus && matchesPlan;
    });
  }, [initialMembers, search, statusFilter, planFilter]);

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((m) => m.id)));
    }
  }

  function handleAction(action: string, member: Member) {
    setMenuOpen(null);
    if (action === "Log Payment") {
      setPaymentMember(member);
    } else if (action === "Mark Paused") {
      startTransition(async () => {
        await updateMemberStatus(member.id, "paused");
        router.refresh();
      });
    } else if (action === "Delete") {
      if (confirm(`Delete ${member.name}? This cannot be undone.`)) {
        startTransition(async () => {
          await deleteMember(member.id);
          router.refresh();
        });
      }
    }
  }

  const statusTabs: { key: StatusFilter; label: string }[] = [
    { key: "all", label: "All" },
    { key: "active", label: "Active" },
    { key: "expiring", label: "Expiring" },
    { key: "churned", label: "Churned" },
    { key: "paused", label: "Paused" },
  ];

  const planTabs: { key: PlanFilter; label: string }[] = [
    { key: "all", label: "All Plans" },
    { key: "gold_6m", label: "Gold" },
    { key: "silver_3m", label: "Silver" },
    { key: "bronze_1m", label: "Bronze" },
  ];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Members</h1>
          <p className="mt-1 text-sm text-[--color-text-secondary]">
            {initialMembers.length} total members
          </p>
        </div>
        <div className="flex gap-3">
          {selectedIds.size > 0 && (
            <Button variant="secondary">
              Send WhatsApp ({selectedIds.size})
            </Button>
          )}
          <Button variant="primary" onClick={() => setAddOpen(true)}>
            + Add Member
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-4">
        <div className="w-64">
          <Input
            placeholder="Search name or phone…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2 text-xs">
          {statusTabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setStatusFilter(t.key)}
              className={cn(
                "rounded-full px-3 py-1.5 transition-colors",
                statusFilter === t.key
                  ? "bg-[--color-gold-dim] text-[--color-gold]"
                  : "border border-[--color-border] text-[--color-text-secondary] hover:border-[--color-border-hover]"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="flex gap-2 text-xs">
          {planTabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setPlanFilter(t.key)}
              className={cn(
                "rounded-full px-3 py-1.5 transition-colors",
                planFilter === t.key
                  ? "bg-[--color-blue-dim] text-[--color-blue]"
                  : "border border-[--color-border] text-[--color-text-secondary] hover:border-[--color-border-hover]"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <section className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="text-[10px] uppercase tracking-[0.14em] text-[--color-text-muted]">
            <tr className="border-b border-[--color-border]">
              <th className="px-5 py-3 text-left">
                <input
                  type="checkbox"
                  checked={selectedIds.size === filtered.length && filtered.length > 0}
                  onChange={toggleAll}
                  className="accent-[--color-gold]"
                />
              </th>
              <th className="py-3 text-left">Member</th>
              <th className="py-3 text-left">Phone</th>
              <th className="py-3 text-left">Plan</th>
              <th className="py-3 text-left">Status</th>
              <th className="py-3 text-left">Expiry</th>
              <th className="py-3 text-left">Days Left</th>
              <th className="py-3 text-left">Streak</th>
              <th className="py-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length > 0 ? (
              filtered.map((member) => {
                const days = getDaysLeft(member.expiry_date);
                return (
                  <tr
                    key={member.id}
                    className={cn(
                      "border-b border-[--color-border] text-[--color-text-secondary] transition-colors hover:bg-[--color-surface-2]",
                      isPending && "opacity-60"
                    )}
                  >
                    <td className="px-5 py-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(member.id)}
                        onChange={() => toggleSelect(member.id)}
                        className="accent-[--color-gold]"
                      />
                    </td>
                    <td className="py-3 text-[--color-text-primary]">{member.name}</td>
                    <td className="py-3 text-xs">{member.phone}</td>
                    <td className="py-3">
                      <span className="rounded bg-[--color-surface-3] px-2 py-0.5 text-xs uppercase">
                        {planLabels[member.plan_type ?? ""] ?? member.plan_type?.replace("_", " ")}
                      </span>
                    </td>
                    <td className="py-3">
                      <StatusPill status={(member.status as MemberStatus) ?? "paused"} />
                    </td>
                    <td className="py-3 text-xs">
                      {member.expiry_date ? formatDate(member.expiry_date) : "—"}
                    </td>
                    <td className={cn("py-3 font-display font-bold", getDaysColor(days))}>
                      {getDaysLabel(days)}
                    </td>
                    <td className="py-3">
                      <span className="font-display font-bold text-[--color-gold]">
                        {member.streak_count ?? 0}
                      </span>
                    </td>
                    <td className="relative py-3">
                      <button
                        onClick={() => setMenuOpen(menuOpen === member.id ? null : member.id)}
                        className="rounded px-2 py-1 text-[--color-text-secondary] transition-colors hover:bg-[--color-surface-3] hover:text-[--color-text-primary]"
                      >
                        ⋯
                      </button>
                      {menuOpen === member.id && (
                        <div className="absolute right-0 top-full z-10 w-48 rounded-[--radius-md] border border-[--color-border] bg-[--color-surface] py-1 shadow-lg">
                          {(["Log Payment", "Mark Paused", "Delete"] as const).map((action) => (
                            <button
                              key={action}
                              onClick={() => handleAction(action, member)}
                              className={cn(
                                "block w-full px-3 py-2 text-left text-sm transition-colors hover:bg-[--color-surface-2]",
                                action === "Delete"
                                  ? "text-[--color-red]"
                                  : "text-[--color-text-secondary]"
                              )}
                            >
                              {action}
                            </button>
                          ))}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={9} className="py-12 text-center text-[--color-text-muted]">
                  No members found matching your filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      <AddMemberModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSuccess={() => router.refresh()}
      />
      <LogPaymentModal
        open={paymentMember !== null}
        onClose={() => setPaymentMember(null)}
        members={paymentMember ? [paymentMember] : initialMembers}
        onSuccess={() => router.refresh()}
      />
    </div>
  );
}

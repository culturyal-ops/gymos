"use client";

import { useState, useTransition, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { logPayment } from "@/lib/actions";
import type { Member } from "@/lib/types";

interface LogPaymentModalProps {
  open: boolean;
  onClose: () => void;
  members?: Member[];
  onSuccess?: () => void;
}

const modeOptions = [
  { value: "cash", label: "Cash" },
  { value: "counter_upi", label: "Counter UPI" },
  { value: "razorpay_link", label: "Razorpay Link" },
];

const planOptions = [
  { value: "gold_6m", label: "Gold — 6 Months (₹8,000)" },
  { value: "silver_3m", label: "Silver — 3 Months (₹4,500)" },
  { value: "bronze_1m", label: "Bronze — 1 Month (₹1,500)" },
];

export function LogPaymentModal({ open, onClose, members: propMembers, onSuccess }: LogPaymentModalProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [members, setMembers] = useState<Member[]>(propMembers ?? []);
  const [search, setSearch] = useState("");
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);

  useEffect(() => {
    if (propMembers) {
      setMembers(propMembers);
      return;
    }
    if (open) {
      fetch("/api/members")
        .then((r) => r.json())
        .then((data: Member[]) => setMembers(data))
        .catch(() => {});
    }
  }, [open, propMembers]);

  const filtered = search
    ? members.filter(
        (m) =>
          m.name?.toLowerCase().includes(search.toLowerCase()) ||
          m.phone?.includes(search)
      )
    : members;

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (!selectedMember) {
      setError("Please select a member.");
      return;
    }

    const formData = new FormData(e.currentTarget);
    formData.set("member_id", selectedMember.id);

    if (!formData.get("amount")) {
      setError("Amount is required.");
      return;
    }

    startTransition(async () => {
      const result = await logPayment(formData);
      if (result.success) {
        onSuccess?.();
        onClose();
        setSelectedMember(null);
        setSearch("");
        (e.target as HTMLFormElement).reset();
      } else {
        setError(result.error ?? "Failed to log payment.");
      }
    });
  }

  return (
    <Modal open={open} onClose={onClose} title="Log Payment">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Member search */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold uppercase tracking-[0.12em] text-[--color-text-secondary]">
            Member
          </label>
          {selectedMember ? (
            <div className="flex items-center justify-between rounded-[--radius-md] border border-[--color-gold] bg-[--color-gold-dim] px-3 py-2.5">
              <div>
                <p className="text-sm font-medium text-[--color-text-primary]">{selectedMember.name}</p>
                <p className="text-xs text-[--color-text-secondary]">{selectedMember.phone}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedMember(null);
                  setSearch("");
                }}
                className="text-xs text-[--color-text-muted] hover:text-[--color-text-primary]"
              >
                ✕
              </button>
            </div>
          ) : (
            <div className="relative">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name or phone…"
                className="w-full rounded-[--radius-md] border border-[--color-border] bg-[--color-surface-2] px-3.5 py-2.5 text-sm text-[--color-text-primary] placeholder:text-[--color-text-muted] transition-all duration-100 focus:border-[--color-gold] focus:outline-none focus:ring-2 focus:ring-[--color-gold-dim]"
              />
              {search && filtered.length > 0 && (
                <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-48 overflow-y-auto rounded-[--radius-md] border border-[--color-border] bg-[--color-surface] shadow-lg">
                  {filtered.slice(0, 8).map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => {
                        setSelectedMember(m);
                        setSearch("");
                      }}
                      className="flex w-full items-center justify-between px-3 py-2.5 text-left text-sm hover:bg-[--color-surface-2]"
                    >
                      <span className="text-[--color-text-primary]">{m.name}</span>
                      <span className="text-xs text-[--color-text-secondary]">{m.phone}</span>
                    </button>
                  ))}
                </div>
              )}
              {search && filtered.length === 0 && (
                <div className="absolute left-0 right-0 top-full z-20 mt-1 rounded-[--radius-md] border border-[--color-border] bg-[--color-surface] px-3 py-3 text-xs text-[--color-text-muted] shadow-lg">
                  No members found
                </div>
              )}
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input name="amount" label="Amount (₹)" placeholder="8000" type="number" required />
          <Select name="mode" label="Payment Mode" options={modeOptions} />
        </div>
        <Select name="plan" label="Plan Purchased" options={planOptions} />

        <div className="rounded-[--radius-md] border border-[--color-border] bg-[--color-surface-2] p-3">
          <p className="text-xs text-[--color-text-secondary]">
            A WhatsApp payment receipt will be auto-sent to the member after logging.
          </p>
        </div>

        {error && (
          <div className="flex items-start gap-2 rounded-[--radius-md] bg-[--color-red-dim] px-3 py-2.5">
            <span className="mt-0.5 text-xs text-[--color-red]">⚠</span>
            <p className="text-xs text-[--color-red]">{error}</p>
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-2">
          <Button variant="ghost" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" disabled={isPending}>
            {isPending ? "Logging…" : "Log Payment"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

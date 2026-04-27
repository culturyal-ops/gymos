"use client";

import { useState, useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import { markAttendance, logPayment, addLead } from "@/lib/actions";
import type { Member } from "@/lib/types";

function getDaysLeft(expiryDate: string | null): number {
  if (!expiryDate) return 0;
  return Math.ceil((new Date(expiryDate).getTime() - Date.now()) / 86400000);
}

interface ReceptionClientProps {
  initialMembers: Member[];
}

export function ReceptionClient({ initialMembers }: ReceptionClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState("");
  const [markedIds, setMarkedIds] = useState<Set<string>>(new Set());
  const [showPayment, setShowPayment] = useState<string | null>(null);
  const [showLeadForm, setShowLeadForm] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMode, setPaymentMode] = useState("cash");
  const [toast, setToast] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (!search) return initialMembers;
    return initialMembers.filter(
      (m) =>
        m.name?.toLowerCase().includes(search.toLowerCase()) ||
        m.phone?.includes(search)
    );
  }, [search, initialMembers]);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }

  function handleMarkPresent(member: Member) {
    if (markedIds.has(member.id)) return;
    startTransition(async () => {
      const result = await markAttendance(member.id);
      if (result.success) {
        setMarkedIds((prev) => new Set(prev).add(member.id));
        showToast(`${member.name} marked present ✓`);
        router.refresh();
      } else {
        showToast("Failed to mark attendance");
      }
    });
  }

  function handleLogPayment(member: Member) {
    if (!paymentAmount || Number(paymentAmount) <= 0) return;
    startTransition(async () => {
      const fd = new FormData();
      fd.set("member_id", member.id);
      fd.set("amount", paymentAmount);
      fd.set("mode", paymentMode);
      const result = await logPayment(fd);
      if (result.success) {
        setShowPayment(null);
        setPaymentAmount("");
        showToast(`Payment of ₹${paymentAmount} logged ✓`);
        router.refresh();
      } else {
        showToast("Failed to log payment");
      }
    });
  }

  function handleAddLead(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await addLead(fd);
      if (result.success) {
        setShowLeadForm(false);
        (e.target as HTMLFormElement).reset();
        showToast("Lead added ✓");
        router.refresh();
      } else {
        showToast("Failed to add lead");
      }
    });
  }

  return (
    <main className="min-h-screen bg-[#F7F7F5] font-body text-[#111111]">
      {/* Toast */}
      {toast && (
        <div className="fixed left-1/2 top-4 z-50 -translate-x-1/2 rounded-xl bg-[#111111] px-4 py-2.5 text-sm font-medium text-white shadow-lg">
          {toast}
        </div>
      )}

      <div className="mx-auto max-w-md px-4 py-6">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">Reception</h1>
            <p className="text-xs text-[#888880]">GymOS · {initialMembers.length} members</p>
          </div>
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#111111] text-xs font-bold text-white">
            R
          </span>
        </div>

        {/* Search */}
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-xl border border-[#E5E5E0] bg-white px-4 py-3 text-sm shadow-sm placeholder:text-[#BBBBAA] focus:border-[#111111] focus:outline-none focus:ring-2 focus:ring-[#11111108]"
          placeholder="🔍  Search by name or phone"
        />

        {/* Member cards */}
        <div className="mt-4 space-y-3">
          {filtered.map((member) => {
            const days = getDaysLeft(member.expiry_date);
            const isMarked = markedIds.has(member.id);
            const statusColor =
              days < 0
                ? "text-[#EF4444]"
                : days <= 7
                  ? "text-[#F59E0B]"
                  : "text-[#22C55E]";

            return (
              <article
                key={member.id}
                className="rounded-2xl border border-[#EBEBEA] bg-white p-4 shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#F0F0EB] text-sm font-bold text-[#444440]">
                    {member.name?.charAt(0)}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold">{member.name}</p>
                    <div className="flex items-center gap-2 text-xs text-[#888880]">
                      <span className="uppercase">{member.plan_type?.replace("_", " ")}</span>
                      <span>·</span>
                      <span className={statusColor}>
                        {days < 0
                          ? `${Math.abs(days)}d overdue`
                          : days === 0
                            ? "Expires today"
                            : `${days}d left`}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleMarkPresent(member)}
                    disabled={isMarked || isPending}
                    className={`rounded-xl py-2.5 text-sm font-semibold transition-all ${
                      isMarked
                        ? "bg-[#22C55E] text-white"
                        : "bg-[#111111] text-white active:scale-[0.98] disabled:opacity-60"
                    }`}
                  >
                    {isMarked ? "✓ Present" : "Mark Present"}
                  </button>
                  <button
                    onClick={() =>
                      setShowPayment(showPayment === member.id ? null : member.id)
                    }
                    className="rounded-xl border border-[#E5E5E0] py-2.5 text-sm font-medium text-[#444440] transition-all active:scale-[0.98]"
                  >
                    Log Payment
                  </button>
                </div>

                {/* Inline payment form */}
                {showPayment === member.id && (
                  <div className="mt-3 space-y-2 rounded-xl bg-[#F7F7F5] p-3">
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="number"
                        placeholder="Amount (₹)"
                        value={paymentAmount}
                        onChange={(e) => setPaymentAmount(e.target.value)}
                        className="rounded-lg border border-[#E5E5E0] bg-white px-3 py-2 text-sm focus:border-[#111111] focus:outline-none"
                      />
                      <select
                        value={paymentMode}
                        onChange={(e) => setPaymentMode(e.target.value)}
                        className="rounded-lg border border-[#E5E5E0] bg-white px-3 py-2 text-sm focus:border-[#111111] focus:outline-none"
                      >
                        <option value="cash">Cash</option>
                        <option value="counter_upi">UPI</option>
                        <option value="razorpay_link">Razorpay</option>
                      </select>
                    </div>
                    <button
                      onClick={() => handleLogPayment(member)}
                      disabled={isPending || !paymentAmount}
                      className="w-full rounded-lg bg-[#111111] py-2 text-sm font-semibold text-white disabled:opacity-60"
                    >
                      {isPending ? "Saving…" : "Submit Payment"}
                    </button>
                  </div>
                )}
              </article>
            );
          })}

          {filtered.length === 0 && search && (
            <div className="rounded-2xl border border-dashed border-[#E5E5E0] py-8 text-center text-sm text-[#BBBBAA]">
              No members found for &ldquo;{search}&rdquo;
            </div>
          )}

          {initialMembers.length === 0 && !search && (
            <div className="rounded-2xl border border-dashed border-[#E5E5E0] py-8 text-center text-sm text-[#BBBBAA]">
              No members yet. Add members from the owner dashboard.
            </div>
          )}
        </div>

        {/* Add Walk-in Lead */}
        <button
          onClick={() => setShowLeadForm(!showLeadForm)}
          className="mt-4 w-full rounded-xl border border-[#E5E5E0] bg-white py-3 text-sm font-medium text-[#444440] shadow-sm transition-all active:scale-[0.98]"
        >
          + Add Walk-in Lead
        </button>

        {showLeadForm && (
          <form
            onSubmit={handleAddLead}
            className="mt-3 space-y-3 rounded-2xl border border-[#EBEBEA] bg-white p-4 shadow-sm"
          >
            <input
              name="name"
              required
              placeholder="Name"
              className="w-full rounded-lg border border-[#E5E5E0] px-3 py-2.5 text-sm focus:border-[#111111] focus:outline-none"
            />
            <input
              name="phone"
              required
              placeholder="Phone"
              type="tel"
              className="w-full rounded-lg border border-[#E5E5E0] px-3 py-2.5 text-sm focus:border-[#111111] focus:outline-none"
            />
            <select
              name="source"
              className="w-full rounded-lg border border-[#E5E5E0] px-3 py-2.5 text-sm focus:border-[#111111] focus:outline-none"
            >
              <option value="walkin">Walk-in</option>
              <option value="referral">Referral</option>
              <option value="instagram_ad">Instagram</option>
              <option value="whatsapp">WhatsApp</option>
            </select>
            <button
              type="submit"
              disabled={isPending}
              className="w-full rounded-lg bg-[#111111] py-2.5 text-sm font-semibold text-white disabled:opacity-60"
            >
              {isPending ? "Saving…" : "Submit Lead"}
            </button>
          </form>
        )}

        <p className="mt-8 text-center text-[10px] text-[#CCCCBB]">
          Gym<span className="font-semibold">OS</span> Reception
        </p>
      </div>
    </main>
  );
}

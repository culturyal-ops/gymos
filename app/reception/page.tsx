"use client";

import { useState, useMemo } from "react";
import { demoMembers } from "@/lib/demo-data";

function getDaysLeft(expiryDate: string | null): number {
  if (!expiryDate) return 0;
  return Math.ceil((new Date(expiryDate).getTime() - Date.now()) / 86400000);
}

export default function ReceptionPage() {
  const [search, setSearch] = useState("");
  const [markedIds, setMarkedIds] = useState<Set<string>>(new Set());
  const [showPayment, setShowPayment] = useState<string | null>(null);
  const [showLeadForm, setShowLeadForm] = useState(false);

  const filtered = useMemo(() => {
    if (!search) return demoMembers;
    return demoMembers.filter(
      (m) =>
        m.name?.toLowerCase().includes(search.toLowerCase()) ||
        m.phone?.includes(search)
    );
  }, [search]);

  function markPresent(id: string) {
    setMarkedIds((prev) => new Set(prev).add(id));
  }

  return (
    <main className="min-h-screen bg-[#F7F7F5] font-body text-[#111111]">
      <div className="mx-auto max-w-md px-4 py-6">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">Reception</h1>
            <p className="text-xs text-[#888880]">Culturyal Fitness, Pala</p>
          </div>
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#111111] text-xs font-bold text-white">
            A
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
                    onClick={() => markPresent(member.id)}
                    disabled={isMarked}
                    className={`rounded-xl py-2.5 text-sm font-semibold transition-all ${
                      isMarked
                        ? "bg-[#22C55E] text-white"
                        : "bg-[#111111] text-white active:scale-[0.98]"
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
                        placeholder="Amount"
                        className="rounded-lg border border-[#E5E5E0] bg-white px-3 py-2 text-sm focus:border-[#111111] focus:outline-none"
                      />
                      <select className="rounded-lg border border-[#E5E5E0] bg-white px-3 py-2 text-sm focus:border-[#111111] focus:outline-none">
                        <option value="cash">Cash</option>
                        <option value="counter_upi">UPI</option>
                      </select>
                    </div>
                    <button
                      onClick={() => setShowPayment(null)}
                      className="w-full rounded-lg bg-[#111111] py-2 text-sm font-semibold text-white"
                    >
                      Submit Payment
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
        </div>

        {/* Add Walk-in Lead */}
        <button
          onClick={() => setShowLeadForm(!showLeadForm)}
          className="mt-4 w-full rounded-xl border border-[#E5E5E0] bg-white py-3 text-sm font-medium text-[#444440] shadow-sm transition-all active:scale-[0.98]"
        >
          + Add Walk-in Lead
        </button>

        {showLeadForm && (
          <div className="mt-3 space-y-3 rounded-2xl border border-[#EBEBEA] bg-white p-4 shadow-sm">
            <input
              placeholder="Name"
              className="w-full rounded-lg border border-[#E5E5E0] px-3 py-2.5 text-sm focus:border-[#111111] focus:outline-none"
            />
            <input
              placeholder="Phone"
              type="tel"
              className="w-full rounded-lg border border-[#E5E5E0] px-3 py-2.5 text-sm focus:border-[#111111] focus:outline-none"
            />
            <select className="w-full rounded-lg border border-[#E5E5E0] px-3 py-2.5 text-sm focus:border-[#111111] focus:outline-none">
              <option value="walkin">Walk-in</option>
              <option value="referral">Referral</option>
              <option value="instagram_ad">Instagram</option>
              <option value="whatsapp">WhatsApp</option>
            </select>
            <button
              onClick={() => setShowLeadForm(false)}
              className="w-full rounded-lg bg-[#111111] py-2.5 text-sm font-semibold text-white"
            >
              Submit Lead
            </button>
          </div>
        )}

        {/* Footer */}
        <p className="mt-8 text-center text-[10px] text-[#CCCCBB]">
          Gym<span className="font-semibold">OS</span> Reception · v0.1
        </p>
      </div>
    </main>
  );
}

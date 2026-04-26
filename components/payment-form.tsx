"use client";

import { FormEvent, useState } from "react";
import type { Member } from "@/lib/types";

export function PaymentForm({ members, isDemo }: { members: Member[]; isDemo: boolean }) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const memberId = form.get("member_id")?.toString();
    if (!memberId) {
      setMessage("Please choose a member.");
      return;
    }

    setLoading(true);
    setMessage("");

    const res = await fetch("/api/transactions", {
      method: "POST",
      body: JSON.stringify({
        member_id: memberId,
        amount: Number(form.get("amount")),
        payment_mode: form.get("payment_mode"),
        plan_purchased: form.get("plan_purchased")
      })
    });

    setLoading(false);
    setMessage(res.ok ? "Payment logged." : "Failed to log payment.");
    if (res.ok) e.currentTarget.reset();
  }

  return (
    <form className="card grid" onSubmit={onSubmit}>
      <strong>Log Payment</strong>
      <select name="member_id" required>
        <option value="">Select member</option>
        {members.map((member) => (
          <option key={member.id} value={member.id}>
            {member.name} ({member.phone})
          </option>
        ))}
      </select>
      <input name="amount" type="number" min="1" step="0.01" placeholder="Amount" required />
      <select name="payment_mode" required defaultValue="cash">
        <option value="cash">Cash</option>
        <option value="counter_upi">Counter UPI</option>
        <option value="razorpay_link">Razorpay Link</option>
        <option value="razorpay_subscription">Razorpay Subscription</option>
      </select>
      <input name="plan_purchased" placeholder="Plan purchased (e.g. gold_6m)" />
      <button className="btn btn-primary" disabled={loading} type="submit">
        {loading ? "Saving..." : "Save Payment"}
      </button>
      {isDemo ? (
        <span style={{ fontSize: 13, color: "#64748b" }}>
          Demo mode: payment is simulated for preview.
        </span>
      ) : null}
      {message ? <span style={{ fontSize: 13 }}>{message}</span> : null}
    </form>
  );
}

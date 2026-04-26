"use client";

import { useState, FormEvent } from "react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";

interface LogPaymentModalProps {
  open: boolean;
  onClose: () => void;
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

export function LogPaymentModal({ open, onClose }: LogPaymentModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const member = formData.get("member") as string;
    const amount = formData.get("amount") as string;

    if (!member || !amount) {
      setError("Member and amount are required.");
      setLoading(false);
      return;
    }

    // TODO: Wire to Server Action — logPayment(formData)
    await new Promise((r) => setTimeout(r, 600));
    setLoading(false);
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="Log Payment">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          name="member"
          label="Member Name or Phone"
          placeholder="Search member…"
          required
        />
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
          <p className="rounded-[--radius-sm] bg-[--color-red-dim] px-3 py-2 text-xs text-[--color-red]">
            {error}
          </p>
        )}

        <div className="flex items-center justify-end gap-3 pt-2">
          <Button variant="ghost" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" disabled={loading}>
            {loading ? "Logging…" : "Log Payment"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

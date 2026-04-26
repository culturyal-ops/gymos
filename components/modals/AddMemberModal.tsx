"use client";

import { useState, FormEvent } from "react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";

interface AddMemberModalProps {
  open: boolean;
  onClose: () => void;
}

const planOptions = [
  { value: "gold_6m", label: "Gold — 6 Months" },
  { value: "silver_3m", label: "Silver — 3 Months" },
  { value: "bronze_1m", label: "Bronze — 1 Month" },
];

export function AddMemberModal({ open, onClose }: AddMemberModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const name = formData.get("name") as string;
    const phone = formData.get("phone") as string;
    const plan = formData.get("plan") as string;

    if (!name || !phone) {
      setError("Name and phone are required.");
      setLoading(false);
      return;
    }

    // TODO: Wire to Server Action — addMember(formData)
    await new Promise((r) => setTimeout(r, 600));
    setLoading(false);
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="Add Member">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input name="name" label="Full Name" placeholder="Arun Mathew" required />
        <Input name="phone" label="Phone" placeholder="+91 9900000101" type="tel" required />
        <Input name="email" label="Email (Optional)" placeholder="arun@example.com" type="email" />
        <Select name="plan" label="Plan" options={planOptions} />
        <Input name="expiry" label="Expiry Date" type="date" />

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
            {loading ? "Adding…" : "Add Member"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

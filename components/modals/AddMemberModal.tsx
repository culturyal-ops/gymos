"use client";

import { useState, useTransition } from "react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { addMember } from "@/lib/actions";

interface AddMemberModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const planOptions = [
  { value: "gold_6m", label: "Gold — 6 Months (₹8,000)" },
  { value: "silver_3m", label: "Silver — 3 Months (₹4,500)" },
  { value: "bronze_1m", label: "Bronze — 1 Month (₹1,500)" },
];

export function AddMemberModal({ open, onClose, onSuccess }: AddMemberModalProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    if (!formData.get("name") || !formData.get("phone")) {
      setError("Name and phone are required.");
      return;
    }
    const form = e.currentTarget;
    startTransition(async () => {
      const result = await addMember(formData);
      if (result.success) {
        onSuccess?.();
        onClose();
        form.reset();
      } else {
        setError(result.error ?? "Failed to add member.");
      }
    });
  }

  return (
    <Modal open={open} onClose={onClose} title="Add Member">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input name="name" label="Full Name" placeholder="Arun Mathew" required />
        <Input name="phone" label="Phone" placeholder="+91 9900000101" type="tel" required />
        <Input name="email" label="Email (Optional)" placeholder="arun@example.com" type="email" />
        <Select name="plan" label="Plan" options={planOptions} />
        <Input name="expiry" label="Expiry Date (Optional)" type="date" />
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
            {isPending ? "Adding…" : "Add Member"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

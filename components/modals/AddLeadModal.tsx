"use client";

import { useState, useTransition } from "react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { addLead } from "@/lib/actions";

interface AddLeadModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const sourceOptions = [
  { value: "walkin", label: "Walk-in" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "instagram_ad", label: "Instagram Ad" },
  { value: "referral", label: "Referral" },
];

export function AddLeadModal({ open, onClose, onSuccess }: AddLeadModalProps) {
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
      const result = await addLead(formData);
      if (result.success) {
        onSuccess?.();
        onClose();
        form.reset();
      } else {
        setError(result.error ?? "Failed to add lead.");
      }
    });
  }

  return (
    <Modal open={open} onClose={onClose} title="Add Lead">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input name="name" label="Name" placeholder="Kiran" required />
        <Input name="phone" label="Phone" placeholder="+91 9900000201" type="tel" required />
        <Select name="source" label="Source" options={sourceOptions} />
        <div className="space-y-1.5">
          <label className="block text-xs font-medium uppercase tracking-[0.12em] text-[--color-text-secondary]">
            First Message / Query
          </label>
          <textarea
            name="query"
            className="min-h-[80px] w-full resize-none rounded-[--radius-md] border border-[--color-border] bg-[--color-surface-2] px-3 py-2.5 text-sm text-[--color-text-primary] placeholder:text-[--color-text-muted] transition-colors focus:border-[--color-gold] focus:outline-none focus:ring-1 focus:ring-[--color-gold-dim]"
            placeholder="What are your monthly packages?"
          />
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
          <Button variant="primary" type="submit" disabled={isPending}>
            {isPending ? "Adding…" : "Add Lead"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

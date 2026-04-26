"use client";

import { useState, FormEvent } from "react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";

interface AddLeadModalProps {
  open: boolean;
  onClose: () => void;
}

const sourceOptions = [
  { value: "walkin", label: "Walk-in" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "instagram_ad", label: "Instagram Ad" },
  { value: "referral", label: "Referral" },
];

export function AddLeadModal({ open, onClose }: AddLeadModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const name = formData.get("name") as string;
    const phone = formData.get("phone") as string;

    if (!name || !phone) {
      setError("Name and phone are required.");
      setLoading(false);
      return;
    }

    // TODO: Wire to Server Action — addLead(formData)
    await new Promise((r) => setTimeout(r, 600));
    setLoading(false);
    onClose();
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
          <Button variant="primary" type="submit" disabled={loading}>
            {loading ? "Adding…" : "Add Lead"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

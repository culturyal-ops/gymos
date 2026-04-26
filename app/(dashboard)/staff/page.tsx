"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { cn } from "@/lib/utils/cn";

interface StaffMember {
  id: string;
  name: string;
  role: "owner" | "receptionist" | "trainer";
  email: string;
  lastActive: string;
}

const demoStaff: StaffMember[] = [
  { id: "s1", name: "Abdul Salam", role: "owner", email: "abdul@gymos.in", lastActive: "Now" },
  { id: "s2", name: "Anju Thomas", role: "receptionist", email: "anju@gym.com", lastActive: "2 hours ago" },
  { id: "s3", name: "Rajesh Kumar", role: "trainer", email: "rajesh@gym.com", lastActive: "Today" },
];

const roleBadgeStyles: Record<string, string> = {
  owner: "bg-[--color-gold-dim] text-[--color-gold]",
  receptionist: "bg-[--color-blue-dim] text-[--color-blue]",
  trainer: "bg-[--color-green-dim] text-[--color-green]",
};

export default function StaffPage() {
  const [addOpen, setAddOpen] = useState(false);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Staff</h1>
          <p className="mt-1 text-sm text-[--color-text-secondary]">
            Manage team roles and access
          </p>
        </div>
        <Button variant="primary" onClick={() => setAddOpen(true)}>
          + Add Staff
        </Button>
      </div>

      <div className="space-y-3">
        {demoStaff.map((member) => (
          <div
            key={member.id}
            className="card flex items-center justify-between p-5 transition-colors hover:bg-[--color-surface-2]"
          >
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[--color-surface-3] font-display font-bold text-[--color-gold]">
                {member.name.charAt(0)}
              </div>
              <div>
                <p className="font-medium">{member.name}</p>
                <p className="text-xs text-[--color-text-secondary]">{member.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-xs text-[--color-text-muted]">{member.lastActive}</span>
              <span
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-medium capitalize",
                  roleBadgeStyles[member.role]
                )}
              >
                {member.role}
              </span>
              <button className="rounded px-2 py-1 text-sm text-[--color-text-secondary] transition-colors hover:bg-[--color-surface-3]">
                ⋯
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Role Permissions Info */}
      <section className="card mt-6 p-5">
        <h3 className="mb-3 text-sm font-medium uppercase tracking-[0.12em] text-[--color-text-muted]">
          Role Permissions
        </h3>
        <div className="space-y-3 text-sm">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 rounded-full bg-[--color-gold-dim] px-2 py-0.5 text-xs text-[--color-gold]">
              Owner
            </span>
            <p className="text-[--color-text-secondary]">
              Full access: dashboard, financial data, all members, settings, staff management
            </p>
          </div>
          <div className="flex items-start gap-3">
            <span className="mt-0.5 rounded-full bg-[--color-blue-dim] px-2 py-0.5 text-xs text-[--color-blue]">
              Receptionist
            </span>
            <p className="text-[--color-text-secondary]">
              Reception UI only: search members, log payments (cash/UPI), mark attendance, add walk-in leads. No financial analytics.
            </p>
          </div>
          <div className="flex items-start gap-3">
            <span className="mt-0.5 rounded-full bg-[--color-green-dim] px-2 py-0.5 text-xs text-[--color-green]">
              Trainer
            </span>
            <p className="text-[--color-text-secondary]">
              Attendance logs and member streak data only. No payment or contact data access.
            </p>
          </div>
        </div>
      </section>

      {/* Add Staff Modal */}
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add Staff Member">
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            setAddOpen(false);
          }}
        >
          <Input name="name" label="Full Name" placeholder="Anju Thomas" required />
          <Input name="email" label="Email" placeholder="anju@gym.com" type="email" required />
          <Select
            name="role"
            label="Role"
            options={[
              { value: "receptionist", label: "Receptionist" },
              { value: "trainer", label: "Trainer" },
            ]}
          />
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button variant="ghost" type="button" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Invite Staff
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

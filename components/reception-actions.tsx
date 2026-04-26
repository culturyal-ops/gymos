"use client";

import { FormEvent, useState } from "react";
import type { Member } from "@/lib/types";

export function ReceptionActions({ members, isDemo }: { members: Member[]; isDemo: boolean }) {
  const [note, setNote] = useState("");

  async function submit(path: string, payload: Record<string, unknown>) {
    const res = await fetch(path, { method: "POST", body: JSON.stringify(payload) });
    setNote(res.ok ? "Saved successfully." : "Failed to save.");
  }

  return (
    <div className="grid" style={{ gap: "1rem" }}>
      <form
        className="card grid"
        onSubmit={(e: FormEvent<HTMLFormElement>) => {
          e.preventDefault();
          const data = new FormData(e.currentTarget);
          submit("/api/members", {
            name: data.get("name"),
            phone: data.get("phone"),
            plan_type: data.get("plan_type"),
            status: "active"
          });
          e.currentTarget.reset();
        }}
      >
        <strong>Add Walk-in Lead as Member</strong>
        <input name="name" required placeholder="Name" />
        <input name="phone" required placeholder="Phone" />
        <input name="plan_type" placeholder="Plan (bronze_1m/silver_3m/...)" />
        <button type="submit" className="btn btn-primary">
          Add Member
        </button>
      </form>

      <form
        className="card grid"
        onSubmit={(e: FormEvent<HTMLFormElement>) => {
          e.preventDefault();
          const data = new FormData(e.currentTarget);
          submit("/api/attendance", { member_id: data.get("member_id") });
          e.currentTarget.reset();
        }}
      >
        <strong>Mark Attendance</strong>
        <select name="member_id" required>
          <option value="">Select member</option>
          {members.map((member) => (
            <option key={member.id} value={member.id}>
              {member.name} ({member.phone})
            </option>
          ))}
        </select>
        <button type="submit" className="btn">
          Mark Attendance
        </button>
      </form>

      <form
        className="card grid"
        onSubmit={(e: FormEvent<HTMLFormElement>) => {
          e.preventDefault();
          const data = new FormData(e.currentTarget);
          submit("/api/leads", {
            name: data.get("name"),
            phone: data.get("phone"),
            source: "walkin",
            query_text: data.get("query_text"),
            stage: "new"
          });
          e.currentTarget.reset();
        }}
      >
        <strong>Add Walk-in Lead</strong>
        <input name="name" required placeholder="Lead name" />
        <input name="phone" required placeholder="Lead phone" />
        <textarea name="query_text" placeholder="Inquiry" />
        <button type="submit" className="btn">
          Save Lead
        </button>
      </form>
      {isDemo ? <small style={{ color: "#64748b" }}>Demo mode: data writes are simulated for preview.</small> : null}
      {note ? <small>{note}</small> : null}
    </div>
  );
}

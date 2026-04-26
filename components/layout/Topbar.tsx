"use client";

import { formatDate } from "@/lib/utils/format";

interface TopbarProps {
  onAddMember?: () => void;
}

export function Topbar({ onAddMember }: TopbarProps) {
  return (
    <header className="mb-6 flex items-center justify-between">
      <div>
        <h1 className="font-display text-2xl font-bold">Good morning, Abdul ↗</h1>
        <p className="mt-1 text-sm text-[--color-text-secondary]">
          {formatDate(new Date())} · Culturyal Fitness, Pala
        </p>
      </div>
      <div className="flex items-center gap-3">
        <button className="relative rounded-md border border-[--color-border] px-3 py-2 text-sm transition-colors hover:border-[--color-border-hover]">
          🔔
          <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-[--color-gold]" />
        </button>
        <button
          onClick={onAddMember}
          className="rounded-md bg-[--color-gold] px-4 py-2 text-sm font-bold text-black font-display uppercase tracking-[0.06em] transition-all hover:brightness-110"
        >
          + Add Member
        </button>
      </div>
    </header>
  );
}

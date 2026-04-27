"use client";

import { formatDate } from "@/lib/utils/format";

interface TopbarProps {
  onAddMember?: () => void;
}

export function Topbar({ onAddMember }: TopbarProps) {
  return (
    <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="font-display text-xl font-bold sm:text-2xl">
          Good morning, Abdul{" "}
          <span className="text-[--color-gold]">↗</span>
        </h1>
        <p className="mt-0.5 text-sm text-[--color-text-secondary]">
          {formatDate(new Date())} · Culturyal Fitness, Pala
        </p>
      </div>
      <div className="flex items-center gap-2">
        <button className="relative flex h-9 w-9 items-center justify-center rounded-[--radius-md] border border-[--color-border] text-base transition-colors hover:border-[--color-border-hover] hover:bg-[--color-surface-2]">
          🔔
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-[--color-gold]" />
        </button>
        <button
          onClick={onAddMember}
          className="rounded-[--radius-md] bg-[--color-gold] px-4 py-2 text-sm font-bold text-black font-display uppercase tracking-[0.06em] transition-all hover:brightness-110 active:scale-[0.98]"
        >
          + Add Member
        </button>
      </div>
    </header>
  );
}

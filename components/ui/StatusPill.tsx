import { cn } from "@/lib/utils/cn";

interface StatusPillProps {
  status: "active" | "expiring" | "churned" | "paused";
}

const styles: Record<StatusPillProps["status"], string> = {
  active: "border-[--color-green] bg-[--color-green-dim] text-[--color-green]",
  expiring: "border-[--color-amber] bg-[--color-amber-dim] text-[--color-amber]",
  churned: "border-[--color-red] bg-[--color-red-dim] text-[--color-red]",
  paused: "border-[--color-border-hover] bg-[--color-surface-3] text-[--color-text-secondary]"
};

export function StatusPill({ status }: StatusPillProps) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs capitalize", styles[status])}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {status}
    </span>
  );
}

"use client";

import { cn } from "@/lib/utils/cn";
import { motion } from "framer-motion";

interface MetricCardProps {
  label: string;
  value: string;
  subtext: string;
  badge?: string;
  badgeType?: "up" | "down" | "neutral";
  accentColor: "gold" | "green" | "red" | "blue";
  index?: number;
}

const accentStyles = {
  gold: "border-t-[--color-gold]",
  green: "border-t-[--color-green]",
  red: "border-t-[--color-red]",
  blue: "border-t-[--color-blue]",
};

const badgeStyles = {
  up: "bg-[--color-green-dim] text-[--color-green]",
  down: "bg-[--color-red-dim] text-[--color-red]",
  neutral: "bg-[--color-gold-dim] text-[--color-gold]",
};

export function MetricCard({
  label,
  value,
  subtext,
  badge,
  badgeType = "neutral",
  accentColor,
  index = 0,
}: MetricCardProps) {
  return (
    <motion.article
      className={cn("card border-t-2 p-4 sm:p-5", accentStyles[accentColor])}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05, ease: "easeOut" }}
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[--color-text-muted]">
        {label}
      </p>
      <p className="mt-2 font-display text-2xl font-bold leading-none sm:text-[28px]">
        {value}
      </p>
      <div className="mt-3 flex items-center justify-between gap-2">
        <p className="text-xs text-[--color-text-secondary]">{subtext}</p>
        {badge ? (
          <span
            className={cn(
              "whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-semibold",
              badgeStyles[badgeType]
            )}
          >
            {badge}
          </span>
        ) : null}
      </div>
    </motion.article>
  );
}

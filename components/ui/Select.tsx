import { SelectHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils/cn";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, className, ...props }, ref) => {
    return (
      <div className="space-y-1.5">
        {label && (
          <label className="block text-xs font-semibold uppercase tracking-[0.12em] text-[--color-text-secondary]">
            {label}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            className={cn(
              "w-full appearance-none rounded-[--radius-md] border border-[--color-border] bg-[--color-surface-2] px-3.5 py-2.5 pr-9 text-sm text-[--color-text-primary] transition-all duration-100 focus:border-[--color-gold] focus:outline-none focus:ring-2 focus:ring-[--color-gold-dim]",
              error && "border-[--color-red]",
              className
            )}
            {...props}
          >
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[--color-text-muted]">
            ▼
          </span>
        </div>
        {error && (
          <p className="flex items-center gap-1 text-xs text-[--color-red]">
            <span>⚠</span> {error}
          </p>
        )}
      </div>
    );
  }
);

Select.displayName = "Select";

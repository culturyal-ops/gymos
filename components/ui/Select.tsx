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
          <label className="block text-xs font-medium uppercase tracking-[0.12em] text-[--color-text-secondary]">
            {label}
          </label>
        )}
        <select
          ref={ref}
          className={cn(
            "w-full appearance-none rounded-[--radius-md] border border-[--color-border] bg-[--color-surface-2] px-3 py-2.5 text-sm text-[--color-text-primary] transition-colors focus:border-[--color-gold] focus:outline-none focus:ring-1 focus:ring-[--color-gold-dim]",
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
        {error && <p className="text-xs text-[--color-red]">{error}</p>}
      </div>
    );
  }
);

Select.displayName = "Select";

import { InputHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils/cn";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className, ...props }, ref) => {
    return (
      <div className="space-y-1.5">
        {label && (
          <label className="block text-xs font-medium uppercase tracking-[0.12em] text-[--color-text-secondary]">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={cn(
            "w-full rounded-[--radius-md] border border-[--color-border] bg-[--color-surface-2] px-3 py-2.5 text-sm text-[--color-text-primary] placeholder:text-[--color-text-muted] transition-colors focus:border-[--color-gold] focus:outline-none focus:ring-1 focus:ring-[--color-gold-dim]",
            error && "border-[--color-red] focus:border-[--color-red] focus:ring-[--color-red-dim]",
            className
          )}
          {...props}
        />
        {error && <p className="text-xs text-[--color-red]">{error}</p>}
      </div>
    );
  }
);

Input.displayName = "Input";

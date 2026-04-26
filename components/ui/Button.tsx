import { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  children: ReactNode;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-[--color-gold] text-black font-display font-bold uppercase tracking-[0.08em] hover:brightness-110",
  secondary:
    "border border-[--color-border] bg-transparent text-white hover:border-[--color-border-hover] hover:bg-[--color-surface-2]",
  ghost:
    "bg-transparent text-[--color-text-secondary] hover:bg-[--color-surface-3] hover:text-[--color-text-primary]",
  danger:
    "bg-[--color-red-dim] text-[--color-red] hover:brightness-125",
};

export function Button({ variant = "secondary", className, children, ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-[--radius-md] px-4 py-2.5 text-sm transition-all duration-100 disabled:opacity-50 disabled:pointer-events-none",
        variantStyles[variant],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

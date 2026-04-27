import { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: ReactNode;
  className?: string;
  disabled?: boolean;
  onClick?: () => void;
  type?: "button" | "submit" | "reset";
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-[--color-gold] text-black font-display font-bold uppercase tracking-[0.08em] hover:brightness-110 active:scale-[0.98] shadow-[0_0_20px_rgba(201,168,76,0.2)]",
  secondary:
    "border border-[--color-border] bg-transparent text-[--color-text-primary] hover:border-[--color-border-hover] hover:bg-[--color-surface-2] active:scale-[0.98]",
  ghost:
    "bg-transparent text-[--color-text-secondary] hover:bg-[--color-surface-3] hover:text-[--color-text-primary] active:scale-[0.98]",
  danger:
    "bg-[--color-red-dim] text-[--color-red] border border-[--color-red]/20 hover:brightness-125 active:scale-[0.98]",
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-4 py-2.5 text-sm",
  lg: "px-5 py-3 text-base",
};

export function Button({
  variant = "secondary",
  size = "md",
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-[--radius-md] transition-all duration-100 disabled:pointer-events-none disabled:opacity-40",
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

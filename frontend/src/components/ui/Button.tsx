import { ButtonHTMLAttributes } from "react";
import { cn } from "../../lib/cn";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md" | "lg";
  full?: boolean;
  loading?: boolean;
}

const variantStyles: Record<string, string> = {
  primary: "bg-brand text-white hover:bg-brand-dark shadow-cartoon",
  secondary: "bg-white text-brand border border-brand/30 hover:bg-brand/5",
  ghost: "bg-transparent text-brand hover:bg-brand/10"
};

const sizeStyles: Record<string, string> = {
  sm: "h-10 px-4 text-sm",
  md: "h-12 px-5 text-base",
  lg: "h-14 px-6 text-base"
};

export default function Button({
  className,
  variant = "primary",
  size = "md",
  full,
  loading,
  disabled,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-xl font-semibold transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand",
        variantStyles[variant],
        sizeStyles[size],
        full && "w-full",
        (disabled || loading) && "opacity-70 cursor-not-allowed",
        className
      )}
      disabled={disabled || loading}
      aria-busy={loading ? "true" : undefined}
      {...props}
    >
      {loading ? "Carregando..." : children}
    </button>
  );
}

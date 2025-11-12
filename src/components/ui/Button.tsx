import * as React from "react";

function cn(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "outline" | "secondary" | "ghost";
  size?: "sm" | "default";
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", disabled, ...props }, ref) => {
    const base =
      "inline-flex items-center justify-center rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed";
    const byVariant = {
      default:
        "bg-[var(--surface-900)] text-[var(--fg)] hover:bg-[var(--surface-800)] border border-[var(--border)]",
      outline:
        "bg-transparent text-[var(--fg)] border border-[var(--border)] hover:bg-[var(--surface-900)]",
      secondary:
        "bg-[var(--surface-800)] text-[var(--fg)] hover:bg-[var(--surface-700)] border border-[var(--border)]",
      ghost:
        "bg-transparent text-[var(--fg)] hover:bg-[var(--surface-900)]",
    } as const;
    const bySize = {
      default: "h-9 px-4 text-sm",
      sm: "h-8 px-3 text-sm",
    } as const;

    return (
      <button
        ref={ref}
        className={cn(base, byVariant[variant], bySize[size], className)}
        disabled={disabled}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

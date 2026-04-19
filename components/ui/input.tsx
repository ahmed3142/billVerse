import * as React from "react";

import { cn } from "@/lib/utils";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "h-11 w-full rounded-2xl border border-[color:var(--border-strong)] bg-[color:var(--surface)]/90 px-4 text-sm text-[color:var(--foreground)] shadow-[var(--shadow-soft)] outline-none placeholder:text-[color:var(--muted)] focus:border-[color:var(--primary)]",
        "aria-invalid:border-[color:var(--danger)] aria-invalid:bg-[color:color-mix(in_srgb,var(--danger)_5%,var(--surface))]",
        className,
      )}
      {...props}
    />
  ),
);

Input.displayName = "Input";

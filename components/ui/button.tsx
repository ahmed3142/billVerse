import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "@/lib/utils";

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-2xl text-sm font-semibold transition duration-200 disabled:pointer-events-none disabled:opacity-50 focus-visible:ring-4 focus-visible:ring-[color:var(--ring)] active:scale-[0.99]",
  {
    variants: {
      variant: {
        default:
          "border border-transparent bg-[linear-gradient(135deg,var(--primary),color-mix(in_srgb,var(--primary)_70%,var(--accent)))] text-[color:var(--primary-foreground)] shadow-[var(--shadow-soft)] hover:-translate-y-0.5 hover:shadow-[var(--shadow-strong)]",
        secondary:
          "border border-[color:var(--border-strong)] bg-[color:var(--surface)] text-[color:var(--foreground)] shadow-[var(--shadow-soft)] hover:-translate-y-0.5 hover:bg-[color:var(--surface-elevated)]",
        ghost:
          "border border-transparent bg-transparent text-[color:var(--foreground)] hover:bg-[color:var(--surface-subtle)]",
        success:
          "border border-transparent bg-[linear-gradient(135deg,var(--success),color-mix(in_srgb,var(--success)_68%,white))] text-[#04130d] shadow-[var(--shadow-soft)] hover:-translate-y-0.5",
        danger:
          "border border-transparent bg-[linear-gradient(135deg,var(--danger),color-mix(in_srgb,var(--danger)_72%,#ffcfcc))] text-white shadow-[var(--shadow-soft)] hover:-translate-y-0.5",
      },
      size: {
        default: "h-11 px-4 py-2",
        sm: "h-9 px-3 text-xs",
        lg: "h-12 px-6 text-base",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  ),
);

Button.displayName = "Button";

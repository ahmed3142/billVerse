import { CircleHelp } from "lucide-react";

import { cn } from "@/lib/utils";

export function HelpTip({
  label,
  description,
  className,
  side = "top",
}: {
  label: string;
  description: string;
  className?: string;
  side?: "top" | "bottom";
}) {
  return (
    <span className={cn("group relative inline-flex", className)}>
      <button
        type="button"
        className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-[color:var(--border-strong)] bg-[color:var(--surface-elevated)] text-[color:var(--muted)] outline-none transition hover:text-[color:var(--foreground)] focus-visible:ring-4 focus-visible:ring-[color:var(--ring)]"
        aria-label={label}
        title={label}
      >
        <CircleHelp className="h-3.5 w-3.5" />
      </button>
      <span
        role="tooltip"
        className={cn(
          "pointer-events-none absolute left-1/2 z-30 w-56 -translate-x-1/2 rounded-2xl border border-[color:var(--border-strong)] bg-[color:var(--surface-strong)] px-3 py-2 text-left text-xs leading-5 text-[color:var(--surface)] opacity-0 shadow-[var(--shadow-strong)] transition duration-150 group-hover:opacity-100 group-focus-within:opacity-100 dark:bg-[color:var(--surface-elevated)] dark:text-[color:var(--foreground)]",
          side === "top" ? "bottom-[calc(100%+0.65rem)]" : "top-[calc(100%+0.65rem)]",
        )}
      >
        {description}
      </span>
    </span>
  );
}

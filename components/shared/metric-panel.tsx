import { CircleHelp } from "lucide-react";

import { cn } from "@/lib/utils";

const toneClassNames = {
  primary: "from-[color:var(--primary)]/18 via-[color:var(--primary)]/8 to-transparent",
  accent: "from-[color:var(--accent)]/18 via-[color:var(--accent)]/7 to-transparent",
  success: "from-[color:var(--success)]/18 via-[color:var(--success)]/7 to-transparent",
  danger: "from-[color:var(--danger)]/16 via-[color:var(--danger)]/7 to-transparent",
  neutral: "from-white/8 via-white/2 to-transparent dark:from-white/6 dark:via-white/[0.02] dark:to-transparent",
} as const;

export function MetricPanel({
  label,
  value,
  detail,
  tone = "neutral",
  className,
  valueClassName,
}: {
  label: string;
  value: React.ReactNode;
  detail?: string;
  tone?: keyof typeof toneClassNames;
  className?: string;
  valueClassName?: string;
}) {
  return (
    <div
      className={cn(
        "group relative z-0 rounded-[1.6rem] border border-[color:var(--border-strong)] bg-[color:var(--surface)]/92 p-4 shadow-[var(--shadow-soft)] transition duration-200 hover:-translate-y-0.5 hover:z-20 hover:shadow-[var(--shadow-strong)] focus-within:z-20 focus-within:shadow-[var(--shadow-strong)] sm:p-5",
        className,
      )}
    >
      <div
        className={cn(
          "pointer-events-none absolute inset-0 rounded-[inherit] bg-gradient-to-br",
          toneClassNames[tone],
        )}
      />

      {detail ? (
        <div className="pointer-events-none absolute inset-x-4 bottom-[calc(100%-0.5rem)] z-30 hidden translate-y-2 opacity-0 transition duration-200 group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:translate-y-0 group-focus-within:opacity-100 md:block">
          <div className="rounded-[1.15rem] border border-[color:var(--border-strong)] bg-[color:var(--surface)]/98 px-3.5 py-3 text-sm leading-6 text-muted shadow-[var(--shadow-strong)] backdrop-blur">
            {detail}
          </div>
        </div>
      ) : null}

      <div className="relative flex h-full min-h-[8.75rem] flex-col justify-between gap-5">
        <div className="flex items-start justify-between gap-3">
          <p className="text-sm font-medium text-muted">{label}</p>
          {detail ? (
            <button
              type="button"
              aria-label={`${label} details`}
              title={detail}
              className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-[color:var(--border-strong)] bg-[color:var(--surface)]/80 text-[color:var(--muted)] outline-none transition hover:text-[color:var(--foreground)] focus-visible:ring-4 focus-visible:ring-[color:var(--ring)]"
            >
              <CircleHelp className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>

        <div className="space-y-2">
          <div
            className={cn(
              "break-words font-display text-2xl font-semibold tracking-[-0.04em] text-[color:var(--foreground)] sm:text-3xl",
              valueClassName,
            )}
          >
            {value}
          </div>
        </div>
      </div>
    </div>
  );
}

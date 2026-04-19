"use client";

import { useEffect, useState } from "react";
import { Building2, Sparkles } from "lucide-react";

import { APP_NAME } from "@/lib/constants";
import { cn } from "@/lib/utils";

export function BrandHero({
  eyebrow,
  title,
  description,
  actions,
  metrics,
  className,
  collapsibleOnScroll = false,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  actions?: React.ReactNode;
  metrics?: Array<{
    label: string;
    value: string;
  }>;
  className?: string;
  collapsibleOnScroll?: boolean;
}) {
  const [isCompact, setIsCompact] = useState(false);

  useEffect(() => {
    if (!collapsibleOnScroll) {
      return;
    }

    const syncCompactState = () => {
      setIsCompact(window.scrollY > 72);
    };

    syncCompactState();
    window.addEventListener("scroll", syncCompactState, { passive: true });

    return () => window.removeEventListener("scroll", syncCompactState);
  }, [collapsibleOnScroll]);

  return (
    <section
      className={cn(
        "relative rounded-[2rem] border border-[color:var(--border-strong)] bg-[color:var(--surface)]/95 p-6 shadow-[var(--shadow-strong)] backdrop-blur transition-[padding,border-radius,box-shadow] duration-300 xl:p-8",
        collapsibleOnScroll && "sticky top-4 z-30",
        isCompact && "rounded-[1.6rem] p-4 sm:p-5",
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-0 rounded-[inherit] bg-[radial-gradient(circle_at_top_left,rgba(74,214,201,0.18),transparent_38%),radial-gradient(circle_at_85%_20%,rgba(255,155,113,0.16),transparent_32%),linear-gradient(135deg,rgba(10,24,32,0.02),rgba(10,24,32,0))]" />
      <div className="pointer-events-none absolute -left-10 top-12 h-28 w-28 rounded-full bg-[color:var(--primary)]/12 blur-3xl" />
      <div className="pointer-events-none absolute bottom-6 right-6 h-28 w-28 rounded-full bg-[color:var(--accent)]/14 blur-3xl" />

      <div
        className={cn(
          "relative grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(16rem,0.9fr)] lg:items-end",
          isCompact && "gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center",
        )}
      >
        <div className={cn("space-y-5", isCompact && "space-y-3")}>
          <div className="inline-flex items-center gap-2 rounded-full border border-[color:var(--border-strong)] bg-[color:var(--surface-elevated)]/85 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.22em] text-[color:var(--primary)] shadow-[var(--shadow-soft)]">
            <Building2 className="h-3.5 w-3.5" />
            {eyebrow ?? APP_NAME}
          </div>

          <div className={cn("space-y-3", isCompact && "space-y-2")}>
            <p
              className={cn(
                "text-sm font-semibold uppercase tracking-[0.22em] text-[color:var(--accent)] transition duration-200",
                isCompact && "max-h-0 overflow-hidden opacity-0",
              )}
            >
              {APP_NAME}
            </p>
            <h1
              className={cn(
                "font-display text-4xl font-semibold leading-tight tracking-[-0.04em] text-[color:var(--foreground)] transition-[font-size,max-width] duration-300 sm:text-5xl",
                isCompact && "max-w-3xl text-2xl sm:text-3xl",
              )}
            >
              {title}
            </h1>
            <div
              className={cn(
                "overflow-hidden transition-[max-height,opacity] duration-300",
                isCompact ? "max-h-0 opacity-0" : "max-h-40 opacity-100",
              )}
            >
              <p className="max-w-2xl text-base leading-8 text-muted">
                {description}
              </p>
            </div>
          </div>

          {actions ? <div className="flex flex-wrap items-center gap-3">{actions}</div> : null}
        </div>

        <div
          className={cn(
            "grid gap-3 overflow-hidden transition-[max-height,opacity,transform] duration-300 sm:grid-cols-3 lg:grid-cols-1",
            isCompact ? "max-h-0 translate-y-2 opacity-0" : "max-h-[32rem] translate-y-0 opacity-100",
          )}
        >
          {(metrics ?? []).map((metric) => (
            <div
              key={metric.label}
              className="rounded-[1.5rem] border border-[color:var(--border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.72),rgba(255,255,255,0.28))] p-4 shadow-[var(--shadow-soft)] dark:bg-[linear-gradient(180deg,rgba(17,36,46,0.9),rgba(17,36,46,0.45))]"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-muted">{metric.label}</p>
                <Sparkles className="h-4 w-4 text-[color:var(--accent)]" />
              </div>
              <p className="mt-3 font-display text-2xl font-semibold tracking-[-0.03em] text-[color:var(--foreground)]">
                {metric.value}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

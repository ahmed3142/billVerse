"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2, LogOut } from "lucide-react";

import { ThemeToggle } from "@/components/shared/theme-toggle";
import { logoutAction } from "@/lib/actions/auth";
import { APP_NAME, APP_SUBTITLE } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { SessionUser } from "@/types/domain";

export function AppShell({
  user,
  navItems,
  children,
}: {
  user: SessionUser;
  navItems: Array<{ href: string; label: string }>;
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-app">
      <header className="sticky top-0 z-40 border-b border-[color:var(--border)] bg-[color:var(--surface)]/88 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              href={user.role === "admin" ? "/admin/dashboard" : "/dashboard"}
              className="flex min-w-0 items-center gap-3"
            >
              <div className="rounded-2xl bg-[linear-gradient(135deg,var(--primary),var(--accent))] p-2.5 text-[color:var(--primary-foreground)] shadow-[var(--shadow-soft)]">
                <Building2 className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[color:var(--primary)]">
                  {APP_NAME}
                </p>
                <p className="truncate font-display text-xs tracking-[0.02em] text-muted">
                  {APP_SUBTITLE}
                </p>
              </div>
            </Link>
          </div>

          <div className="flex flex-wrap items-center gap-3 sm:justify-end">
            <div className="min-w-0 flex-1 text-left sm:max-w-[14rem] sm:flex-none sm:text-right">
              <p className="truncate text-sm font-medium text-[color:var(--foreground)]">{user.fullName}</p>
              <p className="truncate text-xs text-muted">
                {user.role === "admin" ? "Administrator" : user.email}
              </p>
            </div>
            <ThemeToggle />

            <form action={logoutAction} className="w-full sm:w-auto">
              <button
                type="submit"
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl border border-[color:var(--border-strong)] bg-[color:var(--surface)] px-4 text-sm font-medium text-[color:var(--foreground)] shadow-[var(--shadow-soft)] hover:-translate-y-0.5 hover:bg-[color:var(--surface-elevated)] sm:w-auto"
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </button>
            </form>
          </div>
        </div>

        <div className="mx-auto max-w-6xl overflow-hidden px-4 pb-4 sm:px-6">
          <nav className="flex gap-2 overflow-x-auto pb-1 sm:pb-0 lg:flex-wrap">
            {navItems.map((item) => {
              const isActive =
                pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition",
                    isActive
                      ? "bg-[linear-gradient(135deg,var(--primary),color-mix(in_srgb,var(--primary)_74%,var(--accent)))] text-[color:var(--primary-foreground)] shadow-[var(--shadow-soft)]"
                      : "border border-[color:var(--border-strong)] bg-[color:var(--surface)] text-[color:var(--foreground)] hover:bg-[color:var(--surface-elevated)]",
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-5 sm:px-6 sm:py-6">{children}</main>
    </div>
  );
}

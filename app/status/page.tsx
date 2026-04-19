import Link from "next/link";

import { PaymentStatusBoard } from "@/components/user/payment-status-board";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { buttonVariants } from "@/components/ui/button";
import { getSessionUser } from "@/lib/auth/session";
import { getPublicStatusData } from "@/lib/data-service";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function StatusPage() {
  const configured = isSupabaseConfigured();
  const session = configured ? await getSessionUser() : null;
  const data = configured ? await getPublicStatusData() : null;

  return (
    <main className="min-h-screen bg-app">
      <div className="mx-auto max-w-6xl space-y-5 px-4 py-6 sm:px-6 sm:py-8">
        <div className="flex justify-end">
          <ThemeToggle />
        </div>

        {data ? (
          <PaymentStatusBoard
            initialData={data}
            appHref={session ? (session.role === "admin" ? "/admin/dashboard" : "/dashboard") : "/login"}
            appLabel={session ? "Open app" : "Sign in"}
          />
        ) : (
          <div className="rounded-[1.75rem] border border-[color:var(--border-strong)] bg-[color:var(--surface)]/92 p-6 shadow-[var(--shadow-soft)]">
            <h2 className="font-display text-2xl font-semibold tracking-[-0.03em] text-[color:var(--foreground)]">
              Status board will appear after setup
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-muted">
              Connect Supabase, run the SQL migrations, and add your first admin account to enable billing, resident access, and the public payment status board.
            </p>
            <div className="mt-5">
              <Link
                href="/login"
                className={cn(buttonVariants({ variant: "secondary" }), "no-underline")}
              >
                Open app
              </Link>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

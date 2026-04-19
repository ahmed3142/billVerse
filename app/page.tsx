import Link from "next/link";
import { redirect } from "next/navigation";

import { BrandHero } from "@/components/shared/brand-hero";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardEyebrow, CardHeader, CardTitle } from "@/components/ui/card";
import { getSessionUser } from "@/lib/auth/session";
import { APP_SUBTITLE } from "@/lib/constants";
import { cn } from "@/lib/utils";

export default async function HomePage() {
  const session = await getSessionUser();

  if (session) {
    redirect(session.role === "admin" ? "/admin/dashboard" : "/dashboard");
  }

  return (
    <main className="min-h-screen bg-app">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-4 py-8 sm:px-6">
        <div className="flex flex-1 items-center">
          <div className="w-full space-y-6">
            <BrandHero
              eyebrow={APP_SUBTITLE}
              title="Building billing with a cleaner resident-facing experience."
              description="BillVerse gives administrators a faster monthly publishing workflow while residents get a polished view of current dues, payment history, notifications, and a shareable collection board."
              actions={
                <>
                  <Link href="/login" className={cn(buttonVariants({ size: "lg" }), "no-underline")}>
                    Open app
                  </Link>
                  <Link
                    href="/status"
                    className={cn(buttonVariants({ size: "lg", variant: "secondary" }), "no-underline")}
                  >
                    View status board
                  </Link>
                  <ThemeToggle />
                </>
              }
              metrics={[
                { label: "Admin-ready", value: "Monthly publishing" },
                { label: "Resident-ready", value: "Shared statements" },
                { label: "Ops-friendly", value: "Export & tracking" },
              ]}
            />

            <div className="grid gap-4 lg:grid-cols-3">
              <Card>
                <CardHeader className="space-y-3">
                  <CardEyebrow>Operations</CardEyebrow>
                  <CardTitle>Admin workflow</CardTitle>
                </CardHeader>
                <CardContent className="text-sm leading-7 text-muted">
                  Draft common charges, update individual bills, publish monthly statements, and keep payment records current without bouncing between tools.
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="space-y-3">
                  <CardEyebrow>Residents</CardEyebrow>
                  <CardTitle>Resident workspace</CardTitle>
                </CardHeader>
                <CardContent className="text-sm leading-7 text-muted">
                  Residents can sign in with the assigned flat email, view current dues, download statements, and stay on top of notifications from one account.
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="space-y-3">
                  <CardEyebrow>Visibility</CardEyebrow>
                  <CardTitle>Public status board</CardTitle>
                </CardHeader>
                <CardContent className="text-sm leading-7 text-muted">
                  A filterable public snapshot makes collection progress easy to review, export, and share during the active billing cycle.
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

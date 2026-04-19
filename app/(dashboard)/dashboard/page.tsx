import Link from "next/link";
import { Download } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireRole } from "@/lib/auth/session";
import { getResidentDashboardData } from "@/lib/data-service";
import { formatCurrency, formatDateTime, getDueDate, getMonthLabel } from "@/lib/utils";

export default async function UserDashboardPage() {
  const user = await requireRole("user");
  const data = await getResidentDashboardData(user.id);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Resident"
        title="Current bill"
        description={`Flat ${data.flat.flatNumber} · ${data.flat.ownerName}`}
      />

      {data.currentStatement ? (
        <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <Card>
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <CardTitle>{getMonthLabel(data.currentStatement.month, data.currentStatement.year)}</CardTitle>
                <CardDescription>
                  Due by {formatDateTime(getDueDate(data.currentStatement)).split(",")[0]}
                </CardDescription>
              </div>
              <StatusBadge status={data.currentStatement.paymentStatus} />
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-[1.5rem] border border-[color:var(--border-strong)] bg-[linear-gradient(135deg,color-mix(in_srgb,var(--primary)_22%,transparent),color-mix(in_srgb,var(--accent)_18%,transparent))] p-5 shadow-[var(--shadow-soft)]">
                <p className="text-sm font-medium text-muted">Total due</p>
                <p className="mt-2 font-display text-3xl font-semibold tracking-[-0.04em] text-[color:var(--foreground)]">
                  {formatCurrency(data.currentStatement.totalDue)}
                </p>
                <p className="mt-3 text-sm leading-6 text-muted">
                  Includes common charges, individual usage, and any unpaid carry-forward balance.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-[1.3rem] border border-[color:var(--border)] bg-[color:var(--surface-elevated)]/88 p-4">
                  <p className="text-sm text-muted">Common</p>
                  <p className="mt-2 text-xl font-semibold text-[color:var(--foreground)]">
                    {formatCurrency(data.currentStatement.commonShare)}
                  </p>
                </div>
                <div className="rounded-[1.3rem] border border-[color:var(--border)] bg-[color:var(--surface-elevated)]/88 p-4">
                  <p className="text-sm text-muted">Individual</p>
                  <p className="mt-2 text-xl font-semibold text-[color:var(--foreground)]">
                    {formatCurrency(data.currentStatement.individualTotal)}
                  </p>
                </div>
                <div className="rounded-[1.3rem] border border-[color:var(--border)] bg-[color:var(--surface-elevated)]/88 p-4">
                  <p className="text-sm text-muted">Previous due</p>
                  <p className="mt-2 text-xl font-semibold text-[color:var(--foreground)]">
                    {formatCurrency(data.currentStatement.previousDue)}
                  </p>
                </div>
              </div>
              <a href={`/api/statements/${data.currentStatement.id}/pdf`}>
                <Button>
                  <Download className="mr-2 h-4 w-4" />
                  Download PDF
                </Button>
              </a>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Recent notifications</CardTitle>
                <CardDescription>{data.unreadNotifications} unread</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {data.notifications.slice(0, 4).map((notification) => (
                  <div key={notification.id} className="rounded-xl surface-subtle p-4">
                    <p className="font-medium text-[color:var(--foreground)]">{notification.title}</p>
                    <p className="mt-2 text-sm text-muted">{notification.message}</p>
                    <p className="mt-2 text-xs text-muted">{formatDateTime(notification.createdAt)}</p>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent payments</CardTitle>
                <CardDescription>Latest recorded transactions for your flat.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {data.payments.slice(0, 5).map((payment) => (
                  <div key={payment.id} className="rounded-xl surface-subtle p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-medium text-[color:var(--foreground)]">
                        {formatCurrency(payment.amount)}
                      </p>
                      <p className="text-sm text-muted">{formatDateTime(payment.paymentDate)}</p>
                    </div>
                    <p className="mt-2 text-sm text-muted">
                      {payment.paymentMethod.replace("_", " ")}
                    </p>
                  </div>
                ))}
                <Link href="/history">
                  <Button variant="secondary">View full history</Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      ) : (
        <Card>
          <CardContent className="p-5 text-sm text-muted">
            No published statements are available for this flat yet.
          </CardContent>
        </Card>
      )}
    </div>
  );
}

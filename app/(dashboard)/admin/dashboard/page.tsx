import Link from "next/link";

import { MetricPanel } from "@/components/shared/metric-panel";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getAdminDashboardData } from "@/lib/data-service";
import { formatCurrency, formatDateTime, getMonthLabel } from "@/lib/utils";

export default async function AdminDashboardPage() {
  const data = await getAdminDashboardData();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-end gap-3">
        <Link href={`/admin/bills/new?month=${data.draftPeriod.month}&year=${data.draftPeriod.year}`}>
          <Button>Open billing</Button>
        </Link>
        <Link href="/admin/payments">
          <Button variant="secondary">Record payments</Button>
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <MetricPanel
          label="Latest month"
          value={
            data.latestPeriod
              ? getMonthLabel(data.latestPeriod.month, data.latestPeriod.year)
              : "Not published"
          }
          tone="primary"
          detail="Most recently published billing period available to residents."
          valueClassName="text-xl sm:text-2xl"
        />
        <MetricPanel
          label="Active flats"
          value={data.flatCount}
          tone="neutral"
          detail="Flats marked active and included in current billing operations."
          valueClassName="text-xl sm:text-2xl"
        />
        <MetricPanel
          label="Collected"
          value={formatCurrency(data.summary.totalCollected)}
          tone="success"
          detail="Payments recorded for the latest published cycle."
          valueClassName="text-xl sm:text-2xl"
        />
        <MetricPanel
          label="Remaining"
          value={formatCurrency(data.summary.outstanding)}
          tone="danger"
          detail="Remaining unpaid balance in the latest published cycle."
          valueClassName="text-xl sm:text-2xl"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Remaining Bills</CardTitle>
            <CardDescription><br /></CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.topBalances.length === 0 ? (
              <div className="rounded-xl surface-subtle p-4 text-sm text-muted">
                No outstanding balances yet.
              </div>
            ) : (
              data.topBalances.map((entry) => (
                <div
                  key={entry.statement.id}
                  className="flex items-center justify-between rounded-xl surface-subtle p-4"
                >
                  <div>
                    <p className="font-medium text-[color:var(--foreground)]">
                      {entry.flat?.flatNumber} · {entry.flat?.ownerName}
                    </p>
                    <p className="text-sm text-muted">
                      {formatCurrency(entry.balance)} balance
                    </p>
                  </div>
                  <StatusBadge status={entry.statement.paymentStatus} />
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent payments</CardTitle>
            <CardDescription><br /></CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.recentPayments.length === 0 ? (
              <div className="rounded-xl surface-subtle p-4 text-sm text-muted">
                No payments recorded yet.
              </div>
            ) : (
              data.recentPayments.map((payment) => (
                <div key={payment.id} className="rounded-xl surface-subtle p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium text-[color:var(--foreground)]">
                      {formatCurrency(payment.amount)}
                    </p>
                    <p className="text-sm text-muted">{formatDateTime(payment.paymentDate)}</p>
                  </div>
                  <p className="mt-2 text-sm text-muted">
                    {payment.flat?.flatNumber} · {payment.flat?.ownerName}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

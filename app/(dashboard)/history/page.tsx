import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent } from "@/components/ui/card";
import { requireRole } from "@/lib/auth/session";
import { getBillingHistoryData } from "@/lib/data-service";
import { formatCurrency, getMonthLabel } from "@/lib/utils";

export default async function HistoryPage() {
  const user = await requireRole("user");
  const data = await getBillingHistoryData(user.id);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Resident"
        title="Bill history"
        description="Recent billing cycles for your flat."
      />

      <Card>
        <CardContent className="overflow-x-auto p-5">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-[color:var(--border)] text-muted">
                <th className="px-3 py-3 font-medium">Period</th>
                <th className="px-3 py-3 font-medium">Common</th>
                <th className="px-3 py-3 font-medium">Individual</th>
                <th className="px-3 py-3 font-medium">Previous due</th>
                <th className="px-3 py-3 font-medium">Total due</th>
                <th className="px-3 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {data.history.map((statement) => (
                <tr key={statement.id} className="border-b border-[color:var(--border)] last:border-0">
                  <td className="px-3 py-3 font-medium text-[color:var(--foreground)]">
                    {getMonthLabel(statement.month, statement.year)}
                  </td>
                  <td className="px-3 py-3 text-muted">{formatCurrency(statement.commonShare)}</td>
                  <td className="px-3 py-3 text-muted">{formatCurrency(statement.individualTotal)}</td>
                  <td className="px-3 py-3 text-muted">{formatCurrency(statement.previousDue)}</td>
                  <td className="px-3 py-3 text-muted">{formatCurrency(statement.totalDue)}</td>
                  <td className="px-3 py-3">
                    <StatusBadge status={statement.paymentStatus} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

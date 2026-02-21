import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";
import DataTable from "@/components/DataTable";
import DownloadStatementPdfButton from "@/components/DownloadStatementPdfButton";
import MonthPicker from "@/components/MonthPicker";
import StatusBadge from "@/components/StatusBadge";
import { formatMonthLabel, getCurrentMonthStart } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

type StatementWithMonth = {
  cycle_id: string;
  opening_due: number;
  new_charges: number;
  paid_amount: number;
  closing_due: number;
  status: string;
  billing_cycles: {
    month: string;
    status: "draft" | "published" | "locked";
  };
};

type StatementHistoryRow = {
  closing_due: number;
  status: string;
  billing_cycles: {
    month: string;
  };
};

type BreakdownRow = {
  category_name: string;
  charge_type: string;
  amount: number;
};

type SnapshotStatementRow = {
  id: string;
  cycle_id: string;
  opening_due: number;
  new_charges: number;
  paid_amount: number;
  closing_due: number;
  status: string;
  line_items: BreakdownRow[] | null;
};

export default async function MyStatementPage() {
  noStore();
  const profile = await requireProfile();
  const supabase = createClient();

  if (!profile.flat_id) {
    return (
      <section className="card">
        <h1>My Statement</h1>
        <p className="muted">Your account is not linked to a flat yet.</p>
      </section>
    );
  }

  const currentMonth = getCurrentMonthStart();

  const { data: statementData } = await supabase
    .from("statements")
    .select(
      "cycle_id, opening_due, new_charges, paid_amount, closing_due, status, billing_cycles!inner(month, status)"
    )
    .eq("flat_id", profile.flat_id)
    .eq("billing_cycles.month", currentMonth)
    .maybeSingle();

  const { data: historyData } = await supabase
    .from("statements")
    .select("closing_due, status, billing_cycles!inner(month)")
    .eq("flat_id", profile.flat_id)
    .order("month", { foreignTable: "billing_cycles", ascending: false })
    .limit(12);

  const statement = (statementData as StatementWithMonth | null) ?? null;
  const { data: snapshotData } =
    statement && statement.billing_cycles.status === "locked"
      ? await supabase
          .from("statement_snapshots")
          .select("id, cycle_id, opening_due, new_charges, paid_amount, closing_due, status, line_items")
          .eq("cycle_id", statement.cycle_id)
          .eq("flat_id", profile.flat_id)
          .maybeSingle()
      : { data: null };
  const snapshot = (snapshotData as SnapshotStatementRow | null) ?? null;
  const summary = snapshot
    ? {
        opening_due: snapshot.opening_due,
        new_charges: snapshot.new_charges,
        paid_amount: snapshot.paid_amount,
        closing_due: snapshot.closing_due,
        status: snapshot.status
      }
    : statement;
  const history = (historyData as StatementHistoryRow[] | null) ?? [];
  const { data: breakdownData } = summary && !snapshot && statement
    ? await supabase.rpc("get_my_statement_breakdown", { p_cycle_id: statement.cycle_id })
    : { data: null };
  const breakdown = snapshot
    ? (snapshot.line_items ?? [])
    : ((breakdownData as BreakdownRow[] | null) ?? []);
  const outstandingDue = summary ? Math.max(Number(summary.closing_due), 0) : 0;
  const carryCredit = summary ? Math.abs(Math.min(Number(summary.closing_due), 0)) : 0;
  const monthOptions = history.map((item) => ({
    value: item.billing_cycles.month.slice(0, 7),
    label: formatMonthLabel(item.billing_cycles.month)
  }));

  return (
    <section className="stack">
      <div className="spaced">
        <div>
          <h1>My Statement</h1>
          <p className="muted">Current month: {formatMonthLabel(currentMonth)}</p>
        </div>
        <div className="row print-hidden">
          {summary ? (
            <DownloadStatementPdfButton
              title={`Statement-${currentMonth}`}
              label={snapshot ? "Download Final Invoice PDF" : "Download PDF"}
            />
          ) : null}
          {monthOptions.length > 0 ? (
            <MonthPicker
              options={monthOptions}
              selected={monthOptions[0].value}
              basePath="/me"
            />
          ) : null}
        </div>
      </div>

      {summary ? (
        <div className="card stack">
          <div className="spaced">
            <h3 style={{ margin: 0 }}>Current Statement Summary</h3>
            <StatusBadge status={summary.status} />
          </div>
          {snapshot ? (
            <p className="muted" style={{ margin: 0 }}>
              Final locked invoice snapshot ID: {snapshot.id}
            </p>
          ) : null}
          <div className="row">
            <strong>Opening Due:</strong> <span>{formatMoney(summary.opening_due)}</span>
          </div>
          <div className="row">
            <strong>New Charges:</strong> <span>{formatMoney(summary.new_charges)}</span>
          </div>
          <div className="row">
            <strong>Paid Amount:</strong> <span>{formatMoney(summary.paid_amount)}</span>
          </div>
          <div className="row">
            <strong>Closing Due:</strong> <span>{formatMoney(summary.closing_due)}</span>
          </div>
          <div className="row">
            <strong>Outstanding Due:</strong> <span>{formatMoney(outstandingDue)}</span>
          </div>
          <div className="row">
            <strong>Carry Credit:</strong> <span>{formatMoney(carryCredit)}</span>
          </div>
          <div className="stack">
            <h4 style={{ margin: 0 }}>{snapshot ? "Final Invoice Line Items" : "Bill Criteria Breakdown"}</h4>
            <DataTable
              rows={breakdown}
              columns={[
                {
                  id: "category_name",
                  header: "Criteria",
                  cell: (row) => row.category_name
                },
                {
                  id: "charge_type",
                  header: "Type",
                  cell: (row) => row.charge_type
                },
                {
                  id: "amount",
                  header: "Amount",
                  cell: (row) => formatMoney(row.amount)
                }
              ]}
              emptyText="No charge line items found for this statement."
            />
          </div>
          <div className="row">
            <strong>Total Bill Amount:</strong> <span>{formatMoney(summary.new_charges)}</span>
          </div>
        </div>
      ) : (
        <div className="card">
          <p className="muted">No statement is published for your flat in the current month yet.</p>
        </div>
      )}

      <DataTable
        rows={history}
        columns={[
          {
            id: "month",
            header: "Month",
            cell: (row) => (
              <Link href={`/me/${row.billing_cycles.month.slice(0, 7)}`}>
                {formatMonthLabel(row.billing_cycles.month)}
              </Link>
            )
          },
          {
            id: "status",
            header: "Status",
            cell: (row) => <StatusBadge status={row.status} />
          },
          {
            id: "closing_due",
            header: "Closing Due",
            cell: (row) => formatMoney(row.closing_due)
          }
        ]}
        emptyText="No statement history yet."
      />
    </section>
  );
}

import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";
import DataTable from "@/components/DataTable";
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
      "cycle_id, opening_due, new_charges, paid_amount, closing_due, status, billing_cycles!inner(month)"
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
  const history = (historyData as StatementHistoryRow[] | null) ?? [];
  const { data: breakdownData } = statement
    ? await supabase.rpc("get_my_statement_breakdown", { p_cycle_id: statement.cycle_id })
    : { data: null };
  const breakdown = (breakdownData as BreakdownRow[] | null) ?? [];
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
        {monthOptions.length > 0 ? (
          <MonthPicker
            options={monthOptions}
            selected={monthOptions[0].value}
            basePath="/me"
          />
        ) : null}
      </div>

      {statement ? (
        <div className="card stack">
          <div className="spaced">
            <h3 style={{ margin: 0 }}>Current Statement Summary</h3>
            <StatusBadge status={statement.status} />
          </div>
          <div className="row">
            <strong>Opening Due:</strong> <span>{formatMoney(statement.opening_due)}</span>
          </div>
          <div className="row">
            <strong>New Charges:</strong> <span>{formatMoney(statement.new_charges)}</span>
          </div>
          <div className="row">
            <strong>Paid Amount:</strong> <span>{formatMoney(statement.paid_amount)}</span>
          </div>
          <div className="row">
            <strong>Closing Due:</strong> <span>{formatMoney(statement.closing_due)}</span>
          </div>
          <div className="stack">
            <h4 style={{ margin: 0 }}>Bill Criteria Breakdown</h4>
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
            <strong>Total Bill Amount:</strong> <span>{formatMoney(statement.new_charges)}</span>
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

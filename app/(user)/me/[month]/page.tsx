import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";
import { notFound } from "next/navigation";
import DataTable from "@/components/DataTable";
import StatusBadge from "@/components/StatusBadge";
import { formatMonthLabel, parseMonthParam } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

type StatementRow = {
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

type BreakdownRow = {
  category_name: string;
  charge_type: string;
  amount: number;
};

export default async function StatementByMonthPage({
  params
}: {
  params: { month: string };
}) {
  noStore();
  const profile = await requireProfile();
  const supabase = createClient();

  if (!profile.flat_id) {
    notFound();
  }

  const month = parseMonthParam(params.month);
  if (!month) {
    notFound();
  }

  const { data } = await supabase
    .from("statements")
    .select(
      "cycle_id, opening_due, new_charges, paid_amount, closing_due, status, billing_cycles!inner(month)"
    )
    .eq("flat_id", profile.flat_id)
    .eq("billing_cycles.month", month)
    .maybeSingle();

  const statement = (data as StatementRow | null) ?? null;
  const { data: breakdownData } = statement
    ? await supabase.rpc("get_my_statement_breakdown", { p_cycle_id: statement.cycle_id })
    : { data: null };
  const breakdown = (breakdownData as BreakdownRow[] | null) ?? [];

  return (
    <section className="stack">
      <div className="spaced">
        <div>
          <h1>Statement Details</h1>
          <p className="muted">{formatMonthLabel(month)}</p>
        </div>
        <Link href="/me">Back to My Statement</Link>
      </div>
      {statement ? (
        <div className="card stack">
          <div className="spaced">
            <h3 style={{ margin: 0 }}>Monthly Summary</h3>
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
          <p className="muted">No statement found for this month.</p>
        </div>
      )}
    </section>
  );
}

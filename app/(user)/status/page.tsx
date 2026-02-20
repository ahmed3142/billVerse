import DataTable from "@/components/DataTable";
import StatusBadge from "@/components/StatusBadge";
import { getCurrentMonthStart, formatMonthLabel } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

type PublicStatusBoardRow = {
  month: string;
  flat_no: string;
  status: string;
};

type AdminStatusBoardRow = {
  status: string;
  closing_due: number;
  flats: {
    flat_no: string;
  } | null;
  billing_cycles: {
    month: string;
  } | null;
};

export default async function StatusPage() {
  const profile = await requireProfile();
  const supabase = createClient();
  const currentMonth = getCurrentMonthStart();

  if (profile.role === "admin") {
    const { data } = await supabase
      .from("statements")
      .select("status, closing_due, flats!inner(flat_no), billing_cycles!inner(month, status)")
      .eq("billing_cycles.month", currentMonth)
      .in("billing_cycles.status", ["published", "locked"]);

    const rows = ((data as AdminStatusBoardRow[] | null) ?? [])
      .map((item) => ({
        month: item.billing_cycles?.month ?? currentMonth,
        flat_no: item.flats?.flat_no ?? "-",
        status: item.status,
        closing_due: item.closing_due
      }))
      .sort((a, b) => a.flat_no.localeCompare(b.flat_no, undefined, { numeric: true }));

    return (
      <section className="stack">
        <div>
          <h1>Status Board</h1>
          <p className="muted">
            Current month only ({formatMonthLabel(currentMonth)}). Admin view includes due amount.
          </p>
        </div>
        <DataTable
          rows={rows}
          columns={[
            { id: "flat_no", header: "Flat", cell: (row) => row.flat_no },
            { id: "status", header: "Status", cell: (row) => <StatusBadge status={row.status} /> },
            { id: "closing_due", header: "Due Amount", cell: (row) => formatMoney(row.closing_due) }
          ]}
          emptyText="No published statements found for the current month."
        />
      </section>
    );
  }

  const { data } = await supabase
    .from("public_status_board")
    .select("month, flat_no, status")
    .eq("month", currentMonth);

  const rows = ((data as PublicStatusBoardRow[] | null) ?? []).sort((a, b) =>
    a.flat_no.localeCompare(b.flat_no, undefined, { numeric: true })
  );

  return (
    <section className="stack">
      <div>
        <h1>Status Board</h1>
        <p className="muted">
          Current month only ({formatMonthLabel(currentMonth)}). Amounts are hidden.
        </p>
      </div>
      <DataTable
        rows={rows}
        columns={[
          { id: "flat_no", header: "Flat", cell: (row) => row.flat_no },
          { id: "status", header: "Status", cell: (row) => <StatusBadge status={row.status} /> }
        ]}
        emptyText="No published statements found for the current month."
      />
    </section>
  );
}

import DataTable from "@/components/DataTable";
import StatusBadge from "@/components/StatusBadge";
import { getCurrentMonthStart, formatMonthLabel } from "@/lib/dates";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

type StatusBoardRow = {
  month: string;
  flat_no: string;
  status: string;
};

export default async function StatusPage() {
  await requireProfile();
  const supabase = createClient();
  const currentMonth = getCurrentMonthStart();

  const { data } = await supabase
    .from("public_status_board")
    .select("month, flat_no, status")
    .eq("month", currentMonth)
    .order("flat_no");

  const rows = (data as StatusBoardRow[] | null) ?? [];

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

import DataTable from "@/components/DataTable";
import MonthQueryPicker from "@/components/MonthQueryPicker";
import StatusBadge from "@/components/StatusBadge";
import { getCurrentMonthStart, formatMonthLabel, parseMonthParam } from "@/lib/dates";
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

export default async function StatusPage({
  searchParams
}: {
  searchParams?: { month?: string };
}) {
  const profile = await requireProfile();
  const supabase = createClient();
  const currentMonth = getCurrentMonthStart();
  const requestedMonth = searchParams?.month ? parseMonthParam(searchParams.month) : null;

  const { data: monthsData } = await supabase
    .from("billing_cycles")
    .select("month")
    .in("status", ["published", "locked"])
    .order("month", { ascending: false });

  const monthOptions = Array.from(
    new Set(((monthsData as { month: string }[] | null) ?? []).map((item) => item.month))
  ).map((month) => ({
    value: month.slice(0, 7),
    label: formatMonthLabel(month)
  }));

  const selectedMonth =
    requestedMonth && monthOptions.some((option) => `${option.value}-01` === requestedMonth)
      ? requestedMonth
      : monthOptions[0]
        ? `${monthOptions[0].value}-01`
        : currentMonth;

  if (profile.role === "admin") {
    const { data } = await supabase
      .from("statements")
      .select("status, closing_due, flats!inner(flat_no), billing_cycles!inner(month, status)")
      .eq("billing_cycles.month", selectedMonth)
      .in("billing_cycles.status", ["published", "locked"]);

    const rows = ((data as AdminStatusBoardRow[] | null) ?? [])
      .map((item) => ({
        month: item.billing_cycles?.month ?? selectedMonth,
        flat_no: item.flats?.flat_no ?? "-",
        status: item.status,
        closing_due: item.closing_due
      }))
      .sort((a, b) => a.flat_no.localeCompare(b.flat_no, undefined, { numeric: true }));

    return (
      <section className="stack">
        <div className="spaced">
          <div>
            <h1>Status Board</h1>
            <p className="muted">
              Selected month: {formatMonthLabel(selectedMonth)}. Admin view includes due amount.
            </p>
          </div>
          {monthOptions.length > 0 ? (
            <MonthQueryPicker options={monthOptions} selected={selectedMonth.slice(0, 7)} path="/status" />
          ) : null}
        </div>
        <DataTable
          rows={rows}
          columns={[
            { id: "flat_no", header: "Flat", cell: (row) => row.flat_no },
            { id: "status", header: "Status", cell: (row) => <StatusBadge status={row.status} /> },
            { id: "closing_due", header: "Due Amount", cell: (row) => formatMoney(row.closing_due) }
          ]}
          emptyText="No published statements found for the selected month."
        />
      </section>
    );
  }

  const { data } = await supabase
    .from("public_status_board")
    .select("month, flat_no, status")
    .eq("month", selectedMonth);

  const rows = ((data as PublicStatusBoardRow[] | null) ?? []).sort((a, b) =>
    a.flat_no.localeCompare(b.flat_no, undefined, { numeric: true })
  );

  return (
    <section className="stack">
      <div className="spaced">
        <div>
          <h1>Status Board</h1>
          <p className="muted">
            Selected month: {formatMonthLabel(selectedMonth)}. Amounts are hidden.
          </p>
        </div>
        {monthOptions.length > 0 ? (
          <MonthQueryPicker options={monthOptions} selected={selectedMonth.slice(0, 7)} path="/status" />
        ) : null}
      </div>
      <DataTable
        rows={rows}
        columns={[
          { id: "flat_no", header: "Flat", cell: (row) => row.flat_no },
          { id: "status", header: "Status", cell: (row) => <StatusBadge status={row.status} /> }
        ]}
        emptyText="No published statements found for the selected month."
      />
    </section>
  );
}

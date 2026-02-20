import DataTable from "@/components/DataTable";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

type AuditRow = {
  id: number;
  table_name: string;
  record_id: string | null;
  action: string;
  actor_user_id: string | null;
  created_at: string;
};

export default async function AuditPage() {
  await requireAdmin();
  const supabase = createClient();

  const { data } = await supabase
    .from("audit_log")
    .select("id, table_name, record_id, action, actor_user_id, created_at")
    .order("id", { ascending: false })
    .limit(250);

  const rows = (data as AuditRow[] | null) ?? [];

  return (
    <section className="stack">
      <div>
        <h1>Audit Log</h1>
        <p className="muted">Tracks inserts, updates, and deletes for financially sensitive tables.</p>
      </div>
      <DataTable
        rows={rows}
        columns={[
          { id: "id", header: "ID", cell: (row) => row.id },
          { id: "table", header: "Table", cell: (row) => row.table_name },
          { id: "record", header: "Record ID", cell: (row) => row.record_id ?? "-" },
          { id: "action", header: "Action", cell: (row) => row.action.toUpperCase() },
          { id: "actor", header: "Actor", cell: (row) => row.actor_user_id ?? "-" },
          {
            id: "created_at",
            header: "Timestamp",
            cell: (row) => new Date(row.created_at).toLocaleString()
          }
        ]}
        emptyText="No audit events yet."
      />
    </section>
  );
}

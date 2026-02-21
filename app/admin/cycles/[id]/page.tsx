import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import AutoDismissNotice from "@/components/AutoDismissNotice";
import DataTable from "@/components/DataTable";
import StatusBadge from "@/components/StatusBadge";
import { formatMonthLabel } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

type BillingCycle = {
  id: string;
  month: string;
  status: "draft" | "published" | "locked";
  published_at: string | null;
  locked_at: string | null;
};

type StatementStatusRow = {
  status: string;
  opening_due: number;
  new_charges: number;
  paid_amount: number;
  closing_due: number;
};

type TimelineRow = {
  id: number;
  table_name: string;
  action: string;
  actor_user_id: string | null;
  created_at: string;
  summary: string;
};

export default async function CycleDashboardPage({
  params,
  searchParams
}: {
  params: { id: string };
  searchParams?: { saved?: string };
}) {
  await requireAdmin();
  const supabase = createClient();

  async function publishCycle() {
    "use server";
    const supabase = createClient();
    await supabase.rpc("publish_cycle", { p_cycle_id: params.id });
    // Email notifications are intentionally disabled in app flow.

    revalidatePath(`/admin/cycles/${params.id}`);
    revalidatePath("/status");
    revalidatePath("/me");
    revalidatePath("/me", "layout");
    redirect(`/admin/cycles/${params.id}?saved=published`);
  }

  async function recalculateCycle() {
    "use server";
    const supabase = createClient();
    const { error } = await supabase.rpc("recalculate_cycle", { p_cycle_id: params.id });
    if (error) {
      redirect(`/admin/cycles/${params.id}?saved=recalculate_blocked`);
    }
    revalidatePath(`/admin/cycles/${params.id}`);
    revalidatePath("/status");
    revalidatePath("/me");
    revalidatePath("/me", "layout");
    redirect(`/admin/cycles/${params.id}?saved=recalculated`);
  }

  async function lockCycle() {
    "use server";
    const supabase = createClient();
    const { error } = await supabase.rpc("lock_cycle", { p_cycle_id: params.id });
    if (error) {
      redirect(`/admin/cycles/${params.id}?saved=lock_blocked`);
    }
    revalidatePath(`/admin/cycles/${params.id}`);
    revalidatePath("/me");
    revalidatePath("/me", "layout");
    redirect(`/admin/cycles/${params.id}?saved=locked`);
  }

  async function resendEmails() {
    "use server";
    // Email notifications are intentionally disabled in app flow.
    revalidatePath(`/admin/cycles/${params.id}`);
    redirect(`/admin/cycles/${params.id}?saved=emails_disabled`);
  }

  const { data: cycleData } = await supabase
    .from("billing_cycles")
    .select("id, month, status, published_at, locked_at")
    .eq("id", params.id)
    .maybeSingle();

  const cycle = (cycleData as BillingCycle | null) ?? null;

  if (!cycle) {
    notFound();
  }

  const [
    { data: statementRows },
    { count: commonChargesCount },
    { count: individualChargesCount },
    { count: paymentsCount },
    { count: activeFlatsCount },
    { data: snapshotsData },
    { data: timelineData }
  ] = await Promise.all([
    supabase
      .from("statements")
      .select("status, opening_due, new_charges, paid_amount, closing_due")
      .eq("cycle_id", cycle.id),
    supabase
      .from("common_charges")
      .select("id", { count: "exact", head: true })
      .eq("cycle_id", cycle.id),
    supabase
      .from("individual_charges")
      .select("id", { count: "exact", head: true })
      .eq("cycle_id", cycle.id),
    supabase
      .from("payments")
      .select("id", { count: "exact", head: true })
      .eq("cycle_id", cycle.id),
    supabase.from("flats").select("id", { count: "exact", head: true }).eq("is_active", true),
    supabase.from("cycle_snapshots").select("id").eq("cycle_id", cycle.id).limit(1),
    supabase.rpc("get_cycle_timeline", { p_cycle_id: cycle.id })
  ]);

  const statementMetrics = (statementRows as StatementStatusRow[] | null) ?? [];
  const timelineRows = (timelineData as TimelineRow[] | null) ?? [];

  const statuses = statementMetrics.reduce(
    (acc, item) => {
      acc.total += 1;
      if (item.status === "paid") acc.paid += 1;
      if (item.status === "partial") acc.partial += 1;
      if (item.status === "due") acc.due += 1;
      return acc;
    },
    { total: 0, paid: 0, partial: 0, due: 0 }
  );

  const totals = statementMetrics.reduce(
    (acc, item) => {
      acc.openingDue += Number(item.opening_due ?? 0);
      acc.newCharges += Number(item.new_charges ?? 0);
      acc.paid += Number(item.paid_amount ?? 0);
      acc.closingDue += Number(item.closing_due ?? 0);
      return acc;
    },
    { openingDue: 0, newCharges: 0, paid: 0, closingDue: 0 }
  );

  const outstandingDue = statementMetrics.reduce((sum, item) => sum + Math.max(Number(item.closing_due), 0), 0);
  const creditBalance = statementMetrics.reduce((sum, item) => sum + Math.abs(Math.min(Number(item.closing_due), 0)), 0);
  const formulaCheck = Number((totals.openingDue + totals.newCharges - totals.paid - totals.closingDue).toFixed(2));
  const formulaBalanced = Math.abs(formulaCheck) <= 0.01;
  const snapshotCreated = ((snapshotsData as { id: string }[] | null) ?? []).length > 0;
  const commonReady = (commonChargesCount ?? 0) > 0;
  const statementCoverageReady = (activeFlatsCount ?? 0) > 0 && statuses.total === (activeFlatsCount ?? 0);
  const closeReady = cycle.status === "published" && commonReady && statementCoverageReady && formulaBalanced;
  const saved = searchParams?.saved;
  const savedMessage =
    saved === "published"
      ? "Cycle published successfully. Email notifications are disabled."
      : saved === "recalculated"
        ? "Cycle recalculated successfully."
        : saved === "recalculate_blocked"
          ? "Locked cycles cannot be recalculated."
        : saved === "lock_blocked"
          ? "Cycle cannot be locked from current status."
        : saved === "locked"
          ? "Cycle locked successfully."
          : saved === "emails_disabled"
            ? "Email notifications are disabled."
            : null;

  return (
    <section className="stack">
      <AutoDismissNotice message={savedMessage} />
      <div className="spaced">
        <div>
          <h1>Cycle Dashboard</h1>
          <p className="muted">
            {formatMonthLabel(cycle.month)} • <StatusBadge status={cycle.status} />
          </p>
        </div>
        <div className="row">
          <form action={publishCycle}>
            <button type="submit" disabled={cycle.status !== "draft"}>
              Publish
            </button>
          </form>
          <form action={recalculateCycle}>
            <button type="submit" className="secondary" disabled={cycle.status !== "published"}>
              Recalculate
            </button>
          </form>
          <form action={lockCycle}>
            <button type="submit" className="warning" disabled={cycle.status !== "published"}>
              Lock
            </button>
          </form>
          <form action={resendEmails}>
            <button type="submit" className="secondary">
              Resend Emails
            </button>
          </form>
        </div>
      </div>

      <div className="card stack">
        <h3 style={{ margin: 0 }}>Quick Links</h3>
        <div className="quick-links">
          <Link href={`/admin/cycles/${cycle.id}/common`}>Common Charges</Link>
          <Link href={`/admin/cycles/${cycle.id}/individual`}>Individual Charges</Link>
          <Link href={`/admin/cycles/${cycle.id}/payments`}>Payments</Link>
          <Link href="/admin/cycles">Back to cycles</Link>
        </div>
      </div>

      <div className="card stack">
        <h3 style={{ margin: 0 }}>Statement Status Summary</h3>
        <div className="row">
          <span>Total flats in statements: {statuses.total}</span>
          <span>Paid: {statuses.paid}</span>
          <span>Partial: {statuses.partial}</span>
          <span>Due: {statuses.due}</span>
          <span>Payments entries: {paymentsCount ?? 0}</span>
          <span>Individual entries: {individualChargesCount ?? 0}</span>
        </div>
      </div>

      <div className="card stack">
        <h3 style={{ margin: 0 }}>Calculation Summary</h3>
        <div className="summary-grid">
          <span>Total Opening Due: {formatMoney(totals.openingDue)}</span>
          <span>Total New Charges: {formatMoney(totals.newCharges)}</span>
          <span>Total Paid Amount: {formatMoney(totals.paid)}</span>
          <span>Total Closing Due: {formatMoney(totals.closingDue)}</span>
          <span>Outstanding Due (positive balances): {formatMoney(outstandingDue)}</span>
          <span>Credit Balance (negative balances): {formatMoney(creditBalance)}</span>
        </div>
        <p className="muted" style={{ margin: 0 }}>
          Formula check (opening + new - paid - closing) should be 0. Current: {formulaCheck.toFixed(2)}
        </p>
      </div>

      <div className="card stack">
        <h3 style={{ margin: 0 }}>Monthly Close Checklist</h3>
        <div className="summary-grid">
          <span>{commonReady ? "OK" : "Pending"} Common charges added</span>
          <span>{statementCoverageReady ? "OK" : "Pending"} Statements generated for all active flats</span>
          <span>{formulaBalanced ? "OK" : "Mismatch"} Formula balanced</span>
          <span>{cycle.status === "published" ? "Ready" : "Locked/Draft"} Cycle stage for closing</span>
          <span>{snapshotCreated ? "OK" : "Pending"} Final snapshot created</span>
          <span>{closeReady ? "Ready to Lock" : "Not Ready"} Lock readiness</span>
        </div>
      </div>

      <DataTable
        rows={timelineRows}
        columns={[
          { id: "created_at", header: "Time", cell: (row) => new Date(row.created_at).toLocaleString() },
          { id: "table_name", header: "Table", cell: (row) => row.table_name },
          { id: "action", header: "Action", cell: (row) => row.action },
          { id: "summary", header: "Summary", cell: (row) => row.summary },
          { id: "actor_user_id", header: "Actor", cell: (row) => row.actor_user_id ?? "-" }
        ]}
        emptyText="No activity found for this cycle yet."
      />
    </section>
  );
}

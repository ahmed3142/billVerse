import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import AutoDismissNotice from "@/components/AutoDismissNotice";
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
    await supabase
      .from("billing_cycles")
      .update({ status: "locked", locked_at: new Date().toISOString() })
      .eq("id", params.id)
      .eq("status", "published");
    revalidatePath(`/admin/cycles/${params.id}`);
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

  const { data: statementRows } = await supabase
    .from("statements")
    .select("status, opening_due, new_charges, paid_amount, closing_due")
    .eq("cycle_id", cycle.id);

  const statementMetrics = (statementRows as StatementStatusRow[] | null) ?? [];

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
  const saved = searchParams?.saved;
  const savedMessage =
    saved === "published"
      ? "Cycle published successfully. Email notifications are disabled."
      : saved === "recalculated"
        ? "Cycle recalculated successfully."
        : saved === "recalculate_blocked"
          ? "Locked cycles cannot be recalculated."
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
    </section>
  );
}

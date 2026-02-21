import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import StatusBadge from "@/components/StatusBadge";
import { formatMonthLabel } from "@/lib/dates";
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
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (baseUrl && token) {
      await fetch(`${baseUrl}/functions/v1/send-cycle-emails`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ cycleId: params.id })
      }).catch(() => null);
    }

    revalidatePath(`/admin/cycles/${params.id}`);
    revalidatePath("/status");
    revalidatePath("/me");
    redirect(`/admin/cycles/${params.id}?saved=published`);
  }

  async function recalculateCycle() {
    "use server";
    const supabase = createClient();
    await supabase.rpc("recalculate_cycle", { p_cycle_id: params.id });
    revalidatePath(`/admin/cycles/${params.id}`);
    revalidatePath("/status");
    revalidatePath("/me");
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
    const supabase = createClient();
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (baseUrl && token) {
      await fetch(`${baseUrl}/functions/v1/send-cycle-emails`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ cycleId: params.id })
      }).catch(() => null);
    }
    revalidatePath(`/admin/cycles/${params.id}`);
    redirect(`/admin/cycles/${params.id}?saved=emails`);
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
    .select("status")
    .eq("cycle_id", cycle.id);

  const statuses = ((statementRows as StatementStatusRow[] | null) ?? []).reduce(
    (acc, item) => {
      acc.total += 1;
      if (item.status === "paid") acc.paid += 1;
      if (item.status === "partial") acc.partial += 1;
      if (item.status === "due") acc.due += 1;
      return acc;
    },
    { total: 0, paid: 0, partial: 0, due: 0 }
  );
  const saved = searchParams?.saved;
  const savedMessage =
    saved === "published"
      ? "Cycle published and email notifications triggered."
      : saved === "recalculated"
        ? "Cycle recalculated successfully."
        : saved === "locked"
          ? "Cycle locked successfully."
          : saved === "emails"
            ? "Email resend triggered."
            : null;

  return (
    <section className="stack">
      {savedMessage ? <div className="card notice-success">{savedMessage}</div> : null}
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
            <button type="submit" className="secondary" disabled={cycle.status === "draft"}>
              Recalculate
            </button>
          </form>
          <form action={lockCycle}>
            <button type="submit" className="warning" disabled={cycle.status !== "published"}>
              Lock
            </button>
          </form>
          <form action={resendEmails}>
            <button type="submit" className="secondary" disabled={cycle.status === "draft"}>
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
    </section>
  );
}

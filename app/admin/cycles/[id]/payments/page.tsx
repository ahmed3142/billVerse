import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import AutoDismissNotice from "@/components/AutoDismissNotice";
import DataTable from "@/components/DataTable";
import PaymentForm from "@/components/forms/PaymentForm";
import { formatMoney } from "@/lib/money";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

type Flat = {
  id: string;
  flat_no: string;
};

type PaymentRow = {
  id: string;
  amount: number;
  paid_on: string;
  method: string | null;
  reference: string | null;
  flats: {
    flat_no: string;
  } | null;
};

export default async function PaymentsPage({
  params,
  searchParams
}: {
  params: { id: string };
  searchParams?: { saved?: string };
}) {
  const profile = await requireAdmin();
  const supabase = createClient();

  async function savePayment(formData: FormData) {
    "use server";
    const supabase = createClient();

    const flatId = String(formData.get("flat_id") || "");
    const amount = Number(formData.get("amount") || 0);
    const paidOn = String(formData.get("paid_on") || "");
    const method = String(formData.get("method") || "").trim() || null;
    const reference = String(formData.get("reference") || "").trim() || null;
    const notes = String(formData.get("notes") || "").trim() || null;

    if (!flatId || !paidOn || Number.isNaN(amount) || amount <= 0) {
      return;
    }

    await supabase.from("payments").insert({
      cycle_id: params.id,
      flat_id: flatId,
      amount,
      paid_on: paidOn,
      method,
      reference,
      notes,
      received_by: profile.user_id
    });

    revalidatePath(`/admin/cycles/${params.id}/payments`);
    redirect(`/admin/cycles/${params.id}/payments?saved=1`);
  }

  const [{ data: flatsData }, { data: paymentsData }] = await Promise.all([
    supabase.from("flats").select("id, flat_no").eq("is_active", true).order("flat_no"),
    supabase
      .from("payments")
      .select("id, amount, paid_on, method, reference, flats(flat_no)")
      .eq("cycle_id", params.id)
      .order("paid_on", { ascending: false })
  ]);

  const flats = (flatsData as Flat[] | null) ?? [];
  const rows = (paymentsData as PaymentRow[] | null) ?? [];

  return (
    <section className="stack">
      <AutoDismissNotice message={searchParams?.saved ? "Payment saved." : null} />
      <div className="spaced">
        <div>
          <h1>Payments</h1>
          <p className="muted">Payments are admin-recorded and support partial payment tracking.</p>
        </div>
        <Link href={`/admin/cycles/${params.id}`}>Back to dashboard</Link>
      </div>

      <PaymentForm flats={flats} action={savePayment} />

      <DataTable
        rows={rows}
        columns={[
          {
            id: "flat",
            header: "Flat",
            cell: (row) => row.flats?.flat_no ?? "-"
          },
          {
            id: "amount",
            header: "Amount",
            cell: (row) => formatMoney(row.amount)
          },
          {
            id: "paid_on",
            header: "Paid On",
            cell: (row) => row.paid_on
          },
          {
            id: "method",
            header: "Method",
            cell: (row) => row.method ?? "-"
          },
          {
            id: "reference",
            header: "Reference",
            cell: (row) => row.reference ?? "-"
          }
        ]}
        emptyText="No payments recorded for this cycle."
      />
    </section>
  );
}

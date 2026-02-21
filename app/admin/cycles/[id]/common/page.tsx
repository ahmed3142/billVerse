import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import DataTable from "@/components/DataTable";
import CommonChargesForm from "@/components/forms/CommonChargesForm";
import { formatMoney } from "@/lib/money";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

type Category = {
  id: string;
  name: string;
};

type CommonChargeRow = {
  id: string;
  total_amount: number;
  notes: string | null;
  charge_categories: {
    name: string;
  } | null;
};

export default async function CommonChargesPage({
  params,
  searchParams
}: {
  params: { id: string };
  searchParams?: { saved?: string };
}) {
  const profile = await requireAdmin();
  const supabase = createClient();

  async function saveCommonCharge(formData: FormData) {
    "use server";
    const supabase = createClient();

    const categoryId = String(formData.get("category_id") || "");
    const totalAmount = Number(formData.get("total_amount") || 0);
    const notes = String(formData.get("notes") || "").trim() || null;

    if (!categoryId || Number.isNaN(totalAmount)) {
      return;
    }

    await supabase.from("common_charges").upsert(
      {
        cycle_id: params.id,
        category_id: categoryId,
        total_amount: totalAmount,
        notes,
        created_by: profile.user_id
      },
      { onConflict: "cycle_id,category_id" }
    );

    revalidatePath(`/admin/cycles/${params.id}/common`);
    redirect(`/admin/cycles/${params.id}/common?saved=1`);
  }

  const [{ data: categoriesData }, { data: chargesData }] = await Promise.all([
    supabase
      .from("charge_categories")
      .select("id, name")
      .eq("type", "common")
      .eq("is_active", true)
      .order("name"),
    supabase
      .from("common_charges")
      .select("id, total_amount, notes, charge_categories(name)")
      .eq("cycle_id", params.id)
      .order("created_at", { ascending: false })
  ]);

  const categories = (categoriesData as Category[] | null) ?? [];
  const rows = (chargesData as CommonChargeRow[] | null) ?? [];

  return (
    <section className="stack">
      {searchParams?.saved ? <div className="card notice-success">Common charge saved.</div> : null}
      <div className="spaced">
        <div>
          <h1>Common Charges</h1>
          <p className="muted">Totals are split equally among active flats during statement generation.</p>
        </div>
        <Link href={`/admin/cycles/${params.id}`}>Back to dashboard</Link>
      </div>

      <CommonChargesForm categories={categories} action={saveCommonCharge} />

      <DataTable
        rows={rows}
        columns={[
          {
            id: "category",
            header: "Category",
            cell: (row) => row.charge_categories?.name ?? "-"
          },
          {
            id: "amount",
            header: "Amount",
            cell: (row) => formatMoney(row.total_amount)
          },
          {
            id: "notes",
            header: "Notes",
            cell: (row) => row.notes ?? "-"
          }
        ]}
        emptyText="No common charges for this cycle."
      />
    </section>
  );
}

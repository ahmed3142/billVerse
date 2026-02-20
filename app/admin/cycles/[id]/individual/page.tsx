import Link from "next/link";
import { revalidatePath } from "next/cache";
import IndividualChargesGrid from "@/components/forms/IndividualChargesGrid";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

type Flat = {
  id: string;
  flat_no: string;
};

type Category = {
  id: string;
  name: string;
};

type ExistingCharge = {
  flat_id: string;
  category_id: string;
  amount: number;
};

export default async function IndividualChargesPage({
  params
}: {
  params: { id: string };
}) {
  const profile = await requireAdmin();
  const supabase = createClient();

  async function saveGrid(formData: FormData) {
    "use server";
    const supabase = createClient();

    for (const [key, value] of formData.entries()) {
      if (!key.startsWith("entry::")) {
        continue;
      }

      const amountRaw = String(value).trim();
      if (amountRaw === "") {
        continue;
      }

      const [, flatId, categoryId] = key.split("::");
      const amount = Number(amountRaw);
      if (!flatId || !categoryId || Number.isNaN(amount)) {
        continue;
      }

      if (amount === 0) {
        await supabase
          .from("individual_charges")
          .delete()
          .eq("cycle_id", params.id)
          .eq("flat_id", flatId)
          .eq("category_id", categoryId);
        continue;
      }

      await supabase.from("individual_charges").upsert(
        {
          cycle_id: params.id,
          flat_id: flatId,
          category_id: categoryId,
          amount,
          created_by: profile.user_id
        },
        { onConflict: "cycle_id,flat_id,category_id" }
      );
    }

    revalidatePath(`/admin/cycles/${params.id}/individual`);
  }

  const [{ data: flatsData }, { data: categoriesData }, { data: chargesData }] = await Promise.all([
    supabase.from("flats").select("id, flat_no").eq("is_active", true).order("flat_no"),
    supabase
      .from("charge_categories")
      .select("id, name")
      .eq("type", "individual")
      .eq("is_active", true)
      .order("name"),
    supabase
      .from("individual_charges")
      .select("flat_id, category_id, amount")
      .eq("cycle_id", params.id)
  ]);

  const flats = (flatsData as Flat[] | null) ?? [];
  const categories = (categoriesData as Category[] | null) ?? [];
  const existing = (chargesData as ExistingCharge[] | null) ?? [];

  const values = existing.reduce<Record<string, string>>((acc, item) => {
    acc[`${item.flat_id}:${item.category_id}`] = String(item.amount);
    return acc;
  }, {});

  return (
    <section className="stack">
      <div className="spaced">
        <div>
          <h1>Individual Charges</h1>
          <p className="muted">Enter per-flat category amounts for this cycle.</p>
        </div>
        <Link href={`/admin/cycles/${params.id}`}>Back to dashboard</Link>
      </div>

      <IndividualChargesGrid
        flats={flats}
        categories={categories}
        values={values}
        action={saveGrid}
      />
    </section>
  );
}

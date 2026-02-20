import { revalidatePath } from "next/cache";
import DataTable from "@/components/DataTable";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

type CategoryRow = {
  id: string;
  name: string;
  type: "common" | "individual";
  is_active: boolean;
};

export default async function CategoriesPage() {
  await requireAdmin();
  const supabase = createClient();

  async function addCategory(formData: FormData) {
    "use server";
    const supabase = createClient();
    const name = String(formData.get("name") || "").trim();
    const type = String(formData.get("type") || "").trim();

    if (!name || !["common", "individual"].includes(type)) {
      return;
    }

    await supabase.from("charge_categories").upsert(
      {
        name,
        type,
        is_active: true
      },
      { onConflict: "name,type" }
    );

    revalidatePath("/admin/categories");
  }

  const { data } = await supabase
    .from("charge_categories")
    .select("id, name, type, is_active")
    .order("type")
    .order("name");

  const categories = (data as CategoryRow[] | null) ?? [];

  return (
    <section className="stack">
      <div>
        <h1>Charge Categories</h1>
        <p className="muted">Add, organize, and activate common or individual billing criteria.</p>
      </div>

      <form action={addCategory} className="card row">
        <div style={{ minWidth: 220 }}>
          <label htmlFor="name">Name</label>
          <input id="name" name="name" required />
        </div>
        <div style={{ minWidth: 190 }}>
          <label htmlFor="type">Type</label>
          <select id="type" name="type" defaultValue="common">
            <option value="common">Common</option>
            <option value="individual">Individual</option>
          </select>
        </div>
        <div style={{ alignSelf: "end" }}>
          <button type="submit">Add Category</button>
        </div>
      </form>

      <DataTable
        rows={categories}
        columns={[
          { id: "name", header: "Name", cell: (row) => row.name },
          { id: "type", header: "Type", cell: (row) => row.type },
          {
            id: "active",
            header: "Active",
            cell: (row) => (row.is_active ? "Yes" : "No")
          }
        ]}
        emptyText="No categories yet."
      />
    </section>
  );
}

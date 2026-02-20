import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

type FlatRow = {
  id: string;
  flat_no: string;
  is_active: boolean;
};

export default async function FlatsPage() {
  await requireAdmin();
  const supabase = createClient();

  async function addFlat(formData: FormData) {
    "use server";
    const supabase = createClient();
    const flatNo = String(formData.get("flat_no") || "")
      .trim()
      .toUpperCase();

    if (!/^[A-Z]+[0-9]+$/.test(flatNo)) {
      return;
    }

    await supabase.from("flats").upsert(
      {
        flat_no: flatNo,
        is_active: true
      },
      { onConflict: "flat_no" }
    );

    revalidatePath("/admin/flats");
  }

  async function toggleFlatStatus(formData: FormData) {
    "use server";
    const supabase = createClient();
    const flatId = String(formData.get("flat_id") || "");
    const current = String(formData.get("is_active") || "") === "true";

    if (!flatId) {
      return;
    }

    await supabase.from("flats").update({ is_active: !current }).eq("id", flatId);
    revalidatePath("/admin/flats");
  }

  const { data } = await supabase.from("flats").select("id, flat_no, is_active");
  const flats = ((data as FlatRow[] | null) ?? []).sort((a, b) =>
    a.flat_no.localeCompare(b.flat_no, undefined, { numeric: true })
  );

  return (
    <section className="stack">
      <div>
        <h1>Flats</h1>
        <p className="muted">
          Use IDs like A1, A2, A3. Common charges are split only across active flats.
        </p>
      </div>

      <form action={addFlat} className="card row">
        <div style={{ minWidth: 220 }}>
          <label htmlFor="flat_no">Flat ID</label>
          <input id="flat_no" name="flat_no" placeholder="A1" required />
        </div>
        <div style={{ alignSelf: "end" }}>
          <button type="submit">Add Flat</button>
        </div>
      </form>

      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Flat</th>
              <th>Active</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {flats.length > 0 ? (
              flats.map((flat) => (
                <tr key={flat.id}>
                  <td>{flat.flat_no}</td>
                  <td>{flat.is_active ? "Yes" : "No"}</td>
                  <td>
                    <form action={toggleFlatStatus}>
                      <input type="hidden" name="flat_id" value={flat.id} />
                      <input type="hidden" name="is_active" value={String(flat.is_active)} />
                      <button type="submit" className={flat.is_active ? "warning" : "secondary"}>
                        {flat.is_active ? "Set Inactive" : "Set Active"}
                      </button>
                    </form>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={3} className="muted">
                  No flats found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

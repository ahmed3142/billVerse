import Link from "next/link";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatMonthLabel } from "@/lib/dates";

type BillingCycle = {
  id: string;
  month: string;
  status: "draft" | "published" | "locked";
  published_at: string | null;
  locked_at: string | null;
};

export default async function CyclesPage() {
  const profile = await requireAdmin();
  const supabase = createClient();

  async function createCycle(formData: FormData) {
    "use server";

    const monthInput = String(formData.get("month") || "").trim();
    if (!/^\d{4}-\d{2}$/.test(monthInput)) {
      return;
    }

    const supabase = createClient();
    await supabase.from("billing_cycles").insert({
      month: `${monthInput}-01`,
      status: "draft",
      created_by: profile.user_id
    });

    revalidatePath("/admin/cycles");
  }

  const { data } = await supabase
    .from("billing_cycles")
    .select("id, month, status, published_at, locked_at")
    .order("month", { ascending: false });

  const cycles = (data as BillingCycle[] | null) ?? [];

  return (
    <section className="stack">
      <div className="spaced">
        <div>
          <h1>Billing Cycles</h1>
          <p className="muted">Create monthly cycles in draft, then publish and recalculate as needed.</p>
        </div>
      </div>

      <form action={createCycle} className="card row">
        <div style={{ minWidth: 220 }}>
          <label htmlFor="month">Month</label>
          <input id="month" name="month" type="month" required />
        </div>
        <div style={{ alignSelf: "end" }}>
          <button type="submit">Create Cycle</button>
        </div>
      </form>

      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Month</th>
              <th>Status</th>
              <th>Published</th>
              <th>Locked</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {cycles.length > 0 ? (
              cycles.map((cycle) => (
                <tr key={cycle.id}>
                  <td>{formatMonthLabel(cycle.month)}</td>
                  <td>{cycle.status}</td>
                  <td>{cycle.published_at ? new Date(cycle.published_at).toLocaleString() : "-"}</td>
                  <td>{cycle.locked_at ? new Date(cycle.locked_at).toLocaleString() : "-"}</td>
                  <td>
                    <Link href={`/admin/cycles/${cycle.id}`}>Open</Link>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="muted">
                  No cycles yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export default async function AdminLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const profile = await requireAdmin();

  async function signOut() {
    "use server";
    const supabase = createClient();
    await supabase.auth.signOut();
    redirect("/login");
  }

  return (
    <section className="stack">
      <header className="spaced card">
        <div>
          <h2 style={{ margin: 0 }}>Admin Panel</h2>
          <p className="muted" style={{ margin: 0 }}>
            {profile.email ?? profile.user_id}
          </p>
        </div>
        <nav className="nav">
          <Link href="/admin/cycles">Cycles</Link>
          <Link href="/admin/categories">Categories</Link>
          <Link href="/admin/flats">Flats</Link>
          <Link href="/admin/audit">Audit</Link>
          <Link href="/status">Status Board</Link>
          <form action={signOut}>
            <button type="submit" className="secondary">
              Sign out
            </button>
          </form>
        </nav>
      </header>
      {children}
    </section>
  );
}

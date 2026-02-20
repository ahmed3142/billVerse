import Link from "next/link";
import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export default async function UserLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const profile = await requireProfile();

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
          <h2 style={{ margin: 0 }}>Building Bill Manager</h2>
          <p className="muted" style={{ margin: 0 }}>
            Signed in as {profile.email ?? profile.user_id} ({profile.role})
          </p>
        </div>
        <nav className="nav">
          <Link href="/me">My Statement</Link>
          <Link href="/status">Status Board</Link>
          {profile.role === "admin" ? <Link href="/admin/cycles">Admin Panel</Link> : null}
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

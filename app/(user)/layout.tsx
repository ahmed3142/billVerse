import Link from "next/link";
import { redirect } from "next/navigation";
import CollapsibleHeaderOptions from "@/components/CollapsibleHeaderOptions";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export default async function UserLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const profile = await requireProfile();
  const supabase = createClient();

  const { data: flat } = profile.flat_id
    ? await supabase.from("flats").select("flat_no").eq("id", profile.flat_id).maybeSingle()
    : { data: null };
  const signedInAs = flat?.flat_no ?? profile.user_id;

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
          <h2 style={{ margin: 0 }}>1Bill</h2>
          <p className="muted" style={{ margin: 0 }}>
            Signed in as {signedInAs} ({profile.role})
          </p>
        </div>
        <CollapsibleHeaderOptions>
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
        </CollapsibleHeaderOptions>
      </header>
      {children}
      <nav className="bottom-nav">
        <Link href="/me">Dashboard</Link>
        <Link href="/me">My Bills</Link>
        <Link href="/status">Compare</Link>
        <Link href="/reset-password">Settings</Link>
      </nav>
    </section>
  );
}

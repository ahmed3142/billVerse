import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function HomePage() {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();

  if (profile?.role === "admin") {
    redirect("/admin/cycles");
  }

  if (profile?.role === "user") {
    redirect("/me");
  }

  return (
    <section className="stack">
      <h1>Building Bill Manager</h1>
      <p className="muted">
        Your account does not have an assigned role yet. Ask an administrator to
        complete profile setup.
      </p>
      <div className="row">
        <Link href="/login">Return to Login</Link>
      </div>
    </section>
  );
}

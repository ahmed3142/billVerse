import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type AppRole = "admin" | "user";

export type AppProfile = {
  user_id: string;
  flat_id: string | null;
  role: AppRole;
  full_name: string | null;
  email: string | null;
};

export async function getCurrentUser() {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  return user ?? null;
}

export async function getCurrentProfile(): Promise<AppProfile | null> {
  const user = await getCurrentUser();

  if (!user) {
    return null;
  }

  const supabase = createClient();
  const { data } = await supabase
    .from("profiles")
    .select("user_id, flat_id, role, full_name, email")
    .eq("user_id", user.id)
    .maybeSingle();

  return (data as AppProfile | null) ?? null;
}

export async function requireProfile() {
  const profile = await getCurrentProfile();
  if (!profile) {
    redirect("/login");
  }
  return profile;
}

export async function requireAdmin() {
  const profile = await requireProfile();
  if (profile.role !== "admin") {
    redirect("/me");
  }
  return profile;
}

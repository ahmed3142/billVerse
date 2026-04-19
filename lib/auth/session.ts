import { cache } from "react";
import { redirect } from "next/navigation";

import { isSupabaseConfigured } from "@/lib/supabase/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { SessionUser, UserRole } from "@/types/domain";

interface UserProfileRow {
  role: UserRole;
  flat_id: string | null;
}

interface FlatRow {
  flat_number: string;
  owner_name: string;
}

function formatUserName(email?: string | null) {
  if (!email) {
    return "User";
  }

  return email.split("@")[0].replace(/[._-]+/g, " ");
}

export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: profile } = await supabase
    .from("users")
    .select("role, flat_id")
    .eq("id", user.id)
    .maybeSingle<UserProfileRow>();

  if (!profile) {
    return null;
  }

  let flat: FlatRow | null = null;

  if (profile.flat_id) {
    const { data: flatRow } = await supabase
      .from("flats")
      .select("flat_number, owner_name")
      .eq("id", profile.flat_id)
      .maybeSingle<FlatRow>();

    flat = flatRow ?? null;
  }

  return {
    id: user.id,
    email: user.email ?? "",
    role: profile.role,
    flatId: profile.flat_id ?? undefined,
    flatNumber: flat?.flat_number,
    fullName:
      (typeof user.user_metadata.full_name === "string" && user.user_metadata.full_name) ||
      flat?.owner_name ||
      formatUserName(user.email),
  };
});

export async function requireSession() {
  const user = await getSessionUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}

export async function requireRole(role: UserRole | UserRole[]) {
  const allowedRoles = Array.isArray(role) ? role : [role];
  const user = await requireSession();

  if (!allowedRoles.includes(user.role)) {
    redirect(user.role === "admin" ? "/admin/dashboard" : "/dashboard");
  }

  return user;
}

export function getHomePath(user: Pick<SessionUser, "role">) {
  return user.role === "admin" ? "/admin/dashboard" : "/dashboard";
}

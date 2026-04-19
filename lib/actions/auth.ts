"use server";

import { redirect } from "next/navigation";

import { getHomePath, getSessionUser } from "@/lib/auth/session";
import { getSiteUrl } from "@/lib/site-url";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { loginSchema, passwordResetRequestSchema, passwordUpdateSchema } from "@/lib/validators";

export interface AuthActionState {
  error?: string;
  success?: string;
}

function getAuthMode(formData: FormData) {
  const mode = formData.get("mode");
  return mode === "signup" ? "signup" : "login";
}

export async function authAction(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  if (!isSupabaseConfigured()) {
    return {
      error: "Supabase is not configured yet. Add the required environment variables first.",
    };
  }

  const mode = getAuthMode(formData);
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: "Enter a valid email address and password." };
  }

  const supabase = await createSupabaseServerClient();

  if (mode === "signup") {
    const fullName = String(formData.get("fullName") ?? "").trim();
    const siteUrl = await getSiteUrl();
    const { error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        data: {
          full_name: fullName,
        },
        emailRedirectTo: `${siteUrl}/auth/confirm?next=/dashboard`,
      },
    });

    if (error) {
      return { error: error.message };
    }

    return {
      success:
        "Account created. Check your email to confirm your address, then sign in.",
    };
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error || !data.user) {
    return { error: error?.message ?? "Unable to sign in." };
  }

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", data.user.id)
    .maybeSingle<{ role: "admin" | "user" }>();

  if (!profile) {
    await supabase.auth.signOut();
    return {
      error:
        "This account does not have an app profile yet. Create the matching public.users record first.",
    };
  }

  redirect(getHomePath(profile));
}

export async function logoutAction() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function requestPasswordResetAction(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  if (!isSupabaseConfigured()) {
    return {
      error: "Supabase is not configured yet. Add the required environment variables first.",
    };
  }

  const parsed = passwordResetRequestSchema.safeParse({
    email: formData.get("email"),
  });

  if (!parsed.success) {
    return { error: "Enter a valid email address." };
  }

  const supabase = await createSupabaseServerClient();
  const siteUrl = await getSiteUrl();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${siteUrl}/auth/confirm?next=/reset-password/update`,
  });

  if (error) {
    return { error: error.message };
  }

  return {
    success: "Password reset email sent. Check your inbox for the recovery link.",
  };
}

export async function updatePasswordAction(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  if (!isSupabaseConfigured()) {
    return {
      error: "Supabase is not configured yet. Add the required environment variables first.",
    };
  }

  const parsed = passwordUpdateSchema.safeParse({
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    return {
      error:
        parsed.error.issues[0]?.message ?? "Enter a password with at least 8 characters.",
    };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });

  if (error) {
    return { error: error.message };
  }

  const user = await getSessionUser();

  if (user) {
    redirect(getHomePath(user));
  }

  redirect("/login");
}

"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { updatePasswordAction, type AuthActionState } from "@/lib/actions/auth";

const initialState: AuthActionState = {};

export function UpdatePasswordForm() {
  const [state, formAction, isPending] = useActionState(updatePasswordAction, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <label className="block space-y-2">
        <span className="text-sm font-medium text-[color:var(--foreground)]">New password</span>
        <Input name="password" type="password" placeholder="Create a new password" required />
      </label>

      <label className="block space-y-2">
        <span className="text-sm font-medium text-[color:var(--foreground)]">Confirm password</span>
        <Input
          name="confirmPassword"
          type="password"
          placeholder="Repeat the new password"
          required
        />
      </label>

      {state?.error ? (
        <div className="rounded-xl border border-[color:rgba(239,68,68,0.25)] bg-[color:rgba(239,68,68,0.12)] px-3 py-2 text-sm text-[color:var(--danger)]">
          {state.error}
        </div>
      ) : null}

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? "Updating..." : "Update password"}
      </Button>
    </form>
  );
}

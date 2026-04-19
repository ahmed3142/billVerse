"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { requestPasswordResetAction, type AuthActionState } from "@/lib/actions/auth";

const initialState: AuthActionState = {};

export function ResetPasswordRequestForm() {
  const [state, formAction, isPending] = useActionState(
    requestPasswordResetAction,
    initialState,
  );

  return (
    <form action={formAction} className="space-y-4">
      <label className="block space-y-2">
        <span className="text-sm font-medium text-[color:var(--foreground)]">Email</span>
        <Input name="email" type="email" placeholder="you@example.com" required />
      </label>

      {state?.error ? (
        <div className="rounded-xl border border-[color:rgba(239,68,68,0.25)] bg-[color:rgba(239,68,68,0.12)] px-3 py-2 text-sm text-[color:var(--danger)]">
          {state.error}
        </div>
      ) : null}

      {state?.success ? (
        <div className="rounded-xl border border-[color:rgba(16,185,129,0.25)] bg-[color:rgba(16,185,129,0.12)] px-3 py-2 text-sm text-[color:var(--success)]">
          {state.success}
        </div>
      ) : null}

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? "Sending..." : "Send recovery email"}
      </Button>
    </form>
  );
}

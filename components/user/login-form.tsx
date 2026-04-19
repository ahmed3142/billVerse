"use client";

import Link from "next/link";
import { Eye, EyeOff, TriangleAlert } from "lucide-react";
import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authAction, type AuthActionState } from "@/lib/actions/auth";
import { cn } from "@/lib/utils";

const initialState: AuthActionState = {};

type AuthMode = "login" | "signup";

type FormValues = {
  fullName: string;
  email: string;
  password: string;
};

function getValidationErrors(mode: AuthMode, values: FormValues) {
  const errors: Partial<Record<keyof FormValues, string>> = {};
  const trimmedEmail = values.email.trim();

  if (mode === "signup" && values.fullName.trim().length < 2) {
    errors.fullName = "Enter the resident name shown on the building record.";
  }

  if (!trimmedEmail) {
    errors.email = "Enter your email address.";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
    errors.email = "Enter a valid email address.";
  }

  if (!values.password) {
    errors.password = "Enter your password.";
  } else if (values.password.length < 8) {
    errors.password = "Use at least 8 characters.";
  }

  return errors;
}

export function LoginForm() {
  const [mode, setMode] = useState<AuthMode>("login");
  const [showPassword, setShowPassword] = useState(false);
  const [capsLockOn, setCapsLockOn] = useState(false);
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);
  const [touchedFields, setTouchedFields] = useState<Record<keyof FormValues, boolean>>({
    fullName: false,
    email: false,
    password: false,
  });
  const [values, setValues] = useState<FormValues>({
    fullName: "",
    email: "",
    password: "",
  });
  const [state, formAction, isPending] = useActionState(authAction, initialState);

  const validationErrors = getValidationErrors(mode, values);
  const hasValidationErrors = Object.keys(validationErrors).length > 0;

  useEffect(() => {
    if (state?.error) {
      toast.error(state.error);
    }

    if (state?.success) {
      toast.success(state.success);
    }
  }, [state?.error, state?.success]);

  function markTouched(field: keyof FormValues) {
    setTouchedFields((current) => ({ ...current, [field]: true }));
  }

  function shouldShowError(field: keyof FormValues) {
    return Boolean(validationErrors[field] && (touchedFields[field] || attemptedSubmit));
  }

  function updateValue(field: keyof FormValues, nextValue: string) {
    setValues((current) => ({ ...current, [field]: nextValue }));
  }

  function handleModeChange(nextMode: AuthMode) {
    setMode(nextMode);
    setAttemptedSubmit(false);
    setCapsLockOn(false);
  }

  return (
    <form
      action={formAction}
      className="space-y-5"
      onSubmit={(event) => {
        setAttemptedSubmit(true);

        if (hasValidationErrors) {
          event.preventDefault();
          toast.error("Please fix the highlighted fields first.");
        }
      }}
    >
      <input type="hidden" name="mode" value={mode} readOnly />

      <div className="grid grid-cols-2 gap-2 rounded-[1.35rem] border border-[color:var(--border-strong)] bg-[color:var(--surface-elevated)]/85 p-1.5">
        <button
          type="button"
          onClick={() => handleModeChange("login")}
          className={cn(
            "rounded-[1rem] px-3 py-2.5 text-sm font-semibold",
            mode === "login"
              ? "bg-[linear-gradient(135deg,var(--primary),var(--accent))] text-[color:var(--primary-foreground)] shadow-[var(--shadow-soft)]"
              : "text-muted hover:bg-[color:var(--surface)] hover:text-[color:var(--foreground)]",
          )}
        >
          Sign in
        </button>
        <button
          type="button"
          onClick={() => handleModeChange("signup")}
          className={cn(
            "rounded-[1rem] px-3 py-2.5 text-sm font-semibold",
            mode === "signup"
              ? "bg-[linear-gradient(135deg,var(--primary),var(--accent))] text-[color:var(--primary-foreground)] shadow-[var(--shadow-soft)]"
              : "text-muted hover:bg-[color:var(--surface)] hover:text-[color:var(--foreground)]",
          )}
        >
          Create account
        </button>
      </div>

      {mode === "signup" ? (
        <label className="block space-y-2">
          <span className="text-sm font-semibold text-[color:var(--foreground)]">Full name</span>
          <Input
            name="fullName"
            placeholder="Resident name"
            value={values.fullName}
            onChange={(event) => updateValue("fullName", event.target.value)}
            onBlur={() => markTouched("fullName")}
            aria-invalid={shouldShowError("fullName")}
          />
          {shouldShowError("fullName") ? (
            <p className="text-sm text-[color:var(--danger)]">{validationErrors.fullName}</p>
          ) : (
            <p className="text-sm text-muted">Use the same name attached to the flat assignment.</p>
          )}
        </label>
      ) : null}

      <label className="block space-y-2">
        <span className="text-sm font-semibold text-[color:var(--foreground)]">Email</span>
        <Input
          name="email"
          type="email"
          placeholder="you@example.com"
          required
          value={values.email}
          onChange={(event) => updateValue("email", event.target.value)}
          onBlur={() => markTouched("email")}
          aria-invalid={shouldShowError("email")}
        />
        {shouldShowError("email") ? (
          <p className="text-sm text-[color:var(--danger)]">{validationErrors.email}</p>
        ) : (
          <p className="text-sm text-muted">
            Use the address already assigned to your resident or admin account.
          </p>
        )}
      </label>

      <label className="block space-y-2">
        <span className="text-sm font-semibold text-[color:var(--foreground)]">Password</span>
        <div className="relative">
          <Input
            name="password"
            type={showPassword ? "text" : "password"}
            placeholder={mode === "login" ? "Enter your password" : "Create a password"}
            required
            value={values.password}
            onChange={(event) => updateValue("password", event.target.value)}
            onBlur={() => {
              markTouched("password");
              setCapsLockOn(false);
            }}
            onKeyDown={(event) => setCapsLockOn(event.getModifierState("CapsLock"))}
            onKeyUp={(event) => setCapsLockOn(event.getModifierState("CapsLock"))}
            onFocus={() => setCapsLockOn(false)}
            aria-invalid={shouldShowError("password")}
            className="pr-12"
          />
          <button
            type="button"
            onClick={() => setShowPassword((current) => !current)}
            className="absolute right-3 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-muted hover:bg-[color:var(--surface-elevated)] hover:text-[color:var(--foreground)]"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>

        {capsLockOn ? (
          <div className="flex items-start gap-2 rounded-[1rem] border status-partial px-3 py-2 text-sm">
            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
            <span>Caps Lock looks like it is on.</span>
          </div>
        ) : null}

        {shouldShowError("password") ? (
          <p className="text-sm text-[color:var(--danger)]">{validationErrors.password}</p>
        ) : (
          <p className="text-sm text-muted">
            Passwords must be at least 8 characters long.
          </p>
        )}
      </label>

      {state?.error ? (
        <div className="rounded-[1.25rem] border status-pending px-4 py-3 text-sm text-[color:var(--danger)]">
          {state.error}
        </div>
      ) : null}

      {state?.success ? (
        <div className="rounded-[1.25rem] border status-paid px-4 py-3 text-sm text-[color:var(--success)]">
          {state.success}
        </div>
      ) : null}

      <div className="space-y-3 pt-1">
        <Button type="submit" className="w-full" size="lg" disabled={isPending}>
          {isPending ? "Please wait..." : mode === "login" ? "Sign in" : "Create account"}
        </Button>
        <p className="text-center text-sm text-muted">
          {mode === "login"
            ? "Primary access for admins and residents."
            : "New accounts must use the email already linked to a flat."}
        </p>
      </div>

      {mode === "login" ? (
        <div className="text-right">
          <Link href="/reset-password" className="text-sm font-semibold text-[color:var(--primary)]">
            Forgot password?
          </Link>
        </div>
      ) : null}
    </form>
  );
}

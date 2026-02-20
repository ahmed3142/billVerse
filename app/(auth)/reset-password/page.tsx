"use client";

import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);
    const supabase = createClient();

    const redirectTo =
      typeof window !== "undefined" ? `${window.location.origin}/login` : undefined;

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo
    });

    if (resetError) {
      setError(resetError.message);
      setLoading(false);
      return;
    }

    setMessage("Password reset email sent.");
    setLoading(false);
  }

  return (
    <section className="stack" style={{ maxWidth: 440, margin: "36px auto" }}>
      <div>
        <h1>Reset password</h1>
        <p className="muted">Enter your account email to receive a reset link.</p>
      </div>
      <form className="card stack" onSubmit={onSubmit}>
        <div>
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </div>
        {error ? <p style={{ color: "#b91c1c" }}>{error}</p> : null}
        {message ? <p style={{ color: "#166534" }}>{message}</p> : null}
        <div className="spaced">
          <a href="/login" className="muted">
            Back to login
          </a>
          <button type="submit" disabled={loading}>
            {loading ? "Sending..." : "Send reset link"}
          </button>
        </div>
      </form>
    </section>
  );
}

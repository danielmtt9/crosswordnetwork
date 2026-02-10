"use client";

import { useState } from "react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    const res = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    setLoading(false);
    const data = await res.json().catch(() => ({} as any));
    setMessage(data?.message || (res.ok ? "If that email exists, a reset link was sent." : "Unable to process."));
  }

  return (
    <div className="container mx-auto max-w-md px-4 py-16">
      <h1 className="mb-6 text-2xl font-semibold">Forgot password</h1>
      <form onSubmit={onSubmit} className="space-y-4">
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-md border border-border bg-background px-3 py-2"
          required
        />
        <button type="submit" disabled={loading} className="w-full rounded-md bg-primary px-4 py-2 text-primary-foreground">
          {loading ? "Sending..." : "Send reset link"}
        </button>
      </form>
      {message ? <p className="mt-4 text-sm text-muted-foreground">{message}</p> : null}
    </div>
  );
}



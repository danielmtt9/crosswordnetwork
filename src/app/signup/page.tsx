"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";

export default function SignUpPage() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, name, password }),
    });
    setLoading(false);
    const data = await res.json().catch(() => ({} as any));
    setMessage(data?.message || (res.ok ? "Check your email to verify your account." : "Unable to sign up."));
  }

  return (
    <div className="container mx-auto max-w-md px-4 py-16">
      <h1 className="mb-6 text-2xl font-semibold">Create your account</h1>
      <form onSubmit={onSubmit} className="space-y-4">
        <input
          type="text"
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-md border border-border bg-background px-3 py-2"
        />
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-md border border-border bg-background px-3 py-2"
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-md border border-border bg-background px-3 py-2"
          required
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-primary px-4 py-2 text-primary-foreground"
        >
          {loading ? "Creating..." : "Create account"}
        </button>
      </form>
      {message ? <p className="mt-4 text-sm text-muted-foreground">{message}</p> : null}
      <div className="mt-6">
        <button
          onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
          className="w-full rounded-md border border-border bg-background px-4 py-2"
        >
          Sign up with Google
        </button>
      </div>
    </div>
  );
}



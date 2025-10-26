"use client";

import { signIn } from "next-auth/react";
import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";

export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const searchParams = useSearchParams();

  useEffect(() => {
    const message = searchParams.get('message');
    if (message) {
      setSuccessMessage(message);
    }
  }, [searchParams]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await signIn("credentials", { redirect: false, email, password });
    setLoading(false);
    if (res?.error) setError("Invalid email or password");
    else if (res?.ok) window.location.href = "/";
  }

  return (
    <div className="container mx-auto max-w-md px-4 py-16">
      <h1 className="mb-6 text-2xl font-semibold">Sign in</h1>
      <form onSubmit={onSubmit} className="space-y-4">
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
        {error ? <p className="text-sm text-red-500">{error}</p> : null}
        {successMessage ? <p className="text-sm text-green-500">{successMessage}</p> : null}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-primary px-4 py-2 text-primary-foreground"
        >
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </form>
      <div className="mt-6">
        <button
          onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
          className="w-full rounded-md border border-border bg-background px-4 py-2"
        >
          Continue with Google
        </button>
      </div>
    </div>
  );
}



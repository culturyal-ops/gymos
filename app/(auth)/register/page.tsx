"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { motion } from "framer-motion";
import { getBrowserSupabase } from "@/lib/supabase/browser";

export default function RegisterPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleRegister(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const gymName = formData.get("gymName") as string;
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    const supabase = getBrowserSupabase();

    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({ email, password });
    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) {
      setError(signInError.message);
      setLoading(false);
      return;
    }

    const userId = signInData.user?.id ?? signUpData.user?.id;
    if (!userId) {
      setError("Could not get user ID. Please try signing in.");
      setLoading(false);
      return;
    }

    const res = await fetch("/api/auth/register-gym", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ gymName, userId }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      setError(errData.error || "Failed to provision gym.");
      setLoading(false);
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[--color-bg] p-4">
      {/* Background glow */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-0 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[--color-gold] opacity-[0.04] blur-[120px]" />
        <div className="absolute bottom-0 left-0 h-[400px] w-[400px] -translate-x-1/3 translate-y-1/3 rounded-full bg-[--color-green] opacity-[0.03] blur-[100px]" />
      </div>

      <motion.div
        className="relative z-10 w-full max-w-sm"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
      >
        {/* Logo */}
        <div className="mb-8 text-center">
          <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[--color-gold] shadow-[0_0_40px_rgba(201,168,76,0.3)]">
            <span className="font-display text-2xl font-black text-black">G</span>
          </div>
          <h1 className="font-display text-3xl font-bold tracking-tight">
            Gym<span className="text-[--color-gold]">OS</span>
          </h1>
          <p className="mt-1.5 text-xs uppercase tracking-[0.2em] text-[--color-text-muted]">
            Revenue Engine
          </p>
        </div>

        {/* Card */}
        <div className="card p-6 sm:p-8">
          <h2 className="mb-1 font-display text-lg font-bold">Create your gym</h2>
          <p className="mb-6 text-sm text-[--color-text-secondary]">
            Set up your dashboard in seconds
          </p>

          <form onSubmit={handleRegister} className="space-y-4">
            <Input
              name="gymName"
              label="Gym Name"
              placeholder="Titan Fitness"
              required
              autoComplete="organization"
            />
            <Input
              name="email"
              label="Email"
              placeholder="owner@gym.com"
              type="email"
              required
              autoComplete="email"
            />
            <Input
              name="password"
              label="Password"
              placeholder="••••••••"
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
            />

            {error && (
              <div className="flex items-start gap-2 rounded-[--radius-md] bg-[--color-red-dim] px-3 py-2.5">
                <span className="mt-0.5 text-xs text-[--color-red]">⚠</span>
                <p className="text-xs text-[--color-red]">{error}</p>
              </div>
            )}

            <Button
              variant="primary"
              type="submit"
              className="mt-2 w-full py-3 text-sm"
              disabled={loading}
            >
              {loading ? "Creating…" : "Create Account & Dashboard"}
            </Button>
          </form>

          <div className="mt-6 border-t border-[--color-border] pt-5 text-center">
            <p className="text-sm text-[--color-text-secondary]">
              Already have an account?{" "}
              <Link
                href="/login"
                className="font-medium text-[--color-gold] hover:underline"
              >
                Sign In
              </Link>
            </p>
          </div>
        </div>

        <p className="mt-6 text-center text-[10px] uppercase tracking-[0.18em] text-[--color-text-muted]">
          Secured by GymOS Infrastructure
        </p>
      </motion.div>
    </main>
  );
}

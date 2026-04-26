"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { motion } from "framer-motion";
import { getBrowserSupabase } from "@/lib/supabase/browser";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleLogin(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    const supabase = getBrowserSupabase();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    if (email === "reception@gym.com" || email.includes("reception")) {
      router.push("/reception");
    } else {
      router.push("/");
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[--color-bg] p-6">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-[radial-gradient(circle_at_center,var(--color-gold-dim),transparent_70%)] opacity-20" />
      </div>

      <motion.section 
        className="card w-full max-w-md p-10 relative z-10"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
      >
        <div className="text-center mb-8">
          <h1 className="font-display text-4xl font-bold tracking-tight">
            Gym<span className="text-[--color-gold]">OS</span>
          </h1>
          <p className="mt-2 text-sm text-[--color-text-secondary] uppercase tracking-widest">
            The Revenue Engine
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <Input
            name="email"
            label="Email Address"
            placeholder="owner@gym.com"
            type="email"
            required
          />
          <Input
            name="password"
            label="Password"
            placeholder="••••••••"
            type="password"
            required
          />

          {error && (
            <p className="rounded-[--radius-sm] bg-[--color-red-dim] px-3 py-2 text-xs text-[--color-red]">
              {error}
            </p>
          )}

          <Button variant="primary" type="submit" className="w-full py-4 text-base" disabled={loading}>
            {loading ? "Authenticating..." : "Sign In to Dashboard"}
          </Button>
        </form>

        <div className="mt-8 pt-6 border-t border-[--color-border] text-center">
          <p className="text-xs text-[--color-text-muted]">
            Forgot your password? Contact system administrator.
          </p>
        </div>
      </motion.section>

      <div className="fixed bottom-8 text-[10px] text-[--color-text-muted] uppercase tracking-[0.2em]">
        Secured by GymOS Infrastructure
      </div>
    </main>
  );
}

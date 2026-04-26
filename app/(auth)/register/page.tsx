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
    
    // 1. Sign up the user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    if (!authData.user) {
      setError("Registration failed. Please try again.");
      setLoading(false);
      return;
    }

    // 2. Provision their gym
    const res = await fetch("/api/auth/register-gym", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ gymName }),
    });

    if (!res.ok) {
      const errData = await res.json();
      setError(errData.error || "Failed to provision gym tenant.");
      setLoading(false);
      return;
    }

    // 3. Navigate to dashboard
    router.push("/");
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
            Register<span className="text-[--color-gold]"> Gym</span>
          </h1>
          <p className="mt-2 text-sm text-[--color-text-secondary] uppercase tracking-widest">
            Join the Revenue Engine
          </p>
        </div>

        <form onSubmit={handleRegister} className="space-y-6">
          <Input
            name="gymName"
            label="Gym Name"
            placeholder="Titan Fitness"
            type="text"
            required
          />
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
            minLength={6}
          />

          {error && (
            <p className="rounded-[--radius-sm] bg-[--color-red-dim] px-3 py-2 text-xs text-[--color-red]">
              {error}
            </p>
          )}

          <Button variant="primary" type="submit" className="w-full py-4 text-base" disabled={loading}>
            {loading ? "Creating Account..." : "Create Account & Dashboard"}
          </Button>
        </form>

        <div className="mt-8 pt-6 border-t border-[--color-border] text-center">
          <p className="text-sm text-[--color-text-secondary]">
            Already have an account?{" "}
            <Link href="/login" className="text-[--color-gold] hover:underline font-medium">
              Sign In
            </Link>
          </p>
        </div>
      </motion.section>

      <div className="fixed bottom-8 text-[10px] text-[--color-text-muted] uppercase tracking-[0.2em]">
        Secured by GymOS Infrastructure
      </div>
    </main>
  );
}

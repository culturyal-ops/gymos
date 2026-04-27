/**
 * lib/logger.ts
 * Lightweight error logger.
 *
 * - In production: forwards to Sentry (if SENTRY_DSN is set) via a fire-and-
 *   forget fetch so it never blocks the request path.
 * - Always: writes to the `error_log` table for the super-admin health dashboard.
 * - Never throws — logging must not break the caller.
 */

import { getAdminSupabase } from "@/lib/supabase/admin";
import { db } from "@/lib/supabase/typed-client";

export interface LogErrorOptions {
  gymId?: string;
  context?: string;
  extra?: Record<string, unknown>;
}

export async function logError(
  error: unknown,
  options: LogErrorOptions = {}
): Promise<void> {
  const message =
    error instanceof Error ? error.message : String(error);
  const stack =
    error instanceof Error ? error.stack : undefined;

  // 1. Console — always
  console.error(`[GymOS Error]${options.context ? ` [${options.context}]` : ""}`, message, options.extra ?? "");

  // 2. Sentry — fire-and-forget
  const dsn = process.env.SENTRY_DSN;
  if (dsn) {
    try {
      await fetch("https://sentry.io/api/store/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Sentry-Auth": `Sentry sentry_version=7, sentry_key=${dsn.split("@")[0].split("//")[1]}`,
        },
        body: JSON.stringify({
          message,
          level: "error",
          platform: "node",
          extra: { stack, ...options.extra },
          tags: { gym_id: options.gymId, context: options.context },
        }),
      });
    } catch {
      // Sentry failure must never propagate
    }
  }

  // 3. Supabase error_log table — best-effort
  try {
    const supabase = getAdminSupabase();
    await db(supabase).from("error_log").insert({
      gym_id: options.gymId ?? null,
      context: options.context ?? null,
      message,
      stack: stack ?? null,
      extra: options.extra ?? null,
    });
  } catch {
    // DB failure must never propagate
  }
}

/**
 * Typed Supabase client wrapper.
 *
 * Since we don't have generated types from `supabase gen types`, every
 * `.from("table")` call returns `never` for tables TypeScript doesn't know
 * about. This helper casts the client to `any` once, giving us a fully
 * functional client without sprinkling `as any` everywhere.
 *
 * TODO: run `npx supabase gen types typescript --linked > lib/supabase/database.types.ts`
 * and replace this file with a properly typed client.
 */

import { type SupabaseClient } from "@supabase/supabase-js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function db(supabase: SupabaseClient<any>): SupabaseClient<any> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return supabase as SupabaseClient<any>;
}

import { createServerClient } from "@supabase/ssr";

export async function getServerSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() { return []; },
      setAll() {}
    }
  });
}

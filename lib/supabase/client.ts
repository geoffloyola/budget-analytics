import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/lib/supabase/types";

// Client-side Supabase client — use inside "use client" components.
// Reads the public URL + anon key, both safe to expose to the browser;
// row-level security (members only, see supabase/migrations) is what
// actually decides who can read or write what.
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

import "server-only";

import { createClient } from "@supabase/supabase-js";

function requireEnv(name: string, value: string | undefined): string {
  if (!value || value.trim().length === 0) {
    throw new Error(`Missing ${name}. Set it in the server environment only (see .env.example).`);
  }
  return value;
}

/**
 * Trusted server-only client using the secret (service role) key. Bypasses RLS.
 * Do not use for routine user-facing requests once RLS is enforced; prefer
 * {@link createServerSupabaseClient} with the user session.
 */
export function createAdminSupabaseClient() {
  const url = requireEnv("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL);
  const serviceRoleKey = requireEnv(
    "SUPABASE_SERVICE_ROLE_KEY",
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  );

  return createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

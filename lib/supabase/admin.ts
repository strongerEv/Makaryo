import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Klien service role — melewati RLS.
 * HANYA boleh dipanggil dari server action atau route handler,
 * tidak pernah dari komponen yang terkirim ke browser.
 */
export function createAdminClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY belum diatur di environment.");
  }

  return createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

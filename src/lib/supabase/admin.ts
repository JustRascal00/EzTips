import "server-only";

import { createClient } from "@supabase/supabase-js";
import { supabaseUrl } from "./config";

/** Server-only client with the secret key. Bypasses RLS: only use after checking the user yourself. */
export function createAdminClient() {
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!supabaseUrl || !secret) return null;
  return createClient(supabaseUrl, secret, { auth: { persistSession: false, autoRefreshToken: false } });
}

import { listTips } from "@/lib/tips";
import { createClient as createBrowserClient } from "./client";

/** @deprecated use listTips() from "@/lib/tips". Kept so older imports keep working. */
export async function fetchCommunityVideos() {
  const supabase = createBrowserClient();
  if (!supabase) return [];
  return listTips(supabase, { limit: 100 });
}

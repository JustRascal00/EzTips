import "server-only";

import { getTipBySlug } from "@/lib/tips";
import { createClient } from "./server";

export async function getCommunityVideoBySlug(slug: string) {
  const supabase = await createClient();
  if (!supabase) return undefined;
  return getTipBySlug(supabase, slug);
}

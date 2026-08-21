import "server-only";

import { createClient } from "./server";
import { videoRowToTutorial, type ProfileSummary, type VideoRow } from "./video";

const videoSelect = "id,user_id,slug,title,description,game_id,category,topic,character,tags,skill_level,duration_seconds,video_url,thumbnail_url,views,likes_count,comments_count,created_at,profiles!videos_user_id_fkey(username,display_name,avatar_url)";

export async function getCommunityVideoBySlug(slug: string) {
  const supabase = await createClient();
  if (!supabase) return undefined;
  const { data, error } = await supabase
    .from("videos")
    .select(videoSelect)
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();
  if (error || !data) return undefined;
  return videoRowToTutorial(data as unknown as VideoRow & { profiles?: ProfileSummary | null });
}

import { createClient as createBrowserClient } from "./client";
import { videoRowToTutorial, type VideoRow } from "./video";

const videoSelect = "id,user_id,slug,title,description,game_id,category,topic,character,tags,skill_level,duration_seconds,video_url,thumbnail_url,views,likes_count,comments_count,created_at,profiles!videos_user_id_fkey(username,display_name,avatar_url)";

export async function fetchCommunityVideos() {
  const supabase = createBrowserClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("videos")
    .select(videoSelect)
    .eq("status", "published")
    .eq("visibility", "public")
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw error;
  return ((data ?? []) as unknown as VideoRow[]).map(videoRowToTutorial);
}

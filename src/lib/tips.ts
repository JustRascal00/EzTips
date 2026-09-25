// Tip (video) queries. Works with both the browser and the server Supabase client.
import type { SupabaseClient } from "@supabase/supabase-js";
import { ENABLED_GAME_IDS } from "@/data/games";
import { championSplashUrl } from "@/lib/ddragon/shared";
import type { SkillLevel, Tutorial } from "@/lib/types";

export const TIP_SELECT = [
  "id,user_id,slug,title,description,game_id,category,topic,character,tags,skill_level,duration_seconds",
  "video_url,thumbnail_url,views,likes_count,comments_count,created_at,champion_id,role_id,map_id",
  "upvotes,downvotes,score,learning_metadata",
  // computed columns from migration 005
  "still_works_pct,still_works_yes,still_works_no,is_outdated,patches_behind",
  "profiles!videos_user_id_fkey(username,display_name,avatar_url)",
  "champions(id,name)",
  "patches(version,is_current)",
].join(",");

type One<T> = T | T[] | null | undefined;
const first = <T,>(value: One<T>): T | undefined => (Array.isArray(value) ? value[0] : value ?? undefined);

export type TipRow = {
  id: string;
  user_id: string;
  slug: string;
  title: string;
  description: string | null;
  game_id: string;
  category: string;
  topic: string | null;
  character: string | null;
  tags: string[] | null;
  skill_level: string;
  duration_seconds: number;
  video_url: string;
  thumbnail_url: string | null;
  views: number;
  likes_count: number;
  comments_count: number;
  created_at: string;
  champion_id: string | null;
  role_id: string | null;
  map_id: string | null;
  upvotes: number | null;
  downvotes: number | null;
  score: number | null;
  learning_metadata: Record<string, unknown> | null;
  still_works_pct?: number | null;
  still_works_yes?: number | null;
  still_works_no?: number | null;
  is_outdated?: boolean | null;
  patches_behind?: number | null;
  profiles?: One<{ username: string; display_name: string; avatar_url: string | null }>;
  champions?: One<{ id: string; name: string }>;
  patches?: One<{ version: string; is_current: boolean }>;
};

const SKILLS: SkillLevel[] = ["beginner", "intermediate", "advanced", "competitive"];

export function rowToTip(row: TipRow): Tutorial {
  const profile = first(row.profiles);
  const champion = first(row.champions);
  const patch = first(row.patches);
  const meta = row.learning_metadata ?? {};
  const takeaways = Array.isArray(meta.takeaways) ? meta.takeaways.filter((t): t is string => typeof t === "string") : [];
  const tags = Array.from(new Map((row.tags ?? []).map((t) => t.trim()).filter(Boolean).map((t) => [t.toLocaleLowerCase(), t] as const)).values());
  const username = profile?.username;
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    learn: row.description || "",
    takeaways,
    gameId: row.game_id,
    category: row.category,
    topic: row.topic || row.category,
    character: champion?.name ?? row.character ?? undefined,
    tags,
    skillLevel: (SKILLS.includes(row.skill_level as SkillLevel) ? row.skill_level : "intermediate") as SkillLevel,
    duration: row.duration_seconds || 0,
    creatorId: row.user_id,
    creatorUsername: username,
    creatorDisplayName: profile?.display_name,
    creatorAvatar: profile?.avatar_url || (username ? `https://api.dicebear.com/9.x/adventurer/svg?seed=${encodeURIComponent(username)}` : undefined),
    thumbnail: row.thumbnail_url || (row.champion_id ? championSplashUrl(row.champion_id) : ""),
    videoUrl: row.video_url,
    views: Number(row.views || 0),
    likes: Number(row.upvotes ?? 0),
    helpful: 0,
    helpfulPercent: 0,
    comments: Number(row.comments_count || 0),
    createdAt: row.created_at,
    communityUpload: true,
    championId: row.champion_id,
    championName: champion?.name ?? null,
    roleId: row.role_id,
    mapId: row.map_id,
    patch: patch?.version ?? null,
    patchIsCurrent: patch?.is_current ?? false,
    upvotes: Number(row.upvotes ?? 0),
    downvotes: Number(row.downvotes ?? 0),
    score: Number(row.score ?? 0),
    seed: meta.seed === true,
    stillWorksPct: row.still_works_pct ?? null,
    stillWorksYes: Number(row.still_works_yes ?? 0),
    stillWorksNo: Number(row.still_works_no ?? 0),
    outdated: row.is_outdated === true,
    patchesBehind: row.patches_behind ?? null,
  };
}

export type TipQuery = {
  championId?: string;
  creatorIds?: string[];
  roleId?: string;
  mapId?: string;
  skill?: string;
  maxDuration?: number;
  sort?: "new" | "top";
  excludeId?: string;
  limit?: number;
};

function publicTips(client: SupabaseClient) {
  return client
    .from("videos")
    .select(TIP_SELECT)
    .eq("status", "published")
    .eq("visibility", "public")
    .in("game_id", [...ENABLED_GAME_IDS]);
}

function applyFilters<T extends ReturnType<typeof publicTips>>(query: T, q: TipQuery): T {
  let next = query;
  if (q.championId) next = next.eq("champion_id", q.championId) as T;
  if (q.creatorIds) next = next.in("user_id", q.creatorIds.length ? q.creatorIds : ["00000000-0000-0000-0000-000000000000"]) as T;
  if (q.roleId) next = next.eq("role_id", q.roleId) as T;
  if (q.mapId) next = next.eq("map_id", q.mapId) as T;
  if (q.skill) next = next.eq("skill_level", q.skill) as T;
  if (q.maxDuration) next = next.lte("duration_seconds", q.maxDuration) as T;
  if (q.excludeId) next = next.neq("id", q.excludeId) as T;
  return next;
}

function toTips(data: unknown) {
  return ((data ?? []) as TipRow[]).map(rowToTip);
}

export async function listTips(client: SupabaseClient, q: TipQuery = {}) {
  let query = applyFilters(publicTips(client), q);
  // "top" = patch-aware ranking (votes + still-works, minus patch age, outdated sinks).
  query = q.sort === "top"
    ? query.order("rank_score", { ascending: false }).order("created_at", { ascending: false })
    : query.order("created_at", { ascending: false });
  const { data, error } = await query.limit(q.limit ?? 60);
  if (error) throw error;
  return toTips(data);
}

/** Postgres full-text search over title, champion, tags, topic and description. */
export async function searchTips(client: SupabaseClient, text: string, q: TipQuery = {}) {
  const clean = text.replace(/[^\p{L}\p{N}\s'"-]/gu, " ").replace(/\s+/g, " ").trim();
  if (!clean) return [];
  const { data, error } = await applyFilters(publicTips(client), q)
    .textSearch("search_vector", clean, { type: "websearch", config: "english" })
    .order("rank_score", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(q.limit ?? 40);
  if (error) throw error;
  return toTips(data);
}

/** A single tip by slug. RLS decides visibility (public, unlisted, or your own). */
export async function getTipBySlug(client: SupabaseClient, slug: string) {
  const { data, error } = await client
    .from("videos")
    .select(TIP_SELECT)
    .eq("slug", slug)
    .in("game_id", [...ENABLED_GAME_IDS])
    .maybeSingle();
  if (error || !data) return undefined;
  return rowToTip(data as unknown as TipRow);
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Tips by id, keeping the order of `ids` (used for Saved / Liked / History). */
export async function getTipsByIds(client: SupabaseClient, ids: string[]) {
  const valid = [...new Set(ids.filter((id) => UUID.test(id)))].slice(0, 100);
  if (!valid.length) return [];
  const { data, error } = await client.from("videos").select(TIP_SELECT).in("id", valid);
  if (error) throw error;
  const byId = new Map(toTips(data).map((tip) => [tip.id, tip]));
  return valid.map((id) => byId.get(id)).filter((tip): tip is Tutorial => Boolean(tip));
}

export type ChampionSummary = { id: string; name: string; title: string; tags: string[] };

export async function listChampions(client: SupabaseClient) {
  const { data, error } = await client.from("champions").select("id,name,title,tags").order("name");
  if (error) throw error;
  return (data ?? []) as ChampionSummary[];
}

export type CreatorSummary = { id: string; username: string; display_name: string; avatar_url: string | null; bio: string };

export async function searchCreators(client: SupabaseClient, text: string, limit = 8) {
  const clean = text.replace(/[^\p{L}\p{N}_ ]/gu, "").trim();
  if (clean.length < 2) return [];
  const { data, error } = await client
    .from("profiles")
    .select("id,username,display_name,avatar_url,bio")
    .or(`username.ilike.*${clean}*,display_name.ilike.*${clean}*`)
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as CreatorSummary[];
}

/** Profiles by id (keeps order), with follower counts. */
export async function getProfilesByIds(client: SupabaseClient, ids: string[]) {
  const valid = [...new Set(ids.filter((id) => UUID.test(id)))].slice(0, 200);
  if (!valid.length) return [];
  const { data, error } = await client.from("profiles").select("id,username,display_name,avatar_url,bio,follower_count").in("id", valid);
  if (error) throw error;
  const byId = new Map(((data ?? []) as (CreatorSummary & { follower_count: number })[]).map((p) => [p.id, p]));
  return valid.map((id) => byId.get(id)).filter((p): p is CreatorSummary & { follower_count: number } => Boolean(p));
}

/** Tip count per champion (public League tips). */
export async function championTipCounts(client: SupabaseClient) {
  const { data, error } = await client
    .from("videos")
    .select("champion_id")
    .eq("status", "published")
    .eq("visibility", "public")
    .in("game_id", [...ENABLED_GAME_IDS])
    .not("champion_id", "is", null)
    .limit(5000);
  if (error) throw error;
  const counts: Record<string, number> = {};
  for (const row of (data ?? []) as { champion_id: string }[]) counts[row.champion_id] = (counts[row.champion_id] ?? 0) + 1;
  return counts;
}

export async function getCurrentPatch(client: SupabaseClient) {
  const { data } = await client.from("patches").select("id,version,ddragon_version").eq("is_current", true).maybeSingle();
  return (data ?? null) as { id: number; version: string; ddragon_version: string } | null;
}

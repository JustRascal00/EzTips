// Matchup notes (champion vs champion). Reads are public; writes are moderator-only (RLS).
import type { SupabaseClient } from "@supabase/supabase-js";

type One<T> = T | T[] | null | undefined;
const first = <T,>(v: One<T>): T | undefined => (Array.isArray(v) ? v[0] : v ?? undefined);

export const MATCHUP_SELECT =
  "id,champion_id,vs_champion_id,role_id,patch_id,difficulty,summary,lane_tips,power_spikes,build_changes,status,updated_at,patches(version,is_current),matchup_tips(video_id,sort)";

export type Matchup = {
  id: string;
  championId: string;
  vsChampionId: string;
  roleId: string;
  difficulty: number | null;
  summary: string;
  laneTips: string;
  powerSpikes: string;
  buildChanges: string;
  status: string;
  patch: string | null;
  patchIsCurrent: boolean;
  tipIds: string[];
  updatedAt: string;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toMatchup(r: any): Matchup {
  const patch = first(r.patches as One<{ version: string; is_current: boolean }>);
  const tips = ((r.matchup_tips ?? []) as { video_id: string; sort: number }[]).sort((a, b) => a.sort - b.sort);
  return {
    id: r.id,
    championId: r.champion_id,
    vsChampionId: r.vs_champion_id,
    roleId: r.role_id,
    difficulty: r.difficulty,
    summary: r.summary ?? "",
    laneTips: r.lane_tips ?? "",
    powerSpikes: r.power_spikes ?? "",
    buildChanges: r.build_changes ?? "",
    status: r.status,
    patch: patch?.version ?? null,
    patchIsCurrent: patch?.is_current ?? false,
    tipIds: tips.map((t) => t.video_id),
    updatedAt: r.updated_at,
  };
}

export async function listMatchups(client: SupabaseClient, championId: string) {
  const { data, error } = await client.from("matchups").select(MATCHUP_SELECT).eq("champion_id", championId).eq("status", "published").order("difficulty", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(toMatchup);
}

/** All roles written for this pair (usually one). */
export async function getMatchups(client: SupabaseClient, championId: string, vsId: string) {
  const { data, error } = await client.from("matchups").select(MATCHUP_SELECT).eq("champion_id", championId).eq("vs_champion_id", vsId);
  if (error) throw error;
  return (data ?? []).map(toMatchup);
}

export type MatchupInput = {
  championId: string;
  vsChampionId: string;
  roleId: string;
  difficulty: number;
  summary: string;
  laneTips: string;
  powerSpikes: string;
  buildChanges: string;
  tipIds: string[];
  status: "published" | "draft";
};

/** Create or update (one row per champion + opponent + role), then replace its linked tips. */
export async function saveMatchup(client: SupabaseClient, authorId: string, input: MatchupInput) {
  const { data: patch } = await client.from("patches").select("id").eq("is_current", true).maybeSingle();
  const { data, error } = await client
    .from("matchups")
    .upsert({
      champion_id: input.championId,
      vs_champion_id: input.vsChampionId,
      role_id: input.roleId,
      author_id: authorId,
      patch_id: patch?.id ?? null,
      difficulty: input.difficulty,
      summary: input.summary.trim().slice(0, 500),
      lane_tips: input.laneTips.trim().slice(0, 3000),
      power_spikes: input.powerSpikes.trim().slice(0, 2000),
      build_changes: input.buildChanges.trim().slice(0, 2000),
      status: input.status,
    }, { onConflict: "champion_id,vs_champion_id,role_id" })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  const { error: delError } = await client.from("matchup_tips").delete().eq("matchup_id", data.id);
  if (delError) throw new Error(delError.message);
  if (input.tipIds.length) {
    const { error: insError } = await client.from("matchup_tips").insert(input.tipIds.slice(0, 12).map((video_id, sort) => ({ matchup_id: data.id, video_id, sort })));
    if (insError) throw new Error(insError.message);
  }
  return data.id as string;
}

export async function deleteMatchup(client: SupabaseClient, id: string) {
  const { error } = await client.from("matchups").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export const DIFFICULTY_LABEL = ["", "Easy", "Favoured", "Even", "Hard", "Very hard"];
export const DIFFICULTY_COLOR = ["", "text-success", "text-emerald-300", "text-white", "text-amber-300", "text-danger"];

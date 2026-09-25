// Votes, "still works" flags, saves and follows (Supabase). Browser-side helpers used by the store.
import type { SupabaseClient } from "@supabase/supabase-js";

export type VoteValue = 1 | -1;
export type VoteTotals = { upvotes: number; downvotes: number; score: number; my_vote: number };
export type StillWorksTotals = { yes: number; no: number; pct: number | null; my_flag: boolean | null };
export type MyEngagement = {
  votes: Record<string, VoteValue>;
  flags: Record<string, boolean>;
  saved: string[];
  following: string[];
};

export const emptyEngagement: MyEngagement = { votes: {}, flags: {}, saved: [], following: [] };

export async function loadMyEngagement(client: SupabaseClient, userId: string): Promise<MyEngagement> {
  const [votes, saves, follows, patch] = await Promise.all([
    client.from("votes").select("target_id,value").eq("user_id", userId).eq("target_type", "tip"),
    client.from("video_saves").select("video_id").eq("user_id", userId).order("created_at", { ascending: false }),
    client.from("creator_follows").select("creator_id").eq("follower_id", userId),
    client.from("patches").select("id").eq("is_current", true).maybeSingle(),
  ]);
  const flags = patch.data
    ? await client.from("still_works_flags").select("target_id,works").eq("user_id", userId).eq("target_type", "tip").eq("patch_id", patch.data.id)
    : { data: [] as { target_id: string; works: boolean }[] };
  return {
    votes: Object.fromEntries((votes.data ?? []).map((row) => [row.target_id, row.value as VoteValue])),
    flags: Object.fromEntries((flags.data ?? []).map((row) => [row.target_id, row.works])),
    saved: (saves.data ?? []).map((row) => row.video_id as string),
    following: (follows.data ?? []).map((row) => row.creator_id as string),
  };
}

export async function castVote(client: SupabaseClient, tipId: string, value: VoteValue | 0) {
  const { data, error } = await client.rpc("cast_vote", { p_target_type: "tip", p_target_id: tipId, p_value: value });
  if (error) throw new Error(friendlyError(error.message, "vote"));
  return data as VoteTotals;
}

export async function setStillWorks(client: SupabaseClient, tipId: string, works: boolean | null) {
  const { data, error } = await client.rpc("set_still_works", { p_target_type: "tip", p_target_id: tipId, p_works: works });
  if (error) throw new Error(friendlyError(error.message, "flag"));
  return data as StillWorksTotals;
}

export async function setSaved(client: SupabaseClient, userId: string, tipId: string, saved: boolean) {
  const { error } = saved
    ? await client.from("video_saves").upsert({ user_id: userId, video_id: tipId }, { onConflict: "user_id,video_id", ignoreDuplicates: true })
    : await client.from("video_saves").delete().eq("user_id", userId).eq("video_id", tipId);
  if (error) throw new Error(friendlyError(error.message, "save"));
}

export async function setFollowing(client: SupabaseClient, userId: string, creatorId: string, following: boolean) {
  if (userId === creatorId) throw new Error("You can't follow yourself.");
  const { error } = following
    ? await client.from("creator_follows").upsert({ follower_id: userId, creator_id: creatorId }, { onConflict: "follower_id,creator_id", ignoreDuplicates: true })
    : await client.from("creator_follows").delete().eq("follower_id", userId).eq("creator_id", creatorId);
  if (error) throw new Error(friendlyError(error.message, "follow"));
}

function friendlyError(message: string, action: string) {
  if (/row-level security/i.test(message) && action === "vote") return "You can't vote on your own tip.";
  if (/sign in/i.test(message)) return `Sign in to ${action}.`;
  if (/current patch/i.test(message)) return "No current patch yet. Run npm run seed.";
  return `Couldn't ${action}. Try again.`;
}

// Votes, "still works" flags, saves and follows (Supabase). Browser-side helpers used by the store.
import type { SupabaseClient } from "@supabase/supabase-js";

export type VoteValue = 1 | -1;
export type VoteTotals = { upvotes: number; downvotes: number; score: number; my_vote: number };
export type StillWorksTotals = { yes: number; no: number; pct: number | null; my_flag: boolean | null };
export type VoteTarget = "tip" | "build";
export type MyEngagement = {
  votes: Record<string, VoteValue>;
  flags: Record<string, boolean>;
  buildVotes: Record<string, VoteValue>;
  buildFlags: Record<string, boolean>;
  saved: string[];
  following: string[];
};

export const emptyEngagement: MyEngagement = { votes: {}, flags: {}, buildVotes: {}, buildFlags: {}, saved: [], following: [] };

export async function loadMyEngagement(client: SupabaseClient, userId: string): Promise<MyEngagement> {
  const [votes, saves, follows, patch] = await Promise.all([
    client.from("votes").select("target_type,target_id,value").eq("user_id", userId),
    client.from("video_saves").select("video_id").eq("user_id", userId).order("created_at", { ascending: false }),
    client.from("creator_follows").select("creator_id").eq("follower_id", userId),
    client.from("patches").select("id").eq("is_current", true).maybeSingle(),
  ]);
  const flags = patch.data
    ? await client.from("still_works_flags").select("target_type,target_id,works").eq("user_id", userId).eq("patch_id", patch.data.id)
    : { data: [] as { target_type: string; target_id: string; works: boolean }[] };
  const v = (votes.data ?? []) as { target_type: string; target_id: string; value: number }[];
  const f = (flags.data ?? []) as { target_type: string; target_id: string; works: boolean }[];
  return {
    votes: Object.fromEntries(v.filter((r) => r.target_type === "tip").map((r) => [r.target_id, r.value as VoteValue])),
    flags: Object.fromEntries(f.filter((r) => r.target_type === "tip").map((r) => [r.target_id, r.works])),
    buildVotes: Object.fromEntries(v.filter((r) => r.target_type === "build").map((r) => [r.target_id, r.value as VoteValue])),
    buildFlags: Object.fromEntries(f.filter((r) => r.target_type === "build").map((r) => [r.target_id, r.works])),
    saved: (saves.data ?? []).map((row) => row.video_id as string),
    following: (follows.data ?? []).map((row) => row.creator_id as string),
  };
}

export async function castVote(client: SupabaseClient, targetId: string, value: VoteValue | 0, target: VoteTarget = "tip") {
  const { data, error } = await client.rpc("cast_vote", { p_target_type: target, p_target_id: targetId, p_value: value });
  if (error) throw new Error(friendlyError(error.message, "vote"));
  return data as VoteTotals;
}

export async function setStillWorks(client: SupabaseClient, targetId: string, works: boolean | null, target: VoteTarget = "tip") {
  const { data, error } = await client.rpc("set_still_works", { p_target_type: target, p_target_id: targetId, p_works: works });
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
  if (/row-level security/i.test(message) && action === "vote") return "You can't vote on your own content.";
  if (/sign in/i.test(message)) return `Sign in to ${action}.`;
  if (/current patch/i.test(message)) return "No current patch yet. Run npm run seed.";
  return `Couldn't ${action}. Try again.`;
}

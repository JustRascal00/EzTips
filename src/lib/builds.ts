"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import { useEffect, useState } from "react";
import type { BuildRunes, PatchData } from "./builds-data";

export const BUILD_SELECT = [
  "id,champion_id,role_id,map_id,patch_id,author_id,title,notes,starting_items,items,situational_items,runes,spells,skill_order",
  "is_recommended,status,upvotes,downvotes,score,created_at,updated_at",
  "build_works_pct,build_works_yes,build_works_no,build_is_outdated,build_patches_behind",
  "patches(version,is_current)",
  "profiles!builds_author_id_fkey(username,display_name,avatar_url)",
].join(",");

type One<T> = T | T[] | null | undefined;
const first = <T,>(v: One<T>): T | undefined => (Array.isArray(v) ? v[0] : v ?? undefined);

export type Build = {
  id: string;
  championId: string;
  roleId: string;
  mapId: string;
  authorId: string | null;
  authorUsername: string | null;
  authorName: string | null;
  title: string;
  notes: string;
  startingItems: string[];
  items: string[];
  situationalItems: string[];
  runes: BuildRunes;
  spells: string[];
  skillOrder: string[];
  isRecommended: boolean;
  status: string;
  upvotes: number;
  downvotes: number;
  score: number;
  worksPct: number | null;
  worksYes: number;
  worksNo: number;
  outdated: boolean;
  patchesBehind: number | null;
  patch: string | null;
  patchIsCurrent: boolean;
  updatedAt: string;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toBuild(r: any): Build {
  const patch = first(r.patches as One<{ version: string; is_current: boolean }>);
  const author = first(r.profiles as One<{ username: string; display_name: string }>);
  return {
    id: r.id,
    championId: r.champion_id,
    roleId: r.role_id,
    mapId: r.map_id,
    authorId: r.author_id,
    authorUsername: author?.username ?? null,
    authorName: author?.display_name ?? null,
    title: r.title,
    notes: r.notes ?? "",
    startingItems: r.starting_items ?? [],
    items: r.items ?? [],
    situationalItems: r.situational_items ?? [],
    runes: { primary: null, keystone: null, primaryRunes: [null, null, null], secondary: null, secondaryRunes: [], ...(r.runes ?? {}) },
    spells: r.spells ?? [],
    skillOrder: r.skill_order ?? [],
    isRecommended: Boolean(r.is_recommended),
    status: r.status,
    upvotes: Number(r.upvotes ?? 0),
    downvotes: Number(r.downvotes ?? 0),
    score: Number(r.score ?? 0),
    worksPct: r.build_works_pct ?? null,
    worksYes: Number(r.build_works_yes ?? 0),
    worksNo: Number(r.build_works_no ?? 0),
    outdated: r.build_is_outdated === true,
    patchesBehind: r.build_patches_behind ?? null,
    patch: patch?.version ?? null,
    patchIsCurrent: patch?.is_current ?? false,
    updatedAt: r.updated_at,
  };
}

export async function listBuilds(client: SupabaseClient, q: { championId: string; roleId?: string; mapId?: string }) {
  let query = client.from("builds").select(BUILD_SELECT).eq("champion_id", q.championId).eq("status", "published");
  if (q.roleId) query = query.eq("role_id", q.roleId);
  if (q.mapId) query = query.eq("map_id", q.mapId);
  const { data, error } = await query.order("build_rank_score", { ascending: false }).limit(50);
  if (error) throw error;
  return (data ?? []).map(toBuild);
}

export async function getBuild(client: SupabaseClient, id: string) {
  const { data } = await client.from("builds").select(BUILD_SELECT).eq("id", id).maybeSingle();
  return data ? toBuild(data) : null;
}

export async function setRecommended(client: SupabaseClient, id: string, recommended: boolean) {
  const { error } = await client.rpc("set_recommended_build", { p_build_id: id, p_recommended: recommended });
  if (error) throw new Error(error.message);
}

export async function deleteBuild(client: SupabaseClient, id: string) {
  const { error } = await client.from("builds").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

// ── current-patch Data Dragon data for the build UI (via /api/ddragon, cached per map+champion) ──
const cache = new Map<string, Promise<PatchData>>();

export function usePatchData(map = "sr", championId?: string) {
  const key = `${map}:${championId ?? ""}`;
  const [state, setState] = useState<{ key: string; data: PatchData | null; error: string }>({ key: "", data: null, error: "" });
  useEffect(() => {
    let cancelled = false;
    if (!cache.has(key)) {
      // bump "v" when the /api/ddragon response shape changes, so browsers don't reuse an old cached copy
      const params = new URLSearchParams({ map, v: "2" });
      if (championId) params.set("champion", championId);
      cache.set(key, fetch(`/api/ddragon?${params}`).then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.error ?? "Couldn't load patch data");
        return body as PatchData;
      }).catch((e) => { cache.delete(key); throw e; }));
    }
    cache.get(key)!.then(
      (data) => { if (!cancelled) setState({ key, data, error: "" }); },
      (e: Error) => { if (!cancelled) setState({ key, data: null, error: e.message }); },
    );
    return () => { cancelled = true; };
  }, [key, map, championId]);
  return { data: state.key === key ? state.data : null, error: state.key === key ? state.error : "", loading: state.key !== key };
}

/** "Q > W > E": order in which basic abilities reach rank 5. */
export function skillPriority(order: string[]) {
  const counts: Record<string, number> = { Q: 0, W: 0, E: 0 };
  const maxed: string[] = [];
  for (const s of order) {
    if (!(s in counts)) continue;
    counts[s] += 1;
    if (counts[s] === 5 && !maxed.includes(s)) maxed.push(s);
  }
  const rest = (["Q", "W", "E"] as const).filter((s) => !maxed.includes(s)).sort((a, b) => counts[b] - counts[a]);
  return [...maxed, ...rest];
}

/** Standard 18-level order for a max priority like ["Q","W","E"]. */
export function standardSkillOrder(priority: string[]) {
  const [a, b, c] = priority;
  return [a, b, c, a, a, "R", a, b, a, b, "R", b, b, c, c, "R", c, c];
}

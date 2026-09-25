"use client";

import { useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { DDRAGON_FALLBACK_VERSION } from "@/lib/ddragon/shared";
import { getCurrentPatch, listChampions, type ChampionSummary } from "@/lib/tips";

/**
 * Runs a Supabase query in the browser. `key` must change whenever the query's inputs change.
 * Returns an empty result (not an error) when Supabase isn't configured.
 */
export function useSupabaseQuery<T>(key: string, fetcher: (client: SupabaseClient) => Promise<T>, initial: T) {
  const [state, setState] = useState<{ key: string; data: T; loading: boolean; error: string }>({ key: "", data: initial, loading: true, error: "" });

  useEffect(() => {
    const client = createClient();
    let cancelled = false;
    if (!client) {
      queueMicrotask(() => { if (!cancelled) setState({ key, data: initial, loading: false, error: "" }); });
      return () => { cancelled = true; };
    }
    queueMicrotask(() => { if (!cancelled) setState((s) => ({ ...s, key, loading: true, error: "" })); });
    fetcher(client)
      .then((data) => { if (!cancelled) setState({ key, data, loading: false, error: "" }); })
      .catch((error: unknown) => {
        if (!cancelled) setState({ key, data: initial, loading: false, error: error instanceof Error ? error.message : "Could not load data" });
      });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `key` captures the fetcher's inputs
  }, [key]);

  return { data: state.data, loading: state.loading || state.key !== key, error: state.error };
}

let championCache: Promise<ChampionSummary[]> | null = null;

/** All champions (cached for the session). */
export function useChampions() {
  return useSupabaseQuery("champions", (client) => {
    championCache ??= listChampions(client).catch((error) => { championCache = null; throw error; });
    return championCache;
  }, [] as ChampionSummary[]);
}

let patchCache: ReturnType<typeof getCurrentPatch> | null = null;

/** Current patch from the patches table, e.g. { version: "26.19", ddragon_version: "16.19.1" }. */
export function useCurrentPatch() {
  const { data } = useSupabaseQuery("current-patch", (client) => {
    patchCache ??= getCurrentPatch(client).catch(() => { patchCache = null; return null; });
    return patchCache;
  }, null as Awaited<ReturnType<typeof getCurrentPatch>>);
  return { patch: data?.version ?? null, ddragonVersion: data?.ddragon_version ?? DDRAGON_FALLBACK_VERSION };
}

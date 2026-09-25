"use client";

import { TutorialCard } from "@/components/cards";
import { AppShell } from "@/components/layout/AppShell";
import { SearchBar } from "@/components/SearchBar";
import { EmptyState, FilterSelect, Skeleton } from "@/components/ui";
import { championIconUrl } from "@/lib/ddragon/shared";
import { listTips } from "@/lib/tips";
import { useChampions, useCurrentPatch, useSupabaseQuery } from "@/lib/use-tips";
import type { Tutorial } from "@/lib/types";
import { useMemo, useState } from "react";

export default function ExplorePage() {
  const [champion, setChampion] = useState("all");
  const [role, setRole] = useState("all");
  const [map, setMap] = useState("all");
  const [diff, setDiff] = useState("all");
  const [sort, setSort] = useState<"top" | "new">("top");
  const { data: champions } = useChampions();
  const { ddragonVersion } = useCurrentPatch();

  const { data: tips, loading, error } = useSupabaseQuery(
    `explore:${champion}:${role}:${map}:${diff}:${sort}`,
    (client) => listTips(client, {
      championId: champion === "all" ? undefined : champion,
      roleId: role === "all" ? undefined : role,
      mapId: map === "all" ? undefined : map,
      skill: diff === "all" ? undefined : diff,
      sort,
      limit: 60,
    }),
    [] as Tutorial[],
  );

  // Champions that actually have tips, for the quick picker.
  const { data: allTips } = useSupabaseQuery("explore:champion-counts", (client) => listTips(client, { limit: 500 }), [] as Tutorial[]);
  const featured = useMemo(() => {
    const counts = new Map<string, number>();
    allTips.forEach((t) => t.championId && counts.set(t.championId, (counts.get(t.championId) ?? 0) + 1));
    return champions.filter((c) => counts.has(c.id)).sort((a, b) => (counts.get(b.id) ?? 0) - (counts.get(a.id) ?? 0)).slice(0, 12);
  }, [allTips, champions]);

  return (
    <AppShell publicPage>
      <div className="px-4 py-8 max-w-5xl sm:px-6">
        <h1 className="text-3xl font-bold">Explore</h1>
        <p className="text-muted mt-1">Browse League tips by champion, role and map.</p>
        <SearchBar large className="mt-6" />

        {featured.length > 0 && (
          <section className="mt-8">
            <h2 className="text-sm font-semibold text-muted mb-3">Champions with tips</h2>
            <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
              <button type="button" onClick={() => setChampion("all")} className={`shrink-0 rounded-xl border px-3 text-sm font-semibold ${champion === "all" ? "border-accent bg-accent/15 text-white" : "border-border bg-card text-muted"}`}>All</button>
              {featured.map((c) => (
                <button key={c.id} type="button" onClick={() => setChampion(c.id)} className={`flex shrink-0 items-center gap-2 rounded-xl border py-1 pl-1 pr-3 text-sm ${champion === c.id ? "border-accent bg-accent/15 text-white" : "border-border bg-card text-muted hover:text-white"}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={championIconUrl(ddragonVersion, c.id)} alt="" className="h-8 w-8 rounded-lg" />
                  {c.name}
                </button>
              ))}
            </div>
          </section>
        )}

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-6">
          <FilterSelect label="Champion" value={champion} onChange={setChampion} options={[{ id: "all", label: "Any champion" }, ...champions.map((c) => ({ id: c.id, label: c.name }))]} />
          <FilterSelect label="Role" value={role} onChange={setRole} options={[{ id: "all", label: "Any role" }, { id: "top", label: "Top" }, { id: "jungle", label: "Jungle" }, { id: "mid", label: "Mid" }, { id: "adc", label: "ADC" }, { id: "support", label: "Support" }]} />
          <FilterSelect label="Map" value={map} onChange={setMap} options={[{ id: "all", label: "Any map" }, { id: "sr", label: "Summoner's Rift" }, { id: "aram", label: "ARAM" }, { id: "arena", label: "Arena" }]} />
          <FilterSelect label="Difficulty" value={diff} onChange={setDiff} options={[{ id: "all", label: "Any" }, { id: "beginner", label: "Beginner" }, { id: "intermediate", label: "Intermediate" }, { id: "advanced", label: "Advanced" }]} />
          <FilterSelect label="Sort" value={sort} onChange={(v) => setSort(v as "top" | "new")} options={[{ id: "top", label: "Top voted" }, { id: "new", label: "Newest" }]} />
        </div>

        {error && <p className="mt-6 text-sm text-danger">Couldn&apos;t load tips: {error}</p>}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
          {loading
            ? [0, 1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="aspect-[16/10] rounded-2xl" />)
            : tips.map((t) => <TutorialCard key={t.id} tutorial={t} />)}
        </div>
        {!loading && !error && tips.length === 0 && (
          <div className="mt-6"><EmptyState title="No tips match these filters" body="Try another champion or role, or upload the first one." /></div>
        )}
      </div>
    </AppShell>
  );
}

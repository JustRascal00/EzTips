"use client";

import { TipGrid } from "@/components/league";
import { AppShell } from "@/components/layout/AppShell";
import { EmptyState, FilterSelect, Segmented } from "@/components/ui";
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
      <div className="py-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="display text-4xl font-extrabold">Browse tips</h1>
            <p className="text-muted mt-1">Every League tip, filtered by champion, role and map.</p>
          </div>
          <Segmented value={sort} onChange={setSort} options={[{ id: "top", label: "Top" }, { id: "new", label: "New" }]} />
        </div>

        {featured.length > 0 && (
          <section className="mt-8">
            <h2 className="text-sm font-semibold text-muted mb-3">Champions with tips</h2>
            <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
              <button type="button" onClick={() => setChampion("all")} className={`shrink-0 rounded-xl border px-3 text-sm font-semibold ${champion === "all" ? "border-accent bg-accent/15 text-white" : "border-white/[0.08] bg-white/[0.03] text-muted"}`}>All</button>
              {featured.map((c) => (
                <button key={c.id} type="button" onClick={() => setChampion(c.id)} className={`flex shrink-0 items-center gap-2 rounded-xl border py-1 pl-1 pr-3 text-sm ${champion === c.id ? "border-accent bg-accent/15 text-white" : "border-white/[0.08] bg-white/[0.03] text-muted hover:text-white"}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={championIconUrl(ddragonVersion, c.id)} alt="" className="h-8 w-8 rounded-lg" />
                  {c.name}
                </button>
              ))}
            </div>
          </section>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
          <FilterSelect label="Champion" value={champion} onChange={setChampion} options={[{ id: "all", label: "Any champion" }, ...champions.map((c) => ({ id: c.id, label: c.name }))]} />
          <FilterSelect label="Role" value={role} onChange={setRole} options={[{ id: "all", label: "Any role" }, { id: "top", label: "Top" }, { id: "jungle", label: "Jungle" }, { id: "mid", label: "Mid" }, { id: "adc", label: "ADC" }, { id: "support", label: "Support" }]} />
          <FilterSelect label="Map" value={map} onChange={setMap} options={[{ id: "all", label: "Any map" }, { id: "sr", label: "Summoner's Rift" }, { id: "aram", label: "ARAM" }, { id: "arena", label: "Arena" }]} />
          <FilterSelect label="Difficulty" value={diff} onChange={setDiff} options={[{ id: "all", label: "Any" }, { id: "beginner", label: "Beginner" }, { id: "intermediate", label: "Intermediate" }, { id: "advanced", label: "Advanced" }]} />
        </div>

        {error && <p className="mt-6 text-sm text-danger">Couldn&apos;t load tips: {error}</p>}
        <TipGrid className="mt-6" tips={tips} loading={loading} empty={!error && <div className="mt-6"><EmptyState title="No tips match these filters" body="Try another champion or role, or upload the first one." /></div>} />
      </div>
    </AppShell>
  );
}

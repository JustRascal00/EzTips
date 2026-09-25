"use client";

import { ProfileCard, TutorialCard } from "@/components/cards";
import { AppShell } from "@/components/layout/AppShell";
import { SearchBar } from "@/components/SearchBar";
import { EmptyState, FilterSelect, Skeleton } from "@/components/ui";
import { championIconUrl } from "@/lib/ddragon/shared";
import { searchCreators, searchTips, type CreatorSummary } from "@/lib/tips";
import { useChampions, useCurrentPatch, useSupabaseQuery } from "@/lib/use-tips";
import type { Tutorial } from "@/lib/types";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";

const norm = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, "");

function Results() {
  const params = useSearchParams();
  const q = (params.get("q") ?? "").trim();
  const [role, setRole] = useState("all");
  const [diff, setDiff] = useState("all");
  const { data: champions } = useChampions();
  const { ddragonVersion } = useCurrentPatch();

  const { data: tips, loading } = useSupabaseQuery(
    `search:${q}:${role}:${diff}`,
    (client) => (q ? searchTips(client, q, { roleId: role === "all" ? undefined : role, skill: diff === "all" ? undefined : diff }) : Promise.resolve([])),
    [] as Tutorial[],
  );
  const { data: creators } = useSupabaseQuery(`creators:${q}`, (client) => searchCreators(client, q), [] as CreatorSummary[]);

  const matchingChampions = useMemo(() => {
    const needle = norm(q);
    if (needle.length < 2) return [];
    return champions.filter((c) => norm(c.name).includes(needle) || q.toLowerCase().split(/\s+/).some((word) => word.length > 2 && norm(c.name) === norm(word))).slice(0, 12);
  }, [champions, q]);

  const empty = q && !loading && tips.length === 0 && creators.length === 0 && matchingChampions.length === 0;

  return (
    <div className="px-4 py-8 max-w-5xl sm:px-6">
      <h1 className="text-3xl font-bold">Search</h1>
      <SearchBar large className="mt-4" initial={q} autoFocus />
      <div className="flex flex-wrap gap-3 mt-4">
        <FilterSelect
          label="Role"
          value={role}
          onChange={setRole}
          options={[
            { id: "all", label: "Any role" },
            { id: "top", label: "Top" },
            { id: "jungle", label: "Jungle" },
            { id: "mid", label: "Mid" },
            { id: "adc", label: "ADC" },
            { id: "support", label: "Support" },
          ]}
        />
        <FilterSelect
          label="Difficulty"
          value={diff}
          onChange={setDiff}
          options={[
            { id: "all", label: "Any" },
            { id: "beginner", label: "Beginner" },
            { id: "intermediate", label: "Intermediate" },
            { id: "advanced", label: "Advanced" },
          ]}
        />
      </div>

      {!q && <p className="text-muted mt-8 text-sm">Try “ahri combo”, “how to punish zed”, “wave management” or “jungle tempo”.</p>}

      {matchingChampions.length > 0 && (
        <section className="mt-8">
          <h2 className="text-lg font-semibold mb-3">Champions</h2>
          <div className="flex gap-3 flex-wrap">
            {matchingChampions.map((c) => (
              <Link key={c.id} href={`/search?q=${encodeURIComponent(c.name)}`} className="w-20 text-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={championIconUrl(ddragonVersion, c.id)} alt="" className="h-20 w-20 rounded-2xl object-cover border border-border" />
                <div className="text-sm mt-1 font-medium truncate">{c.name}</div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {q && loading && (
        <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[0, 1, 2].map((i) => <Skeleton key={i} className="aspect-[16/10] rounded-2xl" />)}
        </div>
      )}

      {tips.length > 0 && (
        <section className="mt-10">
          <h2 className="text-lg font-semibold mb-3">Tips</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {tips.map((t) => <TutorialCard key={t.id} tutorial={t} />)}
          </div>
        </section>
      )}

      {creators.length > 0 && (
        <section className="mt-10">
          <h2 className="text-lg font-semibold mb-3">Creators</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {creators.map((c) => <ProfileCard key={c.id} profile={c} />)}
          </div>
        </section>
      )}

      {empty && (
        <EmptyState title={`No results for “${q}”`} body="Try a champion name, a role, or a mechanic like “wave management”." />
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <AppShell publicPage>
      <Suspense>
        <Results />
      </Suspense>
    </AppShell>
  );
}

"use client";

import { CreatorCard, GameCard, TutorialCard } from "@/components/cards";
import { AppShell } from "@/components/layout/AppShell";
import { SearchBar } from "@/components/SearchBar";
import { Chip, EmptyState, FilterSelect } from "@/components/ui";
import { searchAll } from "@/data/index";
import { getGame } from "@/data/games";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";

function Results() {
  const params = useSearchParams();
  const q = params.get("q") ?? "";
  const [game, setGame] = useState("all");
  const [diff, setDiff] = useState("all");
  const result = useMemo(() => searchAll(q), [q]);
  const tuts = result.tutorials.filter((t) => {
    if (game !== "all" && t.gameId !== game) return false;
    if (diff !== "all" && t.skillLevel !== diff) return false;
    return true;
  });

  const empty =
    !q ||
    (tuts.length === 0 &&
      result.games.length === 0 &&
      result.creators.length === 0 &&
      result.characters.length === 0);

  return (
    <div className="px-6 py-8 max-w-5xl">
      <h1 className="text-3xl font-bold">Search</h1>
      <SearchBar large className="mt-4" initial={q} autoFocus />
      <div className="flex gap-3 mt-4">
        <FilterSelect
          label="Game"
          value={game}
          onChange={setGame}
          options={[
            { id: "all", label: "All games" },
            { id: "lol", label: "League of Legends" },
            { id: "valorant", label: "Valorant" },
            { id: "cs2", label: "Counter-Strike 2" },
            { id: "minecraft", label: "Minecraft" },
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

      {!q && (
        <p className="text-muted mt-8 text-sm">
          Try “how to counter zed”, “best jett smokes ascent”, “how to improve cs2 recoil”, or
          “minecraft early game farms”.
        </p>
      )}

      {q && empty && (
        <EmptyState
          title={`No results for “${q}”`}
          body="Try a champion, agent, map, or a mechanic — search is built for how players actually ask."
        />
      )}

      {tuts.length > 0 && (
        <section className="mt-10">
          <h2 className="text-lg font-semibold mb-3">Videos</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {tuts.map((t) => (
              <TutorialCard key={t.id} tutorial={t} />
            ))}
          </div>
        </section>
      )}
      {result.games.length > 0 && (
        <section className="mt-10">
          <h2 className="text-lg font-semibold mb-3">Games</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {result.games.map((g) => (
              <GameCard key={g.id} game={g} />
            ))}
          </div>
        </section>
      )}
      {result.creators.length > 0 && (
        <section className="mt-10">
          <h2 className="text-lg font-semibold mb-3">Creators</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {result.creators.map((c) => (
              <CreatorCard key={c.id} creator={c} />
            ))}
          </div>
        </section>
      )}
      {result.characters.length > 0 && (
        <section className="mt-10">
          <h2 className="text-lg font-semibold mb-3">Characters</h2>
          <div className="flex gap-3 flex-wrap">
            {result.characters.map((ch) => {
              const g = getGame(ch.gameId);
              return (
                <Link
                  key={ch.id}
                  href={`/search?q=${encodeURIComponent(ch.name)}`}
                  className="w-24 text-center"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={ch.image} alt="" className="h-24 w-24 rounded-2xl object-cover border border-border" />
                  <div className="text-sm mt-1 font-medium">{ch.name}</div>
                  <div className="text-[11px] text-muted">{g?.short}</div>
                </Link>
              );
            })}
          </div>
        </section>
      )}
      {result.topics.length > 0 && (
        <section className="mt-10">
          <h2 className="text-lg font-semibold mb-3">Topics</h2>
          <div className="flex flex-wrap gap-2">
            {result.topics.map((t) => (
              <Link key={t} href={`/search?q=${encodeURIComponent(t)}`}>
                <Chip>{t}</Chip>
              </Link>
            ))}
          </div>
        </section>
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

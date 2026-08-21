"use client";

import { GameCard, TutorialCard } from "@/components/cards";
import { AppShell } from "@/components/layout/AppShell";
import { RightRail, RailSection, YourGamesRail } from "@/components/layout/Sidebar";
import { SearchBar } from "@/components/SearchBar";
import { Chip, FilterSelect } from "@/components/ui";
import { trendingSkills } from "@/data/games";
import { games } from "@/data/games";
import { tutorials } from "@/data/tutorials";
import { useApp } from "@/lib/store";
import Link from "next/link";
import { useMemo, useState } from "react";

export default function ExplorePage() {
  const { selectedGames } = useApp();
  const yours = games.filter((g) => selectedGames.includes(g.id));
  const trending = games.filter((g) => g.trending);
  const [game, setGame] = useState("all");
  const [skill, setSkill] = useState("all");
  const [diff, setDiff] = useState("all");
  const [dur, setDur] = useState("all");
  const [sort, setSort] = useState("popular");

  const filtered = useMemo(() => {
    let list = [...tutorials];
    if (game !== "all") list = list.filter((t) => t.gameId === game);
    if (skill !== "all") {
      list = list.filter(
        (t) =>
          t.category.toLowerCase().includes(skill) ||
          t.topic.toLowerCase().includes(skill) ||
          t.tags.some((x) => x.toLowerCase().includes(skill)),
      );
    }
    if (diff !== "all") list = list.filter((t) => t.skillLevel === diff);
    if (dur === "short") list = list.filter((t) => t.duration < 45);
    if (dur === "mid") list = list.filter((t) => t.duration >= 45 && t.duration <= 60);
    if (dur === "long") list = list.filter((t) => t.duration > 60);
    if (sort === "popular") list.sort((a, b) => b.views - a.views);
    if (sort === "newest") list.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
    if (sort === "helpful") list.sort((a, b) => b.helpfulPercent - a.helpfulPercent);
    return list;
  }, [game, skill, diff, dur, sort]);

  return (
    <AppShell
      publicPage
      right={
        <RightRail>
          <YourGamesRail />
          <RailSection title="Trending topics">
            <div className="flex flex-wrap gap-1.5">
              {trendingSkills.map((s) => (
                <Link key={s.id} href={`/search?q=${encodeURIComponent(s.name)}`}>
                  <Chip>{s.name}</Chip>
                </Link>
              ))}
            </div>
          </RailSection>
        </RightRail>
      }
    >
      <div className="px-6 py-8 max-w-5xl">
        <h1 className="text-3xl font-bold">Explore</h1>
        <p className="text-muted mt-1">Discover community videos outside your usual feed by game, topic, or creator.</p>
        <SearchBar large className="mt-6" />

        {yours.length > 0 && (
          <section className="mt-10">
            <h2 className="text-lg font-semibold mb-3">Your Games</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {yours.map((g) => (
                <GameCard key={g.id} game={g} large />
              ))}
            </div>
          </section>
        )}

        <section className="mt-10">
          <h2 className="text-lg font-semibold mb-3">Trending Games</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {trending.map((g) => (
              <GameCard key={g.id} game={g} />
            ))}
          </div>
        </section>

        <section className="mt-10">
          <h2 className="text-lg font-semibold mb-3">Trending Skills</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {trendingSkills.map((s) => (
              <Link
                key={s.id}
                href={`/search?q=${encodeURIComponent(s.name)}`}
                className="rounded-2xl border border-border bg-card p-4 hover:bg-hover transition-colors duration-200"
              >
                <div className="font-semibold">{s.name}</div>
                <div className="text-xs text-muted mt-1">{s.tutorials} clips</div>
              </Link>
            ))}
          </div>
        </section>

        <section className="mt-10">
          <div className="flex items-end justify-between gap-4 flex-wrap">
            <h2 className="text-lg font-semibold">Trending Videos</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-4">
            <FilterSelect
              label="Game"
              value={game}
              onChange={setGame}
              options={[
                { id: "all", label: "All games" },
                ...games.map((g) => ({ id: g.id, label: g.name })),
              ]}
            />
            <FilterSelect
              label="Skill"
              value={skill}
              onChange={setSkill}
              options={[
                { id: "all", label: "All skills" },
                { id: "aim", label: "Aim" },
                { id: "mid", label: "Mid / lane" },
                { id: "macro", label: "Macro" },
                { id: "utility", label: "Utility" },
                { id: "farm", label: "Farms" },
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
            <FilterSelect
              label="Duration"
              value={dur}
              onChange={setDur}
              options={[
                { id: "all", label: "Any length" },
                { id: "short", label: "Under 45s" },
                { id: "mid", label: "45–60s" },
                { id: "long", label: "Over 1 min" },
              ]}
            />
            <FilterSelect
              label="Sort"
              value={sort}
              onChange={setSort}
              options={[
                { id: "popular", label: "Popularity" },
                { id: "newest", label: "Newest" },
                { id: "helpful", label: "Most helpful" },
              ]}
            />
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
            {filtered.map((t) => (
              <TutorialCard key={t.id} tutorial={t} />
            ))}
          </div>
        </section>
      </div>
    </AppShell>
  );
}

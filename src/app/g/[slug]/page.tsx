"use client";

import { TutorialCard } from "@/components/cards";
import { GameLogo } from "@/components/GameLogo";
import { AppShell } from "@/components/layout/AppShell";
import { Button, Tabs } from "@/components/ui";
import { getGame } from "@/data/games";
import { tutorialsByGame } from "@/data/tutorials";
import { formatCount } from "@/lib/format";
import { useApp } from "@/lib/store";
import Link from "next/link";
import { notFound, useParams } from "next/navigation";
import { useState } from "react";

export default function GameHubPage() {
  const { slug } = useParams<{ slug: string }>();
  const game = getGame(slug);
  const { selectedGames, toggleSelectedGame } = useApp();
  const [tab, setTab] = useState("videos");

  if (!game) return notFound();

  const clips = tutorialsByGame(game.id);
  const inFeed = selectedGames.includes(game.id);
  const categories = [...new Set(clips.map((clip) => clip.category))];

  return (
    <AppShell publicPage>
      <div className="relative h-64 overflow-hidden md:h-80">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={game.banner} alt="" className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/45 to-black/20" />
        <div className="absolute bottom-6 left-6 right-6 flex items-end justify-between gap-4">
          <div className="flex items-center gap-4">
            <GameLogo game={game} size={64} />
            <div>
              <h1 className="text-3xl font-bold">{game.name}</h1>
              <p className="text-sm text-white/65">{formatCount(game.learners)} players · {formatCount(clips.reduce((sum, clip) => sum + clip.views, 0))} clip views</p>
            </div>
          </div>
          <Button variant={inFeed ? "secondary" : "primary"} onClick={() => toggleSelectedGame(game.id)}>
            {inFeed ? "✓ In your feed" : "+ Add to feed"}
          </Button>
        </div>
      </div>

      <div className="px-6">
        <Tabs
          tabs={[
            { id: "videos", label: "Videos" },
            { id: "topics", label: "Topics" },
            { id: "characters", label: game.id === "valorant" ? "Agents" : "Characters" },
          ]}
          value={tab}
          onChange={setTab}
        />

        {tab === "videos" && (
          <div className="py-8">
            <div className="mb-5 flex items-end justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold">Community clips</h2>
                <p className="mt-1 text-sm text-muted">Tips, mechanics, strategies, and guides uploaded by players.</p>
              </div>
              <Link href={`/search?q=${encodeURIComponent(game.name)}`} className="text-sm font-semibold text-accent">Search {game.short}</Link>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {clips.map((clip) => <TutorialCard key={clip.id} tutorial={clip} />)}
            </div>
          </div>
        )}

        {tab === "topics" && (
          <div className="grid gap-3 py-8 sm:grid-cols-2 lg:grid-cols-3">
            {[...new Set([...game.goals.map((goal) => goal.name), ...categories])].map((topic) => (
              <Link
                key={topic}
                href={`/search?q=${encodeURIComponent(`${game.name} ${topic}`)}`}
                className="rounded-2xl border border-border bg-card p-5 transition-colors hover:bg-hover"
              >
                <div className="font-bold">{topic}</div>
                <p className="mt-1 text-sm text-muted">Browse {game.name} clips tagged with {topic.toLowerCase()}.</p>
              </Link>
            ))}
          </div>
        )}

        {tab === "characters" && (
          <div className="py-8">
            {game.characters.length ? (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 md:grid-cols-5">
                {game.characters.map((character) => (
                  <Link key={character.id} href={`/search?q=${encodeURIComponent(character.name)}`} className="text-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={character.image} alt="" className="h-32 w-full rounded-2xl border border-border object-cover" />
                    <div className="mt-2 font-medium">{character.name}</div>
                    <div className="text-xs text-muted">{character.role}</div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-muted">Browse Topics to find the best community clips for {game.name}.</p>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}

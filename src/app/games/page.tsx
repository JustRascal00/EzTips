"use client";

import { GameCard } from "@/components/cards";
import { AppShell } from "@/components/layout/AppShell";
import { games } from "@/data/games";
import { useApp } from "@/lib/store";

export default function GamesPage() {
  const { selectedGames, toggleSelectedGame } = useApp();

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl px-5 py-8 md:px-8">
        <div className="max-w-2xl">
          <div className="text-xs font-bold uppercase tracking-[0.2em] text-accent">Game directory</div>
          <h1 className="mt-3 text-3xl font-bold">Find clips by game</h1>
          <p className="mt-2 text-muted">
            Open a game to browse its creators, topics, and community-uploaded videos. Your selected games shape the For You feed.
          </p>
        </div>

        <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
          {games.map((game) => (
            <div key={game.id} className="relative">
              <GameCard game={game} />
              <button
                type="button"
                onClick={() => toggleSelectedGame(game.id)}
                className="absolute right-3 top-3 rounded-full border border-white/15 bg-black/60 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur"
              >
                {selectedGames.includes(game.id) ? "✓ In your feed" : "+ Add to feed"}
              </button>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}

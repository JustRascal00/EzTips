"use client";

import { GameCard } from "@/components/cards";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui";
import { games } from "@/data/games";
import { useApp } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { Check, Search, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

export default function OnboardingPage() {
  const { completeOnboarding } = useApp();
  const { configured, loading, user } = useAuth();
  const router = useRouter();
  const [picked, setPicked] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (configured && !loading && !user) router.replace("/auth?mode=signup&next=/onboarding");
  }, [configured, loading, router, user]);

  const visibleGames = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return games;
    return games.filter((game) =>
      [game.name, game.short, game.slug].some((value) => value.toLowerCase().includes(term)),
    );
  }, [query]);

  const selectedGames = games.filter((game) => picked.includes(game.id));

  const toggleGame = (gameId: string) => {
    setPicked((current) =>
      current.includes(gameId)
        ? current.filter((id) => id !== gameId)
        : [...current, gameId],
    );
  };

  return (
    <div className="min-h-screen bg-bg">
      <header className="flex h-16 items-center justify-between border-b border-border px-5 md:px-8">
        <Logo />
        <div className="text-sm font-medium text-muted">Personalize your feed</div>
      </header>

      <main className="mx-auto max-w-5xl px-5 py-10 md:py-14">
        <div className="max-w-2xl">
          <div className="text-xs font-bold uppercase tracking-[0.2em] text-accent">One quick step</div>
          <h1 className="mt-3 text-3xl font-bold tracking-tight md:text-4xl">What games do you play?</h1>
          <p className="mt-3 text-muted">
            Choose one or more games. We&apos;ll start with a broad mix of useful community clips and learn what you like as you watch.
          </p>
        </div>

        <label className="mt-8 flex h-12 max-w-xl items-center gap-3 rounded-2xl border border-border bg-card px-4 focus-within:border-accent/60">
          <Search className="h-5 w-5 shrink-0 text-muted" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search games"
            className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted"
          />
          {query && (
            <button type="button" onClick={() => setQuery("")} aria-label="Clear search" className="text-muted hover:text-text">
              <X className="h-4 w-4" />
            </button>
          )}
        </label>

        {selectedGames.length > 0 && (
          <div className="mt-5 flex flex-wrap items-center gap-2">
            <span className="mr-1 text-xs font-semibold text-muted">Your feed:</span>
            {selectedGames.map((game) => (
              <button
                key={game.id}
                type="button"
                onClick={() => toggleGame(game.id)}
                className="flex items-center gap-1.5 rounded-full border border-accent/40 bg-accent/15 px-3 py-1.5 text-xs font-semibold"
              >
                <Check className="h-3.5 w-3.5 text-accent" />
                {game.name}
                <X className="ml-0.5 h-3 w-3 text-muted" />
              </button>
            ))}
          </div>
        )}

        <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {visibleGames.map((game) => (
            <GameCard
              key={game.id}
              game={game}
              selected={picked.includes(game.id)}
              onSelect={() => toggleGame(game.id)}
            />
          ))}
        </div>

        {visibleGames.length === 0 && (
          <div className="mt-7 rounded-2xl border border-dashed border-border py-14 text-center">
            <h2 className="font-semibold">No games found</h2>
            <p className="mt-1 text-sm text-muted">Try another name. More games can be added as the platform grows.</p>
          </div>
        )}

        <div className="mt-10 flex flex-col items-start justify-between gap-4 border-t border-border pt-6 sm:flex-row sm:items-center">
          <p className="text-sm text-muted">
            {picked.length
              ? `${picked.length} ${picked.length === 1 ? "game" : "games"} selected`
              : "Select at least one game to continue"}
          </p>
          <Button
            size="lg"
            disabled={picked.length === 0 || saving}
            onClick={async () => {
              setSaving(true);
              await completeOnboarding(picked);
              router.push("/home");
            }}
          >
            {saving ? "Saving…" : "Start watching"}
          </Button>
        </div>

        <p className="mt-6 text-center text-xs text-muted">
          No topic quiz. No permanent skill label. Your feed improves naturally from what you watch, save, and follow.
        </p>
      </main>
    </div>
  );
}

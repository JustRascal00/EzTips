"use client";

import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui";
import { cn } from "@/lib/cn";
import { games } from "@/data/games";
import { useApp } from "@/lib/store";
import { useRouter } from "next/navigation";

export default function SettingsPage() {
  const { currentUser, selectedGames, toggleSelectedGame, logout } = useApp();
  const router = useRouter();

  return (
    <AppShell>
      <div className="px-6 py-8 max-w-xl">
        <h1 className="text-3xl font-bold">Settings</h1>
        <section className="mt-8 rounded-2xl border border-border bg-card p-5 space-y-3">
          <h2 className="font-semibold">Account</h2>
          <div className="text-sm text-muted">
            Signed in as {currentUser.displayName} (@{currentUser.username})
          </div>
          <div className="text-sm text-muted">
            Games:{" "}
            {games
              .filter((g) => selectedGames.includes(g.id))
              .map((g) => g.name)
              .join(", ") || "None"}
          </div>
        </section>
        <section className="mt-4 rounded-2xl border border-border bg-card p-5">
          <h2 className="font-semibold">Games in your feed</h2>
          <p className="mt-2 text-sm text-muted">For You only shows clips tagged with the games selected here.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {games.map((game) => {
              const active = selectedGames.includes(game.id);
              return (
                <button
                  key={game.id}
                  type="button"
                  onClick={() => toggleSelectedGame(game.id)}
                  className={cn(
                    "rounded-full border px-3 py-2 text-xs font-semibold transition-colors",
                    active ? "border-accent bg-accent/15 text-text" : "border-border bg-elevated text-muted hover:text-text",
                  )}
                >
                  {active ? "✓ " : "+ "}{game.name}
                </button>
              );
            })}
          </div>
        </section>
        <Button
          variant="danger"
          className="mt-6"
          onClick={async () => {
            await logout();
            router.push("/");
          }}
        >
          Sign out & reset onboarding
        </Button>
      </div>
    </AppShell>
  );
}

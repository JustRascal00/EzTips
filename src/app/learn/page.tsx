"use client";

import { PathCard } from "@/components/cards";
import { AppShell } from "@/components/layout/AppShell";
import { RightRail, RailSection, YourGamesRail } from "@/components/layout/Sidebar";
import { Button, Progress } from "@/components/ui";
import { games } from "@/data/games";
import { learningPaths } from "@/data/paths";
import { formatDuration } from "@/lib/format";
import { useApp } from "@/lib/store";
import Link from "next/link";

export default function LearnPage() {
  const { pathProgress, completedTutorials, currentUser, selectedGames } = useApp();

  const inProgress = learningPaths
    .map((p) => {
      const done = pathProgress[p.id]?.length ?? 0;
      const pct = Math.round((done / p.lessons.length) * 100);
      return { p, done, pct };
    })
    .filter((x) => x.pct > 0 && x.pct < 100)
    .sort((a, b) => b.pct - a.pct);

  const recommended = learningPaths.filter((p) => {
    const pct = Math.round(((pathProgress[p.id]?.length ?? 0) / p.lessons.length) * 100);
    if (pct > 0) return false;
    if (!selectedGames.length) return true;
    return selectedGames.includes(p.gameId);
  });

  const timeSec = completedTutorials.length * 48;

  return (
    <AppShell
      right={
        <RightRail>
          <YourGamesRail />
          <RailSection title="This week">
            <p className="text-sm text-muted">
              Streak {currentUser.streak} days. Finish a lesson on an in-progress path to keep it.
            </p>
          </RailSection>
        </RightRail>
      }
    >
      <div className="px-6 py-8 max-w-4xl">
        <h1 className="text-3xl font-bold">Continue Learning</h1>
        <p className="text-muted mt-1">Paths over infinite scroll. Pick one and finish it.</p>

        <div className="space-y-3 mt-6">
          {inProgress.map(({ p, pct }) => {
            const game = games.find((g) => g.id === p.gameId);
            return (
              <div
                key={p.id}
                className="rounded-2xl border border-border bg-card p-5 flex flex-col sm:flex-row gap-4 sm:items-center"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.thumbnail} alt="" className="h-20 w-32 rounded-xl object-cover" />
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-muted">
                    {game?.name} · {p.category}
                  </div>
                  <h2 className="font-semibold text-lg">{p.title}</h2>
                  <Progress value={pct} className="mt-2" />
                  <div className="text-xs text-muted mt-1">{pct}%</div>
                </div>
                <Link href={`/learn/${p.slug}`}>
                  <Button>Continue →</Button>
                </Link>
              </div>
            );
          })}
        </div>

        <section className="mt-10">
          <h2 className="text-lg font-semibold mb-3">Your Progress</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { k: "Tutorials completed", v: String(completedTutorials.length) },
              { k: "Learning time", v: formatDuration(timeSec) },
              { k: "Current streak", v: `${currentUser.streak} days` },
              { k: "XP earned", v: currentUser.xp.toLocaleString() },
            ].map((s) => (
              <div key={s.k} className="rounded-2xl border border-border bg-card p-4">
                <div className="text-xs text-muted">{s.k}</div>
                <div className="text-2xl font-semibold mt-1">{s.v}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-10">
          <h2 className="text-lg font-semibold mb-3">Recommended Learning Paths</h2>
          <div className="grid md:grid-cols-3 gap-4">
            {recommended.map((p) => (
              <PathCard key={p.id} path={p} />
            ))}
          </div>
        </section>
      </div>
    </AppShell>
  );
}

"use client";

import { AppShell } from "@/components/layout/AppShell";
import { Progress, RankBadge } from "@/components/ui";
import { achievements } from "@/data/notifications";
import { games } from "@/data/games";
import { useApp } from "@/lib/store";
import { cn } from "@/lib/cn";
import { useParams } from "next/navigation";

export default function UserProfilePage() {
  const { username } = useParams<{ username: string }>();
  const { currentUser, selectedGames, collections, followedCreators } = useApp();
  const user = currentUser;

  return (
    <AppShell>
      <div className="px-6 py-8 max-w-4xl">
        <div className="flex gap-5 items-start">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={user.avatar} alt="" className="h-24 w-24 rounded-full border border-border" />
          <div className="flex-1">
            <h1 className="text-3xl font-bold">{user.displayName}</h1>
            <div className="text-muted">@{username || user.username}</div>
            <p className="text-sm mt-3 max-w-lg">{user.bio}</p>
            <div className="flex flex-wrap gap-2 mt-3">
              {user.ranks.map((r) => (
                <RankBadge key={r.gameId} label={`${games.find((g) => g.id === r.gameId)?.short} · ${r.label}`} type="rank" />
              ))}
            </div>
          </div>
        </div>

        <div className="grid sm:grid-cols-3 gap-3 mt-8">
          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="text-xs text-muted">Level</div>
            <div className="text-2xl font-semibold mt-1">{user.level}</div>
            <Progress value={(user.xp / user.xpToNext) * 100} className="mt-2" barClassName="bg-xp" />
            <div className="text-xs text-muted mt-1">
              {user.xp.toLocaleString()} / {user.xpToNext.toLocaleString()} XP
            </div>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="text-xs text-muted">Streak</div>
            <div className="text-2xl font-semibold mt-1">{user.streak} days</div>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="text-xs text-muted">Following</div>
            <div className="text-2xl font-semibold mt-1">{followedCreators.length}</div>
          </div>
        </div>

        <section className="mt-10">
          <h2 className="text-lg font-semibold mb-3">Games played</h2>
          <div className="flex flex-wrap gap-2">
            {games
              .filter((g) => selectedGames.includes(g.id) || user.ranks.some((r) => r.gameId === g.id))
              .map((g) => (
                <div key={g.id} className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={g.icon} alt="" className="h-6 w-6 rounded-md object-cover" />
                  <span className="text-sm font-medium">{g.name}</span>
                </div>
              ))}
          </div>
        </section>

        <section className="mt-10">
          <h2 className="text-lg font-semibold mb-3">Public collections</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {collections
              .filter((c) => c.public)
              .map((c) => (
                <div key={c.id} className="rounded-2xl border border-border bg-card p-4">
                  <div className="font-semibold">{c.name}</div>
                  <div className="text-sm text-muted">{c.tutorialIds.length} clips</div>
                </div>
              ))}
          </div>
        </section>

        <section className="mt-10">
          <h2 className="text-lg font-semibold mb-3">Achievements</h2>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
            {achievements.map((a) => (
              <div
                key={a.id}
                className={cn(
                  "rounded-2xl border p-4",
                  a.earned ? "border-border bg-card" : "border-border bg-elevated opacity-50",
                )}
              >
                <div className="font-semibold">{a.name}</div>
                <div className="text-xs text-muted mt-1">{a.description}</div>
              </div>
            ))}
          </div>
        </section>

      </div>
    </AppShell>
  );
}

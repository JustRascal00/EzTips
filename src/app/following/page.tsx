"use client";

import { FollowButton } from "@/components/actions";
import { TutorialCard } from "@/components/cards";
import { AppShell } from "@/components/layout/AppShell";
import { EmptyState, RankBadge, VerifiedMark } from "@/components/ui";
import { creators } from "@/data/creators";
import { games } from "@/data/games";
import { tutorialsByCreator } from "@/data/tutorials";
import { formatCount } from "@/lib/format";
import { useApp } from "@/lib/store";
import Link from "next/link";

export default function FollowingPage() {
  const { followedCreators } = useApp();
  const list = creators.filter((c) => followedCreators.includes(c.id));
  const feed = list.flatMap((c) => tutorialsByCreator(c.id)).slice(0, 12);

  return (
    <AppShell>
      <div className="px-6 py-8 max-w-5xl">
        <h1 className="text-3xl font-bold">Following</h1>
        <p className="text-muted mt-1">Creators you trust — new tutorials land here first.</p>
        {list.length === 0 ? (
          <EmptyState
            title="You’re not following anyone yet"
            body="Follow a coach or high-rank player and their tutorials will show up in Following."
          />
        ) : (
          <>
            <div className="grid sm:grid-cols-2 gap-3 mt-6">
              {list.map((c) => {
                const game = games.find((g) => g.id === c.gameId);
                return (
                  <div
                    key={c.id}
                    className="rounded-2xl border border-border bg-card p-4 flex items-center gap-3"
                  >
                    <Link href={`/c/${c.username}`} className="flex items-center gap-3 flex-1 min-w-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={c.avatar} alt="" className="h-12 w-12 rounded-full border border-border" />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1 font-semibold">
                          {c.displayName}
                          {c.verified && <VerifiedMark />}
                        </div>
                        <div className="text-xs text-muted truncate">
                          {c.credential.label} · {game?.name} · {formatCount(c.followers)} followers
                        </div>
                      </div>
                    </Link>
                    <RankBadge label={c.credential.label} type={c.credential.type} />
                    <FollowButton creatorId={c.id} size="sm" />
                  </div>
                );
              })}
            </div>
            <h2 className="text-lg font-semibold mt-10 mb-3">Latest from people you follow</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {feed.map((t) => (
                <TutorialCard key={t.id} tutorial={t} />
              ))}
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}

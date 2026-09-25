"use client";

import { FollowButton } from "@/components/actions";
import { TutorialCard } from "@/components/cards";
import { AppShell } from "@/components/layout/AppShell";
import { EmptyState } from "@/components/ui";
import { formatCount } from "@/lib/format";
import { useApp } from "@/lib/store";
import { getProfilesByIds, listTips } from "@/lib/tips";
import type { Tutorial } from "@/lib/types";
import { useSupabaseQuery } from "@/lib/use-tips";
import Link from "next/link";

export default function FollowingPage() {
  const { followedCreators } = useApp();
  const key = followedCreators.join(",");
  const { data: list } = useSupabaseQuery(`following-profiles:${key}`, (client) => getProfilesByIds(client, followedCreators), [] as Awaited<ReturnType<typeof getProfilesByIds>>);
  const { data: feed } = useSupabaseQuery(`following-tips:${key}`, (client) => (followedCreators.length ? listTips(client, { creatorIds: followedCreators, limit: 24 }) : Promise.resolve([])), [] as Tutorial[]);

  return (
    <AppShell>
      <div className="px-4 py-8 max-w-5xl sm:px-6">
        <h1 className="text-3xl font-bold">Following</h1>
        <p className="text-muted mt-1">Creators you trust. Their new tips land here first.</p>
        {followedCreators.length === 0 ? (
          <div className="mt-6">
            <EmptyState title="You’re not following anyone yet" body="Follow a creator from any tip and their uploads will show up here." />
          </div>
        ) : (
          <>
            <div className="grid sm:grid-cols-2 gap-3 mt-6">
              {list.map((c) => (
                <div key={c.id} className="rounded-2xl border border-border bg-card p-4 flex items-center gap-3">
                  <Link href={`/u/${c.username}`} className="flex items-center gap-3 flex-1 min-w-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={c.avatar_url || `https://api.dicebear.com/9.x/adventurer/svg?seed=${encodeURIComponent(c.username)}`} alt="" className="h-12 w-12 rounded-full border border-border" />
                    <div className="min-w-0">
                      <div className="font-semibold truncate">{c.display_name}</div>
                      <div className="text-xs text-muted truncate">@{c.username} · {formatCount(c.follower_count ?? 0)} followers</div>
                    </div>
                  </Link>
                  <FollowButton creatorId={c.id} size="sm" />
                </div>
              ))}
            </div>
            <h2 className="text-lg font-semibold mt-10 mb-3">Latest from people you follow</h2>
            {feed.length === 0 ? (
              <p className="text-sm text-muted">No tips from them yet.</p>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {feed.map((t) => <TutorialCard key={t.id} tutorial={t} />)}
              </div>
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}

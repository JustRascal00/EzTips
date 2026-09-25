"use client";

import { FollowButton, PatchBadge, SaveControl, StillWorksControl, VoteControl } from "@/components/actions";
import { CommentThread } from "@/components/Comments";
import { TutorialCard } from "@/components/cards";
import { AppShell } from "@/components/layout/AppShell";
import { RightRail, RailSection } from "@/components/layout/Sidebar";
import { VideoPlayer } from "@/components/VideoPlayer";
import { Chip, RankBadge } from "@/components/ui";
import { formatDuration, formatCount, skillLabel } from "@/lib/format";
import { listTips } from "@/lib/tips";
import { useCurrentPatch, useSupabaseQuery } from "@/lib/use-tips";
import { useApp } from "@/lib/store";
import { Share2 } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";
import type { Tutorial } from "@/lib/types";

export function TutorialView({ tutorial }: { tutorial: Tutorial }) {
  const { addHistory, toast } = useApp();
  const { patch: currentPatch } = useCurrentPatch();
  const tutorialId = tutorial.id;

  useEffect(() => {
    addHistory(tutorialId);
  }, [tutorialId, addHistory]);

  const creator = tutorial.creatorUsername ? {
    id: tutorial.creatorId,
    username: tutorial.creatorUsername,
    displayName: tutorial.creatorDisplayName || tutorial.creatorUsername,
    avatar: tutorial.creatorAvatar || `https://api.dicebear.com/9.x/adventurer/svg?seed=${encodeURIComponent(tutorial.creatorUsername)}`,
  } : undefined;
  // Related: same champion first, otherwise same role.
  const relatedKey = `related:${tutorial.id}:${tutorial.championId ?? ""}:${tutorial.roleId ?? ""}`;
  const { data: related } = useSupabaseQuery(relatedKey, async (client) => {
    const byChampion = tutorial.championId ? await listTips(client, { championId: tutorial.championId, excludeId: tutorial.id, sort: "top", limit: 6 }) : [];
    if (byChampion.length >= 4 || !tutorial.roleId) return byChampion;
    const byRole = await listTips(client, { roleId: tutorial.roleId, excludeId: tutorial.id, sort: "top", limit: 6 });
    return [...byChampion, ...byRole.filter((t) => !byChampion.some((b) => b.id === t.id))].slice(0, 6);
  }, [] as Tutorial[]);
  const roleLabel = tutorial.roleId ? ({ top: "Top", jungle: "Jungle", mid: "Mid", adc: "ADC", support: "Support" } as Record<string, string>)[tutorial.roleId] : null;
  const mapLabel = tutorial.mapId ? ({ sr: "Summoner's Rift", aram: "ARAM", arena: "Arena" } as Record<string, string>)[tutorial.mapId] : null;

  return (
    <AppShell
      publicPage
      right={
        <RightRail>
          <RailSection title="Related">
            <div className="space-y-3">
              {related.slice(0, 4).map((t) => (
                <Link key={t.id} href={`/t/${t.slug}`} className="block text-sm text-muted hover:text-text">
                  {t.title}
                </Link>
              ))}
            </div>
          </RailSection>
        </RightRail>
      }
    >
      <article className="max-w-3xl px-6 py-8">
        <div className="aspect-video w-full">
          <VideoPlayer
            src={tutorial.videoUrl}
            poster={tutorial.thumbnail}
            active
            captions={tutorial.learn}
            className="h-full w-full"
          />
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-2 text-sm text-muted">
          {tutorial.championName && (
            <Link href={`/search?q=${encodeURIComponent(tutorial.championName)}`} className="font-semibold text-text hover:text-accent">{tutorial.championName}</Link>
          )}
          {roleLabel && <span>· {roleLabel}</span>}
          {mapLabel && <span>· {mapLabel}</span>}
          <span>· {tutorial.topic}</span>
          <PatchBadge patch={tutorial.patch} current={tutorial.patchIsCurrent} outdated={tutorial.outdated} />
        </div>
        <h1 className="text-3xl font-bold mt-2 tracking-tight">{tutorial.title}</h1>
        {creator && (
          <div className="flex items-center justify-between gap-3 mt-4 flex-wrap">
            <Link href={`/u/${creator.username}`} className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={creator.avatar} alt="" className="h-11 w-11 rounded-full border border-border" />
              <div>
                <div className="font-semibold">{creator.displayName}</div>
                <div className="text-xs text-muted">@{creator.username}</div>
              </div>
            </Link>
            <FollowButton creatorId={creator.id} />
          </div>
        )}
        <div className="flex items-center gap-2 mt-3 text-sm text-muted">
          <RankBadge label={skillLabel(tutorial.skillLevel)} type="level" />
          <span>{formatDuration(tutorial.duration)}</span>
          <span>·</span>
          <span>{formatCount(tutorial.views)} views</span>
        </div>
        <div className="flex flex-wrap items-center gap-2 mt-4">
          <VoteControl
            tipId={tutorial.id}
            ownerId={tutorial.creatorId}
            initial={{ upvotes: tutorial.upvotes ?? 0, downvotes: tutorial.downvotes ?? 0, score: tutorial.score ?? 0 }}
          />
          <SaveControl tutorialId={tutorial.id} />
          <button
            onClick={() => {
              navigator.clipboard?.writeText(window.location.href);
              toast("Link copied");
            }}
            className="h-10 w-10 rounded-xl border border-border bg-card grid place-items-center hover:bg-hover"
            aria-label="Share"
          >
            <Share2 className="h-4 w-4" />
          </button>
        </div>
        {tutorial.outdated && (
          <div className="mt-4 rounded-xl border border-amber-400/25 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
            This tip may be outdated{tutorial.patch ? `: it was made on patch ${tutorial.patch}` : ""}{tutorial.patchesBehind ? ` (${tutorial.patchesBehind} patches ago)` : ""}, or players reported it no longer works.
          </div>
        )}
        <div className="mt-4">
          <StillWorksControl
            tipId={tutorial.id}
            patch={currentPatch}
            initialPct={tutorial.stillWorksPct ?? null}
            initialYes={tutorial.stillWorksYes ?? 0}
            initialNo={tutorial.stillWorksNo ?? 0}
          />
        </div>
        <div className="flex flex-wrap gap-1.5 mt-4">
          {tutorial.tags.map((tag) => (
            <Link key={tag.toLocaleLowerCase()} href={`/search?q=${encodeURIComponent(tag)}`}>
              <Chip>#{tag}</Chip>
            </Link>
          ))}
        </div>

        {tutorial.learn && (
          <section className="mt-10">
            <h2 className="text-lg font-semibold">About this clip</h2>
            <p className="text-muted mt-2 leading-relaxed">{tutorial.learn}</p>
          </section>
        )}
        {tutorial.takeaways.length > 0 && (
          <section className="mt-8">
            <h2 className="text-lg font-semibold">Key points</h2>
            <ol className="mt-3 space-y-2">
              {tutorial.takeaways.map((k, i) => (
                <li key={k} className="flex gap-3 text-sm leading-relaxed">
                  <span className="text-muted w-5">{String(i + 1).padStart(2, "0")}</span>
                  {k}
                </li>
              ))}
            </ol>
          </section>
        )}
        {related.length > 0 && <section className="mt-10">
          <h2 className="text-lg font-semibold mb-4">Related clips</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {related.map((t) => (
              <TutorialCard key={t.id} tutorial={t} />
            ))}
          </div>
        </section>}
        <div id="comments" className="mt-12">
          <CommentThread tutorialId={tutorial.id} />
        </div>
      </article>
    </AppShell>
  );
}

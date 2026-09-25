"use client";

import { FollowButton, PatchBadge, StillWorksControl, VoteControl } from "@/components/actions";
import { CommentThread } from "@/components/Comments";
import { AppShell } from "@/components/layout/AppShell";
import { ChampionIcon, TipRail } from "@/components/league";
import { VideoPlayer } from "@/components/VideoPlayer";
import { buttonClass } from "@/components/ui";
import { cn } from "@/lib/cn";
import { formatCount, formatDuration, formatTimeAgo, skillLabel } from "@/lib/format";
import { MAP_LABEL, ROLE_LABEL } from "@/lib/league";
import { useApp } from "@/lib/store";
import { listTips } from "@/lib/tips";
import type { Tutorial } from "@/lib/types";
import { useCurrentPatch, useSupabaseQuery } from "@/lib/use-tips";
import { AlertTriangle, Bookmark, ChevronRight, Flag, Link2 } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";

export function TutorialView({ tutorial: tip }: { tutorial: Tutorial }) {
  const { addHistory, toast, saved, toggleSave } = useApp();
  const { patch: currentPatch } = useCurrentPatch();
  const isSaved = saved.includes(tip.id);

  useEffect(() => { addHistory(tip.id); }, [tip.id, addHistory]);

  const { data: more, loading: moreLoading } = useSupabaseQuery(`more:${tip.id}:${tip.championId ?? ""}:${tip.roleId ?? ""}`, async (client) => {
    const byChampion = tip.championId ? await listTips(client, { championId: tip.championId, excludeId: tip.id, sort: "top", limit: 12 }) : [];
    if (byChampion.length >= 6 || !tip.roleId) return byChampion;
    const byRole = await listTips(client, { roleId: tip.roleId, excludeId: tip.id, sort: "top", limit: 12 });
    return [...byChampion, ...byRole.filter((t) => !byChampion.some((b) => b.id === t.id))].slice(0, 12);
  }, [] as Tutorial[]);

  const creatorAvatar = tip.creatorAvatar || `https://api.dicebear.com/9.x/adventurer/svg?seed=${encodeURIComponent(tip.creatorUsername ?? "eztips")}`;
  const facts = [
    tip.roleId ? ROLE_LABEL[tip.roleId] : null,
    tip.mapId ? MAP_LABEL[tip.mapId] : null,
    skillLabel(tip.skillLevel),
    formatDuration(tip.duration),
    `${formatCount(tip.views)} views`,
    formatTimeAgo(tip.createdAt),
  ].filter(Boolean);

  return (
    <AppShell publicPage>
      {/* breadcrumb */}
      <nav className="flex items-center gap-1.5 pt-5 text-sm text-muted">
        <Link href="/" className="hover:text-white">Champions</Link>
        {tip.championId && <><ChevronRight className="h-3.5 w-3.5" /><Link href={`/champions/${tip.championId}`} className="hover:text-white">{tip.championName}</Link></>}
        <ChevronRight className="h-3.5 w-3.5" /><span className="truncate text-white/80">Tip</span>
      </nav>

      <div className="mt-4 grid gap-6 lg:grid-cols-[minmax(0,430px)_1fr] lg:gap-10">
        {/* ── Video ─────────────────────────────── */}
        <div className="lg:sticky lg:top-20 lg:self-start">
          <div className="relative mx-auto aspect-[9/16] w-full max-w-[430px] overflow-hidden rounded-3xl border border-white/[0.06] bg-black shadow-2xl shadow-black/60 lg:max-h-[calc(100dvh-7rem)] lg:w-auto">
            <VideoPlayer src={tip.videoUrl} poster={tip.thumbnail} active captions={tip.learn} vertical className="absolute inset-0 h-full w-full" />
          </div>
        </div>

        {/* ── Details ───────────────────────────── */}
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            {tip.championId && (
              <Link href={`/champions/${tip.championId}`} className="inline-flex items-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.03] py-1 pl-1 pr-3 text-sm font-bold hover:border-accent/40">
                <ChampionIcon id={tip.championId} size={28} className="rounded-lg" />{tip.championName}
              </Link>
            )}
            <PatchBadge patch={tip.patch} current={tip.patchIsCurrent} outdated={tip.outdated} className="text-xs" />
            {tip.topic && <span className="rounded-md bg-white/[0.05] px-2 py-0.5 text-xs font-semibold text-muted">{tip.topic}</span>}
          </div>

          <h1 className="display mt-3 text-4xl font-extrabold leading-[1.02] sm:text-5xl">{tip.title}</h1>
          <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-sm text-muted">
            {facts.map((f, i) => <span key={i} className="flex items-center gap-3">{i > 0 && <span className="h-1 w-1 rounded-full bg-white/20" />}{f}</span>)}
          </div>

          {/* actions */}
          <div className="mt-5 flex flex-wrap items-center gap-2">
            <VoteControl tipId={tip.id} ownerId={tip.creatorId} initial={{ upvotes: tip.upvotes ?? 0, downvotes: tip.downvotes ?? 0, score: tip.score ?? 0 }} />
            <button type="button" onClick={() => toggleSave(tip.id)} className={buttonClass(isSaved ? "outline" : "secondary", "md", cn(isSaved && "border-accent/60 text-accent"))}>
              <Bookmark className={cn("h-4 w-4", isSaved && "fill-current")} />{isSaved ? "Saved" : "Save"}
            </button>
            <button type="button" onClick={() => { navigator.clipboard?.writeText(window.location.href); toast("Link copied"); }} className={buttonClass("secondary", "md")}>
              <Link2 className="h-4 w-4" />Share
            </button>
            <button type="button" onClick={() => toast("Reporting arrives with moderation")} className={buttonClass("ghost", "icon")} aria-label="Report"><Flag className="h-4 w-4" /></button>
          </div>

          {tip.outdated && (
            <div className="mt-5 flex gap-3 rounded-2xl border border-amber-400/25 bg-amber-400/[0.08] p-4 text-sm text-amber-100">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
              <p>This tip may be outdated{tip.patch ? `: it was made on patch ${tip.patch}` : ""}{tip.patchesBehind ? `, ${tip.patchesBehind} patches ago` : ""}, or players reported it no longer works on {currentPatch ?? "the current patch"}.</p>
            </div>
          )}

          <div className="mt-5">
            <StillWorksControl tipId={tip.id} patch={currentPatch} initialPct={tip.stillWorksPct ?? null} initialYes={tip.stillWorksYes ?? 0} initialNo={tip.stillWorksNo ?? 0} />
          </div>

          {/* creator */}
          {tip.creatorUsername && (
            <div className="mt-5 flex items-center justify-between gap-3 rounded-2xl border border-white/[0.06] bg-panel p-4">
              <Link href={`/u/${tip.creatorUsername}`} className="flex min-w-0 items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={creatorAvatar} alt="" className="h-11 w-11 rounded-full border border-white/10" />
                <div className="min-w-0">
                  <div className="truncate font-semibold">{tip.creatorDisplayName ?? tip.creatorUsername}</div>
                  <div className="truncate text-xs text-muted">@{tip.creatorUsername}</div>
                </div>
              </Link>
              <FollowButton creatorId={tip.creatorId} />
            </div>
          )}

          {(tip.learn || tip.takeaways.length > 0) && (
            <section className="mt-8">
              <h2 className="display text-2xl font-bold">What you&apos;ll learn</h2>
              {tip.learn && <p className="mt-2 leading-7 text-white/75">{tip.learn}</p>}
              {tip.takeaways.length > 0 && (
                <ol className="mt-4 space-y-2">
                  {tip.takeaways.map((k, i) => (
                    <li key={k} className="flex gap-3 rounded-xl border border-white/[0.05] bg-white/[0.02] p-3 text-sm leading-6">
                      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-accent/15 text-xs font-bold text-accent">{i + 1}</span>
                      {k}
                    </li>
                  ))}
                </ol>
              )}
            </section>
          )}

          {tip.tags.length > 0 && (
            <div className="mt-6 flex flex-wrap gap-1.5">
              {tip.tags.map((tag) => (
                <Link key={tag.toLowerCase()} href={`/search?q=${encodeURIComponent(tag)}`} className="rounded-full border border-white/[0.07] bg-white/[0.03] px-2.5 py-1 text-xs font-semibold text-muted hover:border-accent/40 hover:text-white">#{tag}</Link>
              ))}
            </div>
          )}

          <div id="comments" className="mt-10">
            <CommentThread tutorialId={tip.id} />
          </div>
        </div>
      </div>

      <div className="mt-14">
        <TipRail title={tip.championName ? `More ${tip.championName} tips` : "More tips"} href={tip.championId ? `/champions/${tip.championId}` : "/explore"} tips={more} loading={moreLoading} />
      </div>
    </AppShell>
  );
}

"use client";

import { FollowButton, PatchBadge, SaveControl, VoteControl } from "@/components/actions";
import { CommentThread } from "@/components/Comments";
import { ChampionIcon } from "@/components/league";
import { VideoPlayer } from "@/components/VideoPlayer";
import { buttonClass } from "@/components/ui";
import { cn } from "@/lib/cn";
import { formatCount } from "@/lib/format";
import { ROLE_LABEL } from "@/lib/league";
import { useApp, type VideoSignal } from "@/lib/store";
import { listTips } from "@/lib/tips";
import type { Tutorial } from "@/lib/types";
import { useSupabaseQuery } from "@/lib/use-tips";
import { CheckCircle2, ChevronDown, ChevronUp, MessageCircle, Share2, Sparkles, X } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type FeedTab = "foryou" | "following";
type FeedBehavior = { liked: string[]; saved: string[]; completedTutorials: string[]; followedCreators: string[]; searches: string[]; videoSignals: Record<string, VideoSignal> };

/** Personal ordering: champions/topics you engage with float up, finished clips sink. */
function personalizedOrder(list: Tutorial[], behavior: FeedBehavior) {
  const affinity = new Map<string, number>();
  const keys = (t: Tutorial) => [t.championId ?? "", t.roleId ?? "", t.topic, ...t.tags].filter(Boolean).map((k) => k.toLowerCase());
  for (const t of list) {
    const s = behavior.videoSignals[t.id];
    let w = (behavior.liked.includes(t.id) ? 3 : 0) + (behavior.saved.includes(t.id) ? 5 : 0) + (behavior.completedTutorials.includes(t.id) ? 2 : 0);
    if (s) w += s.completions * 3 + s.rewatches * 2 + s.shares * 4 - s.skips * 1.5;
    if (w) keys(t).forEach((k) => affinity.set(k, (affinity.get(k) ?? 0) + w));
  }
  const score = (t: Tutorial) => {
    const s = behavior.videoSignals[t.id];
    const topic = keys(t).reduce((sum, k) => sum + (affinity.get(k) ?? 0), 0);
    const text = `${t.title} ${t.championName ?? ""} ${t.topic} ${t.tags.join(" ")}`.toLowerCase();
    const search = behavior.searches.reduce((sum, q) => sum + q.toLowerCase().split(/\s+/).filter((w) => w.length > 2 && text.includes(w)).length * 1.5, 0);
    return (t.score ?? 0) * 0.6 + topic * 0.45 + search + (behavior.followedCreators.includes(t.creatorId) ? 4 : 0) - (t.outdated ? 6 : 0) - (s?.completions ?? 0) * 2;
  };
  return [...list].sort((a, b) => score(b) - score(a));
}

function RailButton({ label, count, onClick, children }: { label: string; count?: number; onClick?: () => void; children: React.ReactNode }) {
  return (
    <button type="button" aria-label={label} title={label} onClick={onClick} className="group flex flex-col items-center gap-1 text-[11px] font-bold text-white/80">
      <span className="grid h-11 w-11 place-items-center rounded-full border border-white/10 bg-black/45 backdrop-blur-md transition group-hover:bg-white/15 md:bg-white/[0.07]">{children}</span>
      {count !== undefined && <span className="tabular">{formatCount(count)}</span>}
    </button>
  );
}

function creatorAvatar(t: Tutorial) {
  return t.creatorAvatar || `https://api.dicebear.com/9.x/adventurer/svg?seed=${encodeURIComponent(t.creatorUsername ?? "eztips")}`;
}

function FeedItem({ tip, active, onActivate, onOpenComments }: { tip: Tutorial; active: boolean; onActivate: () => void; onOpenComments: () => void }) {
  const { completedTutorials, toast, recordVideoComplete, recordVideoShare } = useApp();
  const watched = completedTutorials.includes(tip.id);
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => { if (entry.isIntersecting && entry.intersectionRatio >= 0.68) onActivate(); }, { threshold: [0.68] });
    observer.observe(el);
    return () => observer.disconnect();
  }, [onActivate]);

  return (
    <section ref={ref} data-feed-item className="snap-item relative flex h-full items-center justify-center md:py-4">
      <div className="relative h-full md:h-[calc(100%-0.5rem)]">
        <article className="relative h-full w-screen overflow-hidden bg-black md:aspect-[9/16] md:w-auto md:max-w-[calc(100vw-9rem)] md:rounded-[28px] md:border md:border-white/[0.06] md:shadow-[0_30px_90px_rgba(0,0,0,.6)]">
          <VideoPlayer src={tip.videoUrl} poster={tip.thumbnail} active={active} onEnded={() => recordVideoComplete(tip.id)} vertical className="absolute inset-0 h-full w-full" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[50%] bg-gradient-to-t from-black via-black/60 to-transparent" />

          <div className="absolute inset-x-4 bottom-5 z-20 pr-16 md:inset-x-5 md:pr-2">
            <div className="flex flex-wrap items-center gap-1.5">
              {tip.championId && (
                <Link href={`/champions/${tip.championId}`} className="inline-flex items-center gap-1.5 rounded-lg bg-black/50 py-0.5 pl-0.5 pr-2 text-xs font-bold text-white backdrop-blur hover:bg-black/70">
                  <ChampionIcon id={tip.championId} size={22} className="rounded-md" />{tip.championName}
                </Link>
              )}
              {tip.roleId && <span className="rounded-lg bg-black/50 px-2 py-1 text-[11px] font-bold text-white/80 backdrop-blur">{ROLE_LABEL[tip.roleId]}</span>}
              <PatchBadge patch={tip.patch} current={tip.patchIsCurrent} outdated={tip.outdated} />
              {typeof tip.stillWorksPct === "number" && <span className="rounded-md bg-success/20 px-1.5 py-0.5 text-[11px] font-bold text-success">{tip.stillWorksPct}% works</span>}
            </div>
            <Link href={`/t/${tip.slug}`}><h2 className="mt-2.5 text-xl font-bold leading-tight text-white drop-shadow sm:text-[22px]">{tip.title}</h2></Link>
            {tip.learn && <p className="mt-1.5 line-clamp-2 text-[13px] leading-5 text-white/70">{tip.learn}</p>}
            {tip.creatorUsername && (
              <div className="mt-3 flex items-center gap-2.5">
                <Link href={`/u/${tip.creatorUsername}`} className="flex min-w-0 items-center gap-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={creatorAvatar(tip)} alt="" className="h-8 w-8 rounded-full border border-white/20" />
                  <span className="truncate text-sm font-semibold text-white">@{tip.creatorUsername}</span>
                </Link>
                <FollowButton creatorId={tip.creatorId} size="sm" />
                {watched && <span className="ml-auto flex items-center gap-1 text-[11px] text-white/60"><CheckCircle2 className="h-3.5 w-3.5 text-success" />Watched</span>}
              </div>
            )}
          </div>
        </article>

        {/* action rail: inside the video on phones, beside it on desktop */}
        <div className="absolute bottom-6 right-3 z-30 flex flex-col items-center gap-3.5 md:-right-[72px] md:bottom-2">
          <VoteControl vertical tipId={tip.id} ownerId={tip.creatorId} initial={{ upvotes: tip.upvotes ?? 0, downvotes: tip.downvotes ?? 0, score: tip.score ?? 0 }} />
          <RailButton label="Comments" count={tip.comments} onClick={onOpenComments}><MessageCircle className="h-5 w-5" /></RailButton>
          <SaveControl tutorialId={tip.id} vertical />
          <RailButton label="Share" onClick={() => { navigator.clipboard?.writeText(`${window.location.origin}/t/${tip.slug}`); recordVideoShare(tip.id); toast("Link copied"); }}><Share2 className="h-5 w-5" /></RailButton>
        </div>
      </div>
    </section>
  );
}

export function HomeFeed() {
  const { followedCreators, liked, saved, completedTutorials, searches, videoSignals, addHistory, recordVideoStart, recordVideoSkip, toggleSave, toggleFollowCreator, isLoggedIn } = useApp();
  const [tab, setTab] = useState<FeedTab>("foryou");
  const [activeIndex, setActiveIndex] = useState(0);
  const [commentsTip, setCommentsTip] = useState<Tutorial | null>(null);
  const { data: tips, loading } = useSupabaseQuery("home-feed", (client) => listTips(client, { sort: "top", limit: 100 }), [] as Tutorial[]);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const activeIndexRef = useRef(0);
  const wheelLock = useRef(false);
  const wheelDelta = useRef(0);
  const behavior = useMemo<FeedBehavior>(() => ({ liked, saved, completedTutorials, followedCreators, searches, videoSignals }), [completedTutorials, followedCreators, liked, saved, searches, videoSignals]);

  // Order is computed once per tab/data load so the feed doesn't reshuffle while you watch.
  const feed = useMemo(() => {
    if (tab === "following") return tips.filter((t) => followedCreators.includes(t.creatorId));
    return personalizedOrder(tips, behavior);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, tips]);

  const scrollTo = useCallback((index: number) => {
    const scroller = scrollerRef.current;
    const target = scroller?.querySelectorAll<HTMLElement>("[data-feed-item]")[index];
    if (!scroller || !target) return;
    activeIndexRef.current = index;
    setActiveIndex(index);
    scroller.scrollTo({ top: target.offsetTop, behavior: "smooth" });
  }, []);

  const switchTab = (next: FeedTab) => { setTab(next); setActiveIndex(0); activeIndexRef.current = 0; scrollerRef.current?.scrollTo({ top: 0 }); };

  useEffect(() => { activeIndexRef.current = activeIndex; }, [activeIndex]);

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    let timer: number | undefined;
    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || commentsTip) return;
      e.preventDefault();
      if (wheelLock.current) return;
      wheelDelta.current += e.deltaY;
      if (Math.abs(wheelDelta.current) < 24) return;
      const dir = wheelDelta.current > 0 ? 1 : -1;
      wheelDelta.current = 0;
      const next = Math.max(0, Math.min(feed.length - 1, activeIndexRef.current + dir));
      if (next === activeIndexRef.current) return;
      wheelLock.current = true;
      scrollTo(next);
      timer = window.setTimeout(() => { wheelLock.current = false; }, 520);
    };
    scroller.addEventListener("wheel", onWheel, { passive: false });
    return () => { scroller.removeEventListener("wheel", onWheel); if (timer) window.clearTimeout(timer); wheelLock.current = false; wheelDelta.current = 0; };
  }, [commentsTip, feed.length, scrollTo]);

  const activeId = feed[activeIndex]?.id;
  useEffect(() => {
    if (!activeId) return;
    const startedAt = Date.now();
    addHistory(activeId);
    recordVideoStart(activeId);
    return () => { if (Date.now() - startedAt < 2500) recordVideoSkip(activeId); };
  }, [activeId, addHistory, recordVideoSkip, recordVideoStart]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (["INPUT", "TEXTAREA", "SELECT"].includes((e.target as HTMLElement)?.tagName) || commentsTip) return;
      const key = e.key.toLowerCase();
      const current = feed[activeIndex];
      if (key === "s" && current) { e.preventDefault(); toggleSave(current.id); return; }
      if (key === "f" && current) { toggleFollowCreator(current.creatorId); return; }
      if (e.key === "ArrowDown" || key === "j") { e.preventDefault(); scrollTo(Math.min(feed.length - 1, activeIndex + 1)); }
      if (e.key === "ArrowUp" || key === "k") { e.preventDefault(); scrollTo(Math.max(0, activeIndex - 1)); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [activeIndex, commentsTip, feed, scrollTo, toggleFollowCreator, toggleSave]);

  return (
    <div className="relative h-full overflow-hidden bg-bg">
      {/* tabs, TikTok-style */}
      <div className="pointer-events-none absolute inset-x-0 top-3 z-40 flex justify-center">
        <div className="pointer-events-auto flex items-center gap-1 rounded-full border border-white/10 bg-black/45 p-1 backdrop-blur-xl">
          {([["following", "Following"], ["foryou", "For You"]] as const).map(([id, label]) => (
            <button key={id} type="button" onClick={() => switchTab(id)} className={cn("h-8 rounded-full px-4 text-sm font-bold transition-colors", tab === id ? "bg-white text-black" : "text-white/70 hover:text-white")}>{label}</button>
          ))}
        </div>
      </div>

      {/* up / down buttons on desktop */}
      {feed.length > 1 && (
        <div className="absolute right-6 top-1/2 z-30 hidden -translate-y-1/2 flex-col gap-2 lg:flex">
          <button type="button" aria-label="Previous tip" disabled={activeIndex === 0} onClick={() => scrollTo(activeIndex - 1)} className={buttonClass("secondary", "icon", "rounded-full")}><ChevronUp className="h-5 w-5" /></button>
          <button type="button" aria-label="Next tip" disabled={activeIndex >= feed.length - 1} onClick={() => scrollTo(activeIndex + 1)} className={buttonClass("secondary", "icon", "rounded-full")}><ChevronDown className="h-5 w-5" /></button>
        </div>
      )}

      <div ref={scrollerRef} className="snap-feed no-scrollbar h-full overflow-y-auto">
        {loading && feed.length === 0 ? (
          <div className="flex h-full items-center justify-center"><div className="shimmer aspect-[9/16] h-[80%] rounded-[28px]" /></div>
        ) : feed.length ? (
          feed.map((tip, index) => <FeedItem key={tip.id} tip={tip} active={activeIndex === index} onActivate={() => setActiveIndex(index)} onOpenComments={() => setCommentsTip(tip)} />)
        ) : (
          <div className="grid h-full place-items-center px-6 text-center">
            <div className="max-w-sm rounded-3xl border border-white/[0.07] bg-panel p-8">
              <Sparkles className="mx-auto h-7 w-7 text-accent" />
              <h2 className="display mt-4 text-2xl font-bold">{tab === "following" ? (isLoggedIn ? "Nothing from people you follow yet" : "Sign in to follow creators") : "No tips yet"}</h2>
              <p className="mt-2 text-sm text-muted">{tab === "following" ? "Follow creators from any tip and their uploads show up here." : "Upload the first one from Creator Studio."}</p>
              <button type="button" onClick={() => switchTab("foryou")} className={buttonClass("primary", "md", "mt-5")}>Back to For You</button>
            </div>
          </div>
        )}
      </div>

      {/* comments drawer */}
      <div className={cn("fixed inset-0 z-[70] transition", commentsTip ? "pointer-events-auto" : "pointer-events-none")} aria-hidden={!commentsTip}>
        <button aria-label="Close comments" onClick={() => setCommentsTip(null)} className={cn("absolute inset-0 bg-black/50 transition-opacity", commentsTip ? "opacity-100" : "opacity-0")} />
        <aside className={cn("absolute inset-x-0 bottom-0 h-[75dvh] rounded-t-3xl border-t border-white/[0.08] bg-panel shadow-2xl transition-transform duration-200 md:inset-y-0 md:left-auto md:right-0 md:h-full md:w-[420px] md:rounded-none md:border-l md:border-t-0", commentsTip ? "translate-y-0 md:translate-x-0" : "translate-y-full md:translate-x-full md:translate-y-0")}>
          <div className="flex h-14 items-center justify-between border-b border-white/[0.06] px-5">
            <div className="font-semibold">{commentsTip ? formatCount(commentsTip.comments) : 0} comments</div>
            <button type="button" onClick={() => setCommentsTip(null)} className="grid h-9 w-9 place-items-center rounded-xl text-muted hover:bg-white/[0.06] hover:text-white"><X className="h-5 w-5" /></button>
          </div>
          <div className="h-[calc(100%-3.5rem)] overflow-y-auto p-5">{commentsTip && <CommentThread tutorialId={commentsTip.id} />}</div>
        </aside>
      </div>
    </div>
  );
}

"use client";

import { FollowButton, SaveControl } from "@/components/actions";
import { CommentThread } from "@/components/Comments";
import { GameLogo } from "@/components/GameLogo";
import { VideoPlayer } from "@/components/VideoPlayer";
import { creators } from "@/data/creators";
import { games } from "@/data/games";
import { tutorials } from "@/data/tutorials";
import { cn } from "@/lib/cn";
import { formatCount } from "@/lib/format";
import { useApp, type VideoSignal } from "@/lib/store";
import { fetchCommunityVideos } from "@/lib/supabase/videos";
import type { Tutorial } from "@/lib/types";
import { ArrowDown, CheckCircle2, Clock3, Heart, MessageCircle, MoreHorizontal, Plus, Search, Share2, Sparkles, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type FeedTab = "foryou" | "following" | "explore";
type FeedBehavior = { liked: string[]; saved: string[]; completedTutorials: string[]; followedCreators: string[]; searches: string[]; videoSignals: Record<string, VideoSignal> };

function personalizedOrder(list: Tutorial[], gameOrder: string[], behavior: FeedBehavior) {
  const topicAffinity = new Map<string, number>();
  const gameAffinity = new Map<string, number>();
  const addAffinity = (tutorial: Tutorial, weight: number) => {
    gameAffinity.set(tutorial.gameId, (gameAffinity.get(tutorial.gameId) ?? 0) + weight);
    [tutorial.category, tutorial.topic, ...tutorial.tags].forEach((value) => topicAffinity.set(value.toLowerCase(), (topicAffinity.get(value.toLowerCase()) ?? 0) + weight));
  };
  list.forEach((tutorial) => {
    const signal = behavior.videoSignals[tutorial.id];
    let weight = (behavior.liked.includes(tutorial.id) ? 3 : 0) + (behavior.saved.includes(tutorial.id) ? 5 : 0) + (behavior.completedTutorials.includes(tutorial.id) ? 2 : 0);
    if (signal) weight += signal.completions * 3 + signal.rewatches * 2 + signal.shares * 4 - signal.skips * 1.5;
    if (weight) addAffinity(tutorial, weight);
  });
  const score = (tutorial: Tutorial) => {
    const signal = behavior.videoSignals[tutorial.id];
    const topicScore = [tutorial.category, tutorial.topic, ...tutorial.tags].reduce((sum, value) => sum + (topicAffinity.get(value.toLowerCase()) ?? 0), 0);
    const searchable = `${tutorial.title} ${tutorial.category} ${tutorial.topic} ${tutorial.tags.join(" ")}`.toLowerCase();
    const searchScore = behavior.searches.reduce((sum, query) => sum + query.toLowerCase().split(/\s+/).filter((word) => word.length > 2 && searchable.includes(word)).length * 1.5, 0);
    return Math.log10(tutorial.views + 1) * 0.25 + topicScore * 0.45 + searchScore + (behavior.followedCreators.includes(tutorial.creatorId) ? 4 : 0) - (signal?.completions ?? 0) * 0.5;
  };
  const groups = new Map<string, Tutorial[]>();
  gameOrder.forEach((gameId) => groups.set(gameId, list.filter((tutorial) => tutorial.gameId === gameId).sort((a, b) => score(b) - score(a))));
  const cycle = gameOrder.flatMap((gameId) => Array.from({ length: Math.max(1, Math.min(3, 1 + Math.floor(Math.max(0, gameAffinity.get(gameId) ?? 0) / 8))) }, () => gameId));
  const ordered: Tutorial[] = [];
  let remaining = list.length;
  while (remaining > 0) {
    let added = 0;
    cycle.forEach((gameId) => { const next = groups.get(gameId)?.shift(); if (next) { ordered.push(next); remaining -= 1; added += 1; } });
    if (!added) break;
  }
  return ordered;
}

function ActionButton({ label, count, active, onClick, children }: { label: string; count?: number; active?: boolean; onClick?: () => void; children: React.ReactNode }) {
  return <button type="button" aria-label={label} title={label} onClick={onClick} className={cn("group flex flex-col items-center gap-1 text-[10px] font-semibold text-white/65", active && "text-[#ff5f8f]")}><span className={cn("grid h-10 w-10 place-items-center rounded-full bg-white/[0.09] shadow-lg backdrop-blur-xl transition-all duration-200 group-hover:-translate-y-0.5 group-hover:bg-white/15", active && "bg-[#ff5f8f]/18")}>{children}</span><span>{count === undefined ? label : formatCount(count)}</span></button>;
}

function DiscoverySearch() {
  const router = useRouter();
  const { searches, recordSearch } = useApp();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const normalized = query.trim().toLowerCase();
  const matchingGames = games.filter((game) => game.name.toLowerCase().includes(normalized)).slice(0, 3);
  const matchingTips = tutorials.filter((tip) => `${tip.title} ${tip.topic} ${tip.character ?? ""} ${tip.tags.join(" ")}`.toLowerCase().includes(normalized)).slice(0, 4);
  const matchingCreators = creators.filter((creator) => `${creator.displayName} ${creator.username} ${creator.mainFocus}`.toLowerCase().includes(normalized)).slice(0, 3);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "/" && !["INPUT", "TEXTAREA"].includes((event.target as HTMLElement)?.tagName)) {
        event.preventDefault(); inputRef.current?.focus(); setOpen(true);
      }
      if (event.key === "Escape") { setOpen(false); inputRef.current?.blur(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function submit(value = query) {
    const next = value.trim();
    if (!next) return;
    recordSearch(next); setOpen(false); router.push(`/search?q=${encodeURIComponent(next)}`);
  }

  return (
    <div className="relative mx-auto w-full max-w-[590px]">
      <form onSubmit={(event) => { event.preventDefault(); submit(); }} className={cn("relative z-50 transition-all duration-200", open && "scale-[1.01]")}>
        <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <input ref={inputRef} value={query} onChange={(event) => { setQuery(event.target.value); setOpen(true); }} onFocus={() => setOpen(true)} placeholder="Search champions, mechanics, maps, creators…" className="h-10 w-full rounded-xl border border-white/[0.08] bg-white/[0.045] pl-10 pr-12 text-sm outline-none transition-colors placeholder:text-muted focus:border-accent/50 focus:bg-[#11131a]" />
        <kbd className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md border border-white/10 bg-black/20 px-2 py-0.5 text-[10px] text-muted">/</kbd>
      </form>
      {open && (
        <>
          <button aria-label="Close search" onClick={() => setOpen(false)} className="fixed inset-0 z-40 cursor-default bg-black/25" />
          <div className="absolute inset-x-0 top-12 z-50 overflow-hidden rounded-2xl border border-white/10 bg-[#11131a] shadow-2xl shadow-black/60">
            {!normalized ? (
              <div className="p-3">
                <div className="px-2 py-2 text-[10px] font-bold uppercase tracking-[0.16em] text-muted">Quick discovery</div>
                <div className="flex flex-wrap gap-2 px-2 pb-3">{["Ahri combos", "Mirage smokes", "Minecraft traps", "Jungle routes"].map((term) => <button key={term} onClick={() => submit(term)} className="rounded-full border border-white/[0.07] bg-white/[0.04] px-3 py-1.5 text-xs text-white/75 hover:bg-white/[0.08]">{term}</button>)}</div>
                {searches.length > 0 && <><div className="border-t border-white/[0.06] px-2 pt-3 text-[10px] font-bold uppercase tracking-[0.16em] text-muted">Recent</div>{searches.slice(-3).reverse().map((term) => <button key={term} onClick={() => submit(term)} className="flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left text-sm hover:bg-white/[0.05]"><Clock3 className="h-4 w-4 text-muted" />{term}</button>)}</>}
              </div>
            ) : (
              <div className="p-2">
                {matchingGames.length > 0 && <div className="px-2 pb-1 pt-2 text-[10px] font-bold uppercase tracking-[0.16em] text-muted">Games</div>}
                {matchingGames.map((game) => <Link key={game.id} href={`/g/${game.slug}`} onClick={() => setOpen(false)} className="flex items-center gap-3 rounded-xl p-2.5 hover:bg-white/[0.05]"><GameLogo game={game} size={28} /><div className="text-sm font-semibold">{game.name}</div></Link>)}
                {matchingTips.length > 0 && <div className="px-2 pb-1 pt-3 text-[10px] font-bold uppercase tracking-[0.16em] text-muted">Topics & tips</div>}
                {matchingTips.map((tip) => <Link key={tip.id} href={`/t/${tip.slug}`} onClick={() => setOpen(false)} className="flex items-center gap-3 rounded-xl p-2.5 hover:bg-white/[0.05]"><img src={tip.thumbnail} alt="" className="h-10 w-14 rounded-lg object-cover" /><div className="min-w-0"><div className="truncate text-sm font-semibold">{tip.title}</div><div className="text-xs text-muted">{tip.topic} · {games.find((game) => game.id === tip.gameId)?.name}</div></div></Link>)}
                {matchingCreators.length > 0 && <div className="px-2 pb-1 pt-3 text-[10px] font-bold uppercase tracking-[0.16em] text-muted">Creators</div>}
                {matchingCreators.map((creator) => <Link key={creator.id} href={`/c/${creator.username}`} onClick={() => setOpen(false)} className="flex items-center gap-3 rounded-xl p-2.5 hover:bg-white/[0.05]"><img src={creator.avatar} alt="" className="h-8 w-8 rounded-full object-cover" /><div><div className="text-sm font-semibold">{creator.displayName}</div><div className="text-xs text-muted">@{creator.username}</div></div></Link>)}
                {!matchingGames.length && !matchingTips.length && !matchingCreators.length && <button onClick={() => submit()} className="flex w-full items-center gap-3 rounded-xl p-3 text-left text-sm hover:bg-white/[0.05]"><Search className="h-4 w-4 text-accent" />Search all of EZTips for “{query}”</button>}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function FeedItem({ tutorial, nextTutorial, active, onActivate, onOpenComments }: { tutorial: Tutorial; nextTutorial?: Tutorial; active: boolean; onActivate: () => void; onOpenComments: () => void }) {
  const game = games.find((item) => item.id === tutorial.gameId);
  const staticCreator = creators.find((item) => item.id === tutorial.creatorId);
  const creator = staticCreator ?? (tutorial.creatorUsername ? { id: tutorial.creatorId, username: tutorial.creatorUsername, displayName: tutorial.creatorDisplayName || tutorial.creatorUsername, avatar: tutorial.creatorAvatar || `https://api.dicebear.com/9.x/adventurer/svg?seed=${encodeURIComponent(tutorial.creatorUsername)}`, mainFocus: "Community creator" } : undefined);
  const { liked, completedTutorials, toggleLike, toast, recordVideoComplete, recordVideoShare } = useApp();
  const isLiked = liked.includes(tutorial.id);
  const watched = completedTutorials.includes(tutorial.id);
  const itemRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const element = itemRef.current;
    if (!element) return;
    const observer = new IntersectionObserver(([entry]) => { if (entry.isIntersecting && entry.intersectionRatio >= 0.68) onActivate(); }, { threshold: [0.68] });
    observer.observe(element);
    return () => observer.disconnect();
  }, [onActivate]);

  return (
    <section ref={itemRef} data-feed-item className="snap-item relative flex h-full min-h-full items-center justify-center px-3 py-4 sm:px-6">
      <div className="relative grid w-full max-w-[1160px] items-center justify-center 2xl:grid-cols-[minmax(500px,610px)_300px] 2xl:gap-20">
        <article className="relative mx-auto w-full max-w-[560px] pr-12 sm:pr-14">
          <div className="absolute -inset-16 -z-10 rounded-full opacity-20 blur-[90px] transition-colors duration-700" style={{ background: `radial-gradient(circle, ${game?.tint ?? "#7657ff"}, transparent 68%)` }} />
          <div className="relative h-[calc(100dvh-10.5rem)] min-h-[560px] max-h-[760px] overflow-hidden rounded-[30px] bg-black shadow-[0_30px_90px_rgba(0,0,0,.5)]">
            <VideoPlayer src={tutorial.videoUrl} poster={tutorial.thumbnail} active={active} onEnded={() => recordVideoComplete(tutorial.id)} vertical className="absolute inset-0 h-full w-full rounded-[30px]" />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[46%] bg-gradient-to-t from-black via-black/65 to-transparent" />
            <div className="absolute inset-x-5 bottom-5 z-20 pr-2 sm:inset-x-6 sm:bottom-6">
              {creator && <div className="mb-3 flex items-center gap-2.5"><Link href={staticCreator ? `/c/${creator.username}` : `/u/${creator.username}`} className="flex min-w-0 items-center gap-2.5"><img src={creator.avatar} alt={creator.displayName} className="h-9 w-9 rounded-full border border-white/20 object-cover" /><span className="truncate text-sm font-semibold text-white">@{creator.username}</span></Link><FollowButton creatorId={tutorial.creatorId} size="sm" />{watched && <span className="ml-auto flex items-center gap-1 text-[10px] text-white/60"><CheckCircle2 className="h-3.5 w-3.5 text-success" />Watched</span>}</div>}
              <Link href={`/t/${tutorial.slug}`}><h2 className="max-w-[440px] text-xl font-bold leading-tight text-white sm:text-[23px]">{tutorial.title}</h2></Link>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-white/65">
                {game && <Link href={`/g/${game.slug}`} className="font-bold uppercase tracking-wide text-white">{game.short}</Link>}
                {[tutorial.character, tutorial.category, tutorial.topic].filter(Boolean).slice(0, 3).map((tag) => <Link key={tag} href={`/search?q=${encodeURIComponent(tag!)}`} className="rounded-full bg-white/10 px-2.5 py-1 font-medium text-white/80 backdrop-blur-sm hover:bg-white/15">{tag}</Link>)}
              </div>
              <div className="mt-2 text-[11px] text-white/45">{formatCount(tutorial.views)} views · {tutorial.duration}s</div>
            </div>
          </div>
          <div className="absolute bottom-5 right-0 z-30 flex flex-col items-center gap-3">
            <ActionButton label="Like" count={tutorial.likes + (isLiked ? 1 : 0)} active={isLiked} onClick={() => toggleLike(tutorial.id)}><Heart className={cn("h-[18px] w-[18px]", isLiked && "fill-current")} /></ActionButton>
            <ActionButton label="Comments" count={tutorial.comments} onClick={onOpenComments}><MessageCircle className="h-[18px] w-[18px]" /></ActionButton>
            <SaveControl tutorialId={tutorial.id} vertical />
            <ActionButton label="Share" onClick={() => { navigator.clipboard?.writeText(`${window.location.origin}/t/${tutorial.slug}`); recordVideoShare(tutorial.id); toast("Link copied"); }}><Share2 className="h-[18px] w-[18px]" /></ActionButton>
            <ActionButton label="More"><MoreHorizontal className="h-[18px] w-[18px]" /></ActionButton>
          </div>
        </article>

        <aside className="hidden self-stretch py-8 2xl:flex 2xl:flex-col">
          <section>
            <div className="mb-4 flex items-center justify-between"><h3 className="text-sm font-semibold">Trending today</h3><Link href="/explore" className="text-xs text-muted hover:text-white">See all</Link></div>
            <div className="space-y-4">{[nextTutorial, ...tutorials.filter((tip) => tip.id !== tutorial.id && tip.id !== nextTutorial?.id).slice(0, 2)].filter(Boolean).map((tip, position) => <Link key={tip!.id} href={`/t/${tip!.slug}`} className="group flex items-center gap-3"><div className="relative h-16 w-12 shrink-0 overflow-hidden rounded-lg bg-card"><img src={tip!.thumbnail} alt="" className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105" /><span className="absolute bottom-1 right-1 rounded bg-black/65 px-1 text-[9px] text-white">{tip!.duration}s</span></div><div className="min-w-0"><div className="line-clamp-2 text-sm font-medium leading-snug text-white/85 group-hover:text-white">{tip!.title}</div><div className="mt-1 text-[11px] text-muted">{games.find((item) => item.id === tip!.gameId)?.short} · #{position + 1} trending</div></div></Link>)}</div>
          </section>
          <section className="mt-9 border-t border-white/[0.06] pt-7">
            <h3 className="mb-4 text-sm font-semibold">Creators for you</h3>
            <div className="space-y-4">{creators.slice(0, 3).map((item) => <div key={item.id} className="flex items-center gap-3"><img src={item.avatar} alt="" className="h-9 w-9 rounded-full object-cover" /><Link href={`/c/${item.username}`} className="min-w-0 flex-1"><div className="truncate text-sm font-medium">{item.displayName}</div><div className="truncate text-[11px] text-muted">@{item.username}</div></Link><FollowButton creatorId={item.id} size="sm" /></div>)}</div>
          </section>
          <div className="mt-auto flex items-center gap-2 text-[10px] text-muted"><ArrowDown className="h-3.5 w-3.5" />J / K to move through tips</div>
        </aside>
      </div>
    </section>
  );
}

export function HomeFeed() {
  const { selectedGames, followedCreators, liked, saved, completedTutorials, searches, videoSignals, addHistory, recordVideoStart, recordVideoSkip, toggleLike, toggleSave, toggleFollowCreator } = useApp();
  const [tab, setTab] = useState<FeedTab>("foryou");
  const [activeGames, setActiveGames] = useState<string[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [communityVideos, setCommunityVideos] = useState<Tutorial[]>([]);
  const [commentsVideo, setCommentsVideo] = useState<Tutorial | null>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const activeIndexRef = useRef(0);
  const wheelLockRef = useRef(false);
  const wheelDeltaRef = useRef(0);
  const behavior = useMemo<FeedBehavior>(() => ({ liked, saved, completedTutorials, followedCreators, searches, videoSignals }), [completedTutorials, followedCreators, liked, saved, searches, videoSignals]);

  useEffect(() => { let cancelled = false; fetchCommunityVideos().then((items) => { if (!cancelled) setCommunityVideos(items); }).catch(() => {}); return () => { cancelled = true; }; }, []);
  const availableGames = useMemo(() => games.filter((game) => (tab === "explore" ? games.map((item) => item.id) : selectedGames).includes(game.id)), [selectedGames, tab]);
  const feed = useMemo(() => {
    let list = [...communityVideos, ...tutorials];
    if (tab === "following") list = list.filter((tutorial) => followedCreators.includes(tutorial.creatorId));
    else if (tab === "foryou" && selectedGames.length) list = list.filter((tutorial) => selectedGames.includes(tutorial.gameId));
    if (activeGames.length) list = list.filter((tutorial) => activeGames.includes(tutorial.gameId));
    return tab === "foryou" ? personalizedOrder(list, activeGames.length ? activeGames : selectedGames, behavior) : list;
  }, [activeGames, behavior, communityVideos, followedCreators, selectedGames, tab]);

  const resetFeed = useCallback(() => { setActiveGames([]); setActiveIndex(0); activeIndexRef.current = 0; scrollerRef.current?.scrollTo({ top: 0, behavior: "smooth" }); }, []);
  const toggleGameFilter = useCallback((gameId: string) => { setActiveGames((current) => current.includes(gameId) ? current.filter((id) => id !== gameId) : [...current, gameId]); setActiveIndex(0); activeIndexRef.current = 0; scrollerRef.current?.scrollTo({ top: 0, behavior: "smooth" }); }, []);

  useEffect(() => { activeIndexRef.current = activeIndex; }, [activeIndex]);

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    let unlockTimer: number | undefined;
    const onWheel = (event: WheelEvent) => {
      if (event.ctrlKey || commentsVideo) return;
      event.preventDefault();
      if (wheelLockRef.current) return;
      wheelDeltaRef.current += event.deltaY;
      if (Math.abs(wheelDeltaRef.current) < 24) return;
      const direction = wheelDeltaRef.current > 0 ? 1 : -1;
      wheelDeltaRef.current = 0;
      const currentIndex = activeIndexRef.current;
      const nextIndex = Math.max(0, Math.min(feed.length - 1, currentIndex + direction));
      if (nextIndex === currentIndex) return;
      const items = scroller.querySelectorAll<HTMLElement>("[data-feed-item]");
      const target = items[nextIndex];
      if (!target) return;
      wheelLockRef.current = true;
      activeIndexRef.current = nextIndex;
      setActiveIndex(nextIndex);
      scroller.scrollTo({ top: target.offsetTop, behavior: "smooth" });
      unlockTimer = window.setTimeout(() => { wheelLockRef.current = false; }, 520);
    };
    scroller.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      scroller.removeEventListener("wheel", onWheel);
      if (unlockTimer) window.clearTimeout(unlockTimer);
      wheelLockRef.current = false;
      wheelDeltaRef.current = 0;
    };
  }, [commentsVideo, feed.length]);

  const activeTutorialId = feed[activeIndex]?.id;

  useEffect(() => {
    if (!activeTutorialId) return;
    const startedAt = Date.now();
    addHistory(activeTutorialId);
    recordVideoStart(activeTutorialId);
    return () => {
      if (Date.now() - startedAt < 2500) recordVideoSkip(activeTutorialId);
    };
  }, [activeTutorialId, addHistory, recordVideoSkip, recordVideoStart]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const tag = (event.target as HTMLElement)?.tagName;
      if (["INPUT", "TEXTAREA", "SELECT"].includes(tag) || commentsVideo) return;
      const key = event.key.toLowerCase();
      const current = feed[activeIndex];
      if (key === "l" && current) { toggleLike(current.id); return; }
      if (key === "s" && current) { event.preventDefault(); toggleSave(current.id); return; }
      if (key === "f" && current) { toggleFollowCreator(current.creatorId); return; }
      const next = event.key === "ArrowDown" || key === "j";
      const previous = event.key === "ArrowUp" || key === "k";
      if (!next && !previous) return;
      event.preventDefault();
      scrollerRef.current?.scrollBy({ top: (next ? 1 : -1) * (scrollerRef.current?.clientHeight ?? 0), behavior: "smooth" });
    };
    window.addEventListener("keydown", onKeyDown); return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeIndex, commentsVideo, feed, toggleFollowCreator, toggleLike, toggleSave]);

  const ambientGame = games.find((game) => game.id === feed[activeIndex]?.gameId);

  return (
    <div className="relative flex h-[100dvh] min-h-0 flex-1 flex-col overflow-hidden bg-[#07080b] pb-16 md:pb-0">
      <div className="pointer-events-none absolute left-[28%] top-[18%] h-[520px] w-[520px] rounded-full opacity-[0.08] blur-[140px] transition-colors duration-700" style={{ background: ambientGame?.tint ?? "#7657ff" }} />
      <header className="relative z-40 border-b border-white/[0.05] bg-[#090a0f]/88 backdrop-blur-2xl">
        <div className="mx-auto flex h-14 max-w-[1280px] items-center gap-4 px-4 sm:px-6 lg:px-8">
          <select aria-label="Feed" value={tab} onChange={(event) => { setTab(event.target.value as FeedTab); resetFeed(); }} className="h-9 shrink-0 bg-transparent text-sm font-semibold outline-none md:hidden"><option value="foryou">For You</option><option value="following">Following</option><option value="explore">Explore</option></select>
          <nav className="hidden h-full shrink-0 items-center gap-6 md:flex">{([ ["foryou", "For You"], ["following", "Following"], ["explore", "Explore"] ] as const).map(([id, label]) => <button key={id} type="button" onClick={() => { setTab(id); resetFeed(); }} className={cn("relative h-full text-sm font-semibold transition-colors", tab === id ? "text-white" : "text-muted hover:text-white")}>{label}{tab === id && <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-accent" />}</button>)}</nav>
          <DiscoverySearch />
        </div>
        <div className="no-scrollbar mx-auto flex h-10 max-w-[1280px] items-center gap-1 overflow-x-auto px-4 sm:px-6 lg:px-8">
          <button type="button" onClick={resetFeed} className={cn("relative h-full shrink-0 px-3 text-xs font-semibold transition-colors", activeGames.length === 0 ? "text-white" : "text-muted hover:text-white")}>All{activeGames.length === 0 && <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-accent" />}</button>
          {availableGames.map((game) => <button type="button" key={game.id} onClick={() => toggleGameFilter(game.id)} aria-pressed={activeGames.includes(game.id)} className={cn("relative flex h-full shrink-0 items-center gap-1.5 px-3 text-xs font-semibold transition-colors", activeGames.includes(game.id) ? "text-white" : "text-muted hover:text-white")}><GameLogo game={game} size={15} />{game.short}{activeGames.includes(game.id) && <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-accent" />}</button>)}
          <Link href="/games" aria-label="Add game" className="ml-1 grid h-7 w-7 shrink-0 place-items-center rounded-full text-muted hover:bg-white/[0.06] hover:text-white"><Plus className="h-3.5 w-3.5" /></Link>
        </div>
      </header>
      <div ref={scrollerRef} className={cn("snap-feed no-scrollbar relative z-10 min-h-0 flex-1 overflow-y-auto transition-transform duration-200", commentsVideo && "2xl:-translate-x-24")}>
        {feed.length ? feed.map((tutorial, index) => <FeedItem key={tutorial.id} tutorial={tutorial} nextTutorial={feed[index + 1] ?? feed[0]} active={activeIndex === index} onActivate={() => setActiveIndex(index)} onOpenComments={() => setCommentsVideo(tutorial)} />) : <div className="grid h-full place-items-center px-6 text-center"><div className="rounded-[28px] border border-white/[0.07] bg-white/[0.035] p-8"><Sparkles className="mx-auto h-7 w-7 text-accent" /><h2 className="mt-4 text-xl font-bold">Nothing in this lane yet</h2><p className="mt-2 text-sm text-muted">Switch games or open the wider discovery feed.</p><button type="button" onClick={() => { setTab("explore"); resetFeed(); }} className="mt-5 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white">Open Discover</button></div></div>}
      </div>
      <div className={cn("fixed inset-0 z-[70] transition", commentsVideo ? "pointer-events-auto" : "pointer-events-none")} aria-hidden={!commentsVideo}>
        <button aria-label="Close comments" onClick={() => setCommentsVideo(null)} className={cn("absolute inset-0 bg-black/35 transition-opacity duration-200", commentsVideo ? "opacity-100" : "opacity-0")} />
        <aside className={cn("absolute inset-y-0 right-0 w-full max-w-[430px] border-l border-white/[0.08] bg-[#0d0f14] shadow-2xl transition-transform duration-200", commentsVideo ? "translate-x-0" : "translate-x-full")}>
          <div className="flex h-16 items-center justify-between border-b border-white/[0.07] px-5"><div><div className="font-semibold">Comments</div><div className="text-xs text-muted">{commentsVideo ? formatCount(commentsVideo.comments) : 0} conversations</div></div><button onClick={() => setCommentsVideo(null)} className="grid h-9 w-9 place-items-center rounded-xl text-muted hover:bg-hover hover:text-white"><X className="h-5 w-5" /></button></div>
          <div className="h-[calc(100%-4rem)] overflow-y-auto p-5">{commentsVideo && <CommentThread tutorialId={commentsVideo.id} />}</div>
        </aside>
      </div>
    </div>
  );
}

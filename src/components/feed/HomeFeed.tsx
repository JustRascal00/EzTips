"use client";

import { FollowButton, SaveControl } from "@/components/actions";
import { VideoPlayer } from "@/components/VideoPlayer";
import { creators } from "@/data/creators";
import { games } from "@/data/games";
import { tutorials } from "@/data/tutorials";
import { cn } from "@/lib/cn";
import { formatCount, skillLabel } from "@/lib/format";
import { useApp, type VideoSignal } from "@/lib/store";
import type { Tutorial } from "@/lib/types";
import { Heart, MessageCircle, Plus, Share2 } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type FeedTab = "foryou" | "following" | "explore";

type FeedBehavior = {
  liked: string[];
  saved: string[];
  completedTutorials: string[];
  followedCreators: string[];
  searches: string[];
  videoSignals: Record<string, VideoSignal>;
};

function personalizedOrder(list: Tutorial[], gameOrder: string[], behavior: FeedBehavior) {
  const topicAffinity = new Map<string, number>();
  const gameAffinity = new Map<string, number>();

  const addAffinity = (tutorial: Tutorial, weight: number) => {
    gameAffinity.set(tutorial.gameId, (gameAffinity.get(tutorial.gameId) ?? 0) + weight);
    [tutorial.category, tutorial.topic, ...tutorial.tags].forEach((value) => {
      const key = value.toLowerCase();
      topicAffinity.set(key, (topicAffinity.get(key) ?? 0) + weight);
    });
  };

  tutorials.forEach((tutorial) => {
    let weight = 0;
    if (behavior.liked.includes(tutorial.id)) weight += 3;
    if (behavior.saved.includes(tutorial.id)) weight += 5;
    if (behavior.completedTutorials.includes(tutorial.id)) weight += 2;
    const signal = behavior.videoSignals[tutorial.id];
    if (signal) {
      weight += signal.completions * 3 + signal.rewatches * 2 + signal.shares * 4 - signal.skips * 1.5;
    }
    if (weight) addAffinity(tutorial, weight);
  });

  const score = (tutorial: Tutorial) => {
    const signal = behavior.videoSignals[tutorial.id];
    const topicScore = [tutorial.category, tutorial.topic, ...tutorial.tags].reduce(
      (total, value) => total + (topicAffinity.get(value.toLowerCase()) ?? 0),
      0,
    );
    const searchable = `${tutorial.title} ${tutorial.category} ${tutorial.topic} ${tutorial.tags.join(" ")}`.toLowerCase();
    const searchScore = behavior.searches.reduce((total, query) => {
      const words = query.toLowerCase().split(/\s+/).filter((word) => word.length > 2);
      return total + words.filter((word) => searchable.includes(word)).length * 1.5;
    }, 0);
    return (
      Math.log10(tutorial.views + 1) * 0.25
      + topicScore * 0.45
      + searchScore
      + (behavior.followedCreators.includes(tutorial.creatorId) ? 4 : 0)
      - (signal?.completions ?? 0) * 0.5
    );
  };

  const groups = new Map<string, Tutorial[]>();
  gameOrder.forEach((gameId) => {
    groups.set(gameId, list.filter((tutorial) => tutorial.gameId === gameId).sort((a, b) => score(b) - score(a)));
  });

  const cycle = gameOrder.flatMap((gameId) => {
    const affinity = gameAffinity.get(gameId) ?? 0;
    const slots = Math.max(1, Math.min(3, 1 + Math.floor(Math.max(0, affinity) / 8)));
    return Array.from({ length: slots }, () => gameId);
  });
  const ordered: Tutorial[] = [];
  let remaining = list.length;
  while (remaining > 0) {
    let added = 0;
    cycle.forEach((gameId) => {
      const next = groups.get(gameId)?.shift();
      if (next) {
        ordered.push(next);
        remaining -= 1;
        added += 1;
      }
    });
    if (!added) break;
  }
  return ordered;
}

function ActionButton({
  label,
  count,
  active,
  onClick,
  children,
}: {
  label: string;
  count?: number;
  active?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={cn(
        "group flex flex-col items-center gap-1.5 text-[11px] font-semibold text-white/80",
        active && "text-[#ff4d7d]",
      )}
    >
      <span
        className={cn(
          "grid h-11 w-11 place-items-center rounded-full border border-white/10 bg-black/45 shadow-lg backdrop-blur-md transition-transform group-hover:scale-105",
          active && "border-[#ff4d7d]/40 bg-[#ff4d7d]/15",
        )}
      >
        {children}
      </span>
      <span>{count === undefined ? label : formatCount(count)}</span>
    </button>
  );
}

function FeedItem({
  tutorial,
  active,
  onActivate,
}: {
  tutorial: Tutorial;
  active: boolean;
  onActivate: () => void;
}) {
  const game = games.find((item) => item.id === tutorial.gameId);
  const creator = creators.find((item) => item.id === tutorial.creatorId);
  const { liked, toggleLike, toast, recordVideoComplete, recordVideoShare } = useApp();
  const isLiked = liked.includes(tutorial.id);
  const itemRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const element = itemRef.current;
    if (!element) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && entry.intersectionRatio >= 0.72) onActivate();
      },
      { threshold: [0.72] },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [onActivate]);

  return (
    <section
      ref={itemRef}
      className="snap-item flex min-h-full items-center justify-center px-2 py-3 sm:px-5 sm:py-5"
    >
      <div className="relative flex h-[calc(100dvh-11rem)] min-h-[520px] max-h-[820px] w-full max-w-[455px] items-end">
        <VideoPlayer
          src={tutorial.videoUrl}
          poster={tutorial.thumbnail}
          active={active}
          onEnded={() => recordVideoComplete(tutorial.id)}
          vertical
          className="absolute inset-0 h-full w-full rounded-[24px] border border-white/10 shadow-2xl shadow-black/50"
        />
        <div className="pointer-events-none absolute inset-0 rounded-[24px] bg-gradient-to-t from-black/90 via-transparent to-black/35" />

        <div className="absolute left-4 top-4 z-20 flex items-center gap-2">
          {game && (
            <Link
              href={`/g/${game.slug}`}
              className="flex items-center gap-2 rounded-full border border-white/15 bg-black/45 px-2.5 py-1.5 text-xs font-semibold text-white backdrop-blur-md"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={game.icon} alt="" className="h-5 w-5 rounded-md object-cover" />
              {game.name}
            </Link>
          )}
          <span className="rounded-full border border-white/15 bg-black/45 px-2.5 py-1.5 text-[11px] font-medium text-white/80 backdrop-blur-md">
            {skillLabel(tutorial.skillLevel)}
          </span>
        </div>

        <div className="absolute bottom-5 left-4 right-[74px] z-20">
          {creator && (
            <div className="mb-3 flex items-center gap-2.5">
              <Link href={`/c/${creator.username}`} className="flex min-w-0 items-center gap-2.5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={creator.avatar}
                  alt={creator.displayName}
                  className="h-10 w-10 rounded-full border border-white/30 object-cover"
                />
                <div className="min-w-0">
                  <div className="truncate text-sm font-bold text-white">@{creator.username}</div>
                  <div className="truncate text-[11px] text-white/60">{creator.mainFocus}</div>
                </div>
              </Link>
              <FollowButton creatorId={tutorial.creatorId} size="sm" />
            </div>
          )}
          <Link href={`/t/${tutorial.slug}`}>
            <h2 className="text-lg font-bold leading-tight text-white sm:text-xl">{tutorial.title}</h2>
          </Link>
          <div className="mt-2 flex flex-wrap gap-x-2 gap-y-1 text-xs text-white/75">
            <span>{tutorial.category}</span>
            {tutorial.tags.slice(0, 3).map((tag) => (
              <Link key={tag} href={`/search?q=${encodeURIComponent(tag)}`} className="font-semibold text-white">
                #{tag}
              </Link>
            ))}
          </div>
          <div className="mt-2 text-[11px] font-medium text-white/55">{formatCount(tutorial.views)} views</div>
        </div>

        <div className="absolute bottom-5 right-3 z-30 flex flex-col items-center gap-4">
          <ActionButton
            label="Like"
            count={tutorial.likes + (isLiked ? 1 : 0)}
            active={isLiked}
            onClick={() => toggleLike(tutorial.id)}
          >
            <Heart className={cn("h-5 w-5", isLiked && "fill-current")} />
          </ActionButton>
          <Link href={`/t/${tutorial.slug}#comments`} aria-label={`View ${tutorial.comments} comments`}>
            <span className="flex flex-col items-center gap-1.5 text-[11px] font-semibold text-white/80">
              <span className="grid h-11 w-11 place-items-center rounded-full border border-white/10 bg-black/45 shadow-lg backdrop-blur-md">
                <MessageCircle className="h-5 w-5" />
              </span>
              {formatCount(tutorial.comments)}
            </span>
          </Link>
          <SaveControl tutorialId={tutorial.id} vertical />
          <ActionButton
            label="Share"
            onClick={() => {
              navigator.clipboard?.writeText(`${window.location.origin}/t/${tutorial.slug}`);
              recordVideoShare(tutorial.id);
              toast("Link copied");
            }}
          >
            <Share2 className="h-5 w-5" />
          </ActionButton>
        </div>
      </div>
    </section>
  );
}

export function HomeFeed() {
  const {
    selectedGames,
    followedCreators,
    liked,
    saved,
    completedTutorials,
    searches,
    videoSignals,
    addHistory,
    recordVideoStart,
    recordVideoSkip,
  } = useApp();
  const [tab, setTab] = useState<FeedTab>("foryou");
  const [activeGames, setActiveGames] = useState<string[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const behaviorSnapshot = useRef<FeedBehavior>({
    liked,
    saved,
    completedTutorials,
    followedCreators,
    searches,
    videoSignals,
  });

  const availableGames = useMemo(() => {
    const ids = tab === "explore" ? games.map((game) => game.id) : selectedGames;
    return games.filter((game) => ids.includes(game.id));
  }, [selectedGames, tab]);

  const feed = useMemo(() => {
    let list = tutorials;
    if (tab === "following") {
      list = list.filter((tutorial) => followedCreators.includes(tutorial.creatorId));
    } else if (tab === "foryou" && selectedGames.length) {
      list = list.filter((tutorial) => selectedGames.includes(tutorial.gameId));
    }
    if (activeGames.length) {
      list = list.filter((tutorial) => activeGames.includes(tutorial.gameId));
    }
    if (tab === "foryou") {
      const gameOrder = activeGames.length ? activeGames : selectedGames;
      list = personalizedOrder(list, gameOrder, behaviorSnapshot.current);
    }
    return list;
  }, [activeGames, followedCreators, selectedGames, tab]);

  const resetFeed = useCallback(() => {
    setActiveGames([]);
    setActiveIndex(0);
    scrollerRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const toggleGameFilter = useCallback((gameId: string) => {
    setActiveGames((current) =>
      current.includes(gameId)
        ? current.filter((id) => id !== gameId)
        : [...current, gameId],
    );
    setActiveIndex(0);
    scrollerRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  useEffect(() => {
    const current = feed[activeIndex];
    if (!current) return;
    const startedAt = Date.now();
    addHistory(current.id);
    recordVideoStart(current.id);
    return () => {
      if (Date.now() - startedAt < 2500) recordVideoSkip(current.id);
    };
  }, [activeIndex, addHistory, feed, recordVideoSkip, recordVideoStart]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const tag = (event.target as HTMLElement)?.tagName;
      if (["INPUT", "TEXTAREA", "SELECT"].includes(tag)) return;
      if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
      event.preventDefault();
      scrollerRef.current?.scrollBy({
        top: (event.key === "ArrowDown" ? 1 : -1) * (scrollerRef.current?.clientHeight ?? 0),
        behavior: "smooth",
      });
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <div className="relative flex h-[calc(100dvh-4rem)] min-h-0 flex-1 flex-col">
      <header className="z-40 border-b border-border/70 bg-bg/90 px-3 backdrop-blur-xl sm:px-5">
        <div className="mx-auto flex h-12 max-w-[620px] items-end justify-center gap-7">
          {([
            ["foryou", "For You"],
            ["following", "Following"],
            ["explore", "Explore"],
          ] as const).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => {
                setTab(id);
                resetFeed();
              }}
              className={cn(
                "relative h-full pt-1 text-sm font-semibold",
                tab === id ? "text-white" : "text-muted hover:text-white",
              )}
            >
              {label}
              {tab === id && <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-white" />}
            </button>
          ))}
        </div>
        <div className="no-scrollbar mx-auto flex h-12 max-w-[760px] items-center gap-2 overflow-x-auto">
          <button
            type="button"
            onClick={() => resetFeed()}
            className={cn(
              "shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors",
              activeGames.length === 0
                ? "border-accent bg-accent text-white"
                : "border-border bg-card text-muted hover:text-white",
            )}
          >
            All
          </button>
          {availableGames.map((game) => (
            <button
              type="button"
              key={game.id}
              onClick={() => toggleGameFilter(game.id)}
              aria-pressed={activeGames.includes(game.id)}
              className={cn(
                "flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
                activeGames.includes(game.id)
                  ? "border-accent bg-accent/15 text-white"
                  : "border-border bg-card text-muted hover:text-white",
              )}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={game.icon} alt="" className="h-4 w-4 rounded object-cover" />
              {game.name}
            </button>
          ))}
          <Link
            href="/games"
            className="flex shrink-0 items-center gap-1.5 rounded-full border border-dashed border-border px-3 py-1.5 text-xs font-semibold text-muted hover:border-accent/50 hover:text-white"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Game
          </Link>
        </div>
      </header>

      <div ref={scrollerRef} className="snap-feed no-scrollbar min-h-0 flex-1 overflow-y-auto">
        {feed.length ? (
          feed.map((tutorial, index) => (
            <FeedItem
              key={tutorial.id}
              tutorial={tutorial}
              active={activeIndex === index}
              onActivate={() => setActiveIndex(index)}
            />
          ))
        ) : (
          <div className="grid h-full place-items-center px-6 text-center">
            <div>
              <h2 className="text-xl font-bold">No clips here yet</h2>
              <p className="mt-2 text-sm text-muted">Try another game or explore the wider community feed.</p>
              <button
                type="button"
                onClick={() => {
                  setTab("explore");
                  resetFeed();
                }}
                className="mt-5 rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white"
              >
                Open Explore
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

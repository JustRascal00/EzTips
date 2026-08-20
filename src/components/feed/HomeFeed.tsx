"use client";

import { creators } from "@/data/creators";
import { games } from "@/data/games";
import { learningPaths } from "@/data/paths";
import { tutorials } from "@/data/tutorials";
import { formatCount, skillLabel } from "@/lib/format";
import { useApp } from "@/lib/store";
import type { Tutorial } from "@/lib/types";
import { cn } from "@/lib/cn";
import {
  Heart,
  MessageCircle,
  Share2,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FollowButton, HelpfulButton, SaveControl } from "../actions";
import { VideoPlayer } from "../VideoPlayer";
import { Chip, Progress, VerifiedMark } from "../ui";
import { RightRail, RailSection, YourGamesRail } from "../layout/Sidebar";

function FeedActions({ tutorial }: { tutorial: Tutorial }) {
  const { liked, toggleLike, toast } = useApp();
  const on = liked.includes(tutorial.id);
  return (
    <div className="flex flex-col items-center gap-4">
      <button
        onClick={() => toggleLike(tutorial.id)}
        className={cn("flex flex-col items-center gap-1 text-xs text-muted", on && "text-danger")}
      >
        <span
          className={cn(
            "h-11 w-11 grid place-items-center rounded-full border border-border bg-card",
            on && "border-danger/40 bg-danger/10",
          )}
        >
          <Heart className={cn("h-4 w-4", on && "fill-current")} />
        </span>
        Like
      </button>
      <HelpfulButton tutorialId={tutorial.id} vertical />
      <Link href={`/t/${tutorial.slug}#comments`} className="flex flex-col items-center gap-1 text-xs text-muted">
        <span className="h-11 w-11 grid place-items-center rounded-full border border-border bg-card">
          <MessageCircle className="h-4 w-4" />
        </span>
        Comment
      </Link>
      <SaveControl tutorialId={tutorial.id} vertical />
      <button
        onClick={() => {
          navigator.clipboard?.writeText(
            typeof window !== "undefined"
              ? `${window.location.origin}/t/${tutorial.slug}`
              : tutorial.slug,
          );
          toast("Link copied");
        }}
        className="flex flex-col items-center gap-1 text-xs text-muted"
      >
        <span className="h-11 w-11 grid place-items-center rounded-full border border-border bg-card">
          <Share2 className="h-4 w-4" />
        </span>
        Share
      </button>
    </div>
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
  const game = games.find((g) => g.id === tutorial.gameId);
  const creator = creators.find((c) => c.id === tutorial.creatorId);
  const path = learningPaths.find((p) => p.id === tutorial.pathId);
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting && e.intersectionRatio > 0.65) onActivate();
      },
      { threshold: [0.65] },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [onActivate]);

  return (
    <section
      ref={ref}
      className="snap-item min-h-[calc(100dvh-4rem)] md:min-h-[calc(100dvh-4rem)] flex items-center justify-center px-4 py-6"
    >
      <div className="w-full max-w-[760px] flex flex-col md:flex-row items-center md:items-stretch gap-5">
        <div className="w-full max-w-[520px] md:w-[480px] shrink-0">
          <div className="mb-3 hidden md:block">
            <div className="text-xs text-muted font-medium">
              {game?.name} · {tutorial.category} · {skillLabel(tutorial.skillLevel)}
            </div>
            <h2 className="text-2xl font-bold tracking-tight mt-1 leading-tight">
              {tutorial.title}
            </h2>
          </div>
          <div className="relative mx-auto w-full max-w-[480px] aspect-[9/16] max-h-[min(78dvh,720px)]">
            <VideoPlayer
              src={tutorial.videoUrl}
              poster={tutorial.thumbnail}
              active={active}
              captions={tutorial.learn}
              vertical
              className="absolute inset-0 h-full w-full"
            />
            <div className="md:hidden absolute bottom-16 left-3 right-16 z-10">
              <div className="text-[11px] text-white/80">
                {game?.name} · {tutorial.category} · {skillLabel(tutorial.skillLevel)}
              </div>
              <div className="font-bold text-lg leading-tight mt-1">{tutorial.title}</div>
              <div className="text-xs mt-1 text-white/80">@{creator?.username}</div>
            </div>
          </div>
        </div>
        <div className="flex md:flex-col items-center md:items-stretch gap-5 md:w-[220px] md:py-8">
          <div className="hidden md:block space-y-3">
            {creator && (
              <Link href={`/c/${creator.username}`} className="flex items-start gap-2.5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={creator.avatar} alt="" className="h-10 w-10 rounded-full border border-border" />
                <div>
                  <div className="flex items-center gap-1 font-semibold">
                    @{creator.username}
                    {creator.verified && <VerifiedMark />}
                  </div>
                  <div className="text-xs text-muted">{creator.credential.label}</div>
                </div>
              </Link>
            )}
            <FollowButton creatorId={tutorial.creatorId} size="sm" />
            <div className="flex flex-wrap gap-1.5">
              {tutorial.tags.map((t) => (
                <Link key={t} href={`/search?q=${encodeURIComponent(t)}`}>
                  <Chip>#{t}</Chip>
                </Link>
              ))}
            </div>
            <div className="rounded-2xl border border-border bg-card p-3">
              <div className="text-sm font-semibold text-success">
                {tutorial.helpfulPercent}% found this helpful
              </div>
              <div className="text-[11px] text-muted mt-0.5">
                {formatCount(tutorial.helpful)} players
              </div>
            </div>
            <div className="rounded-2xl border border-border bg-card p-3">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-muted">
                You&apos;ll learn
              </div>
              <p className="text-sm mt-1.5 leading-relaxed">{tutorial.learn}</p>
            </div>
            {path && (
              <Link
                href={`/learn/${path.slug}`}
                className="block rounded-2xl border border-accent/30 bg-accent/10 p-3 hover:bg-accent/15 transition-colors duration-200"
              >
                <div className="text-[11px] font-semibold uppercase tracking-wider text-muted">
                  Want to actually master this?
                </div>
                <div className="text-sm font-semibold mt-1">Continue with {path.title} →</div>
              </Link>
            )}
          </div>
          <FeedActions tutorial={tutorial} />
        </div>
      </div>
    </section>
  );
}

function MasteryCard({ after }: { after: Tutorial }) {
  const path =
    learningPaths.find((p) => p.id === after.pathId) ??
    learningPaths.find((p) => p.gameId === after.gameId);
  if (!path) return null;
  return (
    <section className="snap-item min-h-[calc(100dvh-4rem)] flex items-center justify-center px-6">
      <div className="max-w-md w-full rounded-2xl border border-border bg-card p-8 text-center">
        <div className="text-xs font-semibold uppercase tracking-wider text-muted">
          From discovery to improvement
        </div>
        <h2 className="text-2xl font-bold mt-3">Want to actually master this?</h2>
        <p className="text-muted text-sm mt-2">
          You&apos;ve watched a few {after.category.toLowerCase()} tutorials. A path turns these
          clips into a sequence you can finish.
        </p>
        <Link
          href={`/learn/${path.slug}`}
          className="mt-6 inline-flex h-12 items-center justify-center rounded-xl bg-accent px-5 font-medium hover:bg-accent-hover transition-colors duration-200"
        >
          {path.title} →
        </Link>
      </div>
    </section>
  );
}

export function HomeFeed() {
  const { selectedGames, followedCreators, addHistory, completeTutorial } = useApp();
  const [tab, setTab] = useState<"foryou" | "following">("foryou");
  const [active, setActive] = useState(0);

  const feed = useMemo(() => {
    let list =
      tab === "following"
        ? tutorials.filter((t) => followedCreators.includes(t.creatorId))
        : [...tutorials];
    if (selectedGames.length) {
      const preferred = list.filter((t) => selectedGames.includes(t.gameId));
      const rest = list.filter((t) => !selectedGames.includes(t.gameId));
      list = [...preferred, ...rest];
    }
    return list;
  }, [tab, followedCreators, selectedGames]);

  const items = useMemo(() => {
    const out: Array<{ type: "video"; t: Tutorial } | { type: "mastery"; t: Tutorial }> = [];
    let streak = 0;
    let lastCat = "";
    feed.forEach((t, i) => {
      if (t.category === lastCat) streak += 1;
      else {
        streak = 1;
        lastCat = t.category;
      }
      out.push({ type: "video", t });
      if (streak === 3 && i < feed.length - 1) {
        out.push({ type: "mastery", t });
        streak = 0;
      }
    });
    return out;
  }, [feed]);

  const scroller = useRef<HTMLDivElement>(null);

  const go = useCallback((dir: number) => {
    const el = scroller.current;
    if (!el) return;
    el.scrollBy({ top: dir * el.clientHeight, behavior: "smooth" });
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        go(1);
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        go(-1);
      }
      if (e.key === " ") {
        e.preventDefault();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go]);

  const activeId = items[active]?.type === "video" ? items[active].t.id : null;

  useEffect(() => {
    if (!activeId) return;
    addHistory(activeId);
    const t = window.setTimeout(() => completeTutorial(activeId), 8000);
    return () => clearTimeout(t);
  }, [activeId, addHistory, completeTutorial]);

  const currentTutorial = items[active]?.type === "video" ? items[active].t : null;

  return (
    <div className="flex flex-1 min-h-0">
      <div className="flex-1 min-w-0 flex flex-col">
        <div className="flex justify-center gap-6 h-12 items-center border-b border-border md:border-0">
          {(["foryou", "following"] as const).map((id) => (
            <button
              key={id}
              onClick={() => {
                setTab(id);
                setActive(0);
                scroller.current?.scrollTo({ top: 0 });
              }}
              className={cn(
                "relative text-sm font-medium pb-2",
                tab === id ? "text-text" : "text-muted",
              )}
            >
              {id === "foryou" ? "For You" : "Following"}
              {tab === id && (
                <span className="absolute left-0 right-0 -bottom-px h-0.5 bg-accent rounded-full" />
              )}
            </button>
          ))}
        </div>
        <div ref={scroller} className="flex-1 overflow-y-auto snap-feed no-scrollbar">
          {items.map((item, i) =>
            item.type === "mastery" ? (
              <MasteryCard key={`m-${item.t.id}-${i}`} after={item.t} />
            ) : (
              <FeedItem
                key={item.t.id}
                tutorial={item.t}
                active={active === i}
                onActivate={() => setActive(i)}
              />
            ),
          )}
        </div>
      </div>
      <RightRail>
        <YourGamesRail />
        <RailSection title="Daily learning">
          <div className="rounded-2xl border border-border bg-card p-3">
            <div className="flex justify-between text-sm mb-2">
              <span>Today</span>
              <span className="text-muted">2 / 3 tutorials</span>
            </div>
            <Progress value={66} />
            <p className="text-xs text-muted mt-2">
              One more clip keeps the streak. Then get into a path.
            </p>
          </div>
        </RailSection>
        <RailSection title="Recommended creators" href="/following">
          <div className="space-y-2">
            {creators.slice(0, 4).map((c) => (
              <Link key={c.id} href={`/c/${c.username}`} className="flex items-center gap-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={c.avatar} alt="" className="h-8 w-8 rounded-full border border-border" />
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{c.displayName}</div>
                  <div className="text-[11px] text-muted truncate">{c.credential.label}</div>
                </div>
              </Link>
            ))}
          </div>
        </RailSection>
        <RailSection title="Trending topics">
          <div className="flex flex-wrap gap-1.5">
            {["Roaming", "Aim", "Recoil", "Jett", "Wave control", "Iron farm"].map((t) => (
              <Link key={t} href={`/search?q=${encodeURIComponent(t)}`}>
                <Chip>{t}</Chip>
              </Link>
            ))}
          </div>
        </RailSection>
        {currentTutorial && (
          <RailSection title="Related tutorials">
            <div className="space-y-2 text-sm">
              {tutorials
                .filter(
                  (t) =>
                    t.id !== currentTutorial.id &&
                    (t.category === currentTutorial.category || t.gameId === currentTutorial.gameId),
                )
                .slice(0, 3)
                .map((t) => (
                  <Link key={t.id} href={`/t/${t.slug}`} className="block hover:text-white text-muted">
                    {t.title}
                  </Link>
                ))}
            </div>
          </RailSection>
        )}
      </RightRail>
    </div>
  );
}

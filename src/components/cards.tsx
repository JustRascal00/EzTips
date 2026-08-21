"use client";

import { creators } from "@/data/creators";
import { games } from "@/data/games";
import { formatCount, formatDuration, skillLabel } from "@/lib/format";
import type { Creator, Game, LearningPath, Tutorial } from "@/lib/types";
import { cn } from "@/lib/cn";
import { pathDuration } from "@/data/paths";
import Link from "next/link";
import { useState } from "react";
import { RankBadge } from "./ui";
import { GameLogo } from "./GameLogo";

export function GameCard({
  game,
  large,
  selected,
  onSelect,
  href,
}: {
  game: Game;
  large?: boolean;
  selected?: boolean;
  onSelect?: () => void;
  href?: string;
}) {
  const inner = (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border transition-all duration-200 group",
        selected ? "border-accent" : "border-border hover:border-[#3a4152]",
        large ? "h-44" : "h-36",
        onSelect && "cursor-pointer",
      )}
      style={{ background: `linear-gradient(145deg, ${game.tint}55, #0b0d12 72%)` }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={game.banner}
        alt=""
        onError={(event) => { event.currentTarget.style.display = "none"; }}
        className="absolute inset-0 h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.03]"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/35 to-black/10" />
      <div className="relative h-full flex flex-col justify-end p-4">
        <div className="flex items-center gap-2">
          <GameLogo game={game} size={32} />
          <div>
            <div className="font-semibold leading-tight">{game.name}</div>
            <div className="text-xs text-white/70">{formatCount(game.learners)} learners</div>
          </div>
        </div>
      </div>
      {selected && (
        <span className="absolute top-3 right-3 h-6 w-6 rounded-full bg-accent text-white text-sm grid place-items-center">
          ✓
        </span>
      )}
    </div>
  );

  if (onSelect) {
    return (
      <button type="button" onClick={onSelect} className="text-left w-full">
        {inner}
      </button>
    );
  }
  return (
    <Link href={href ?? `/g/${game.slug}`} className="block">
      {inner}
    </Link>
  );
}

export function TutorialCard({
  tutorial,
  compact,
}: {
  tutorial: Tutorial;
  compact?: boolean;
}) {
  const [hover, setHover] = useState(false);
  const game = games.find((g) => g.id === tutorial.gameId);
  const creator = creators.find((c) => c.id === tutorial.creatorId);

  return (
    <Link
      href={`/t/${tutorial.slug}`}
      className="group block"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <div
        className={cn(
          "relative overflow-hidden rounded-2xl border border-border bg-card",
          compact ? "aspect-[16/10]" : "aspect-[16/10]",
        )}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={tutorial.thumbnail}
          alt={tutorial.title}
          className={cn(
            "h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.03]",
            hover && "opacity-0",
          )}
        />
        {hover && (
          <video
            src={tutorial.videoUrl}
            muted
            playsInline
            autoPlay
            loop
            className="absolute inset-0 h-full w-full object-cover"
          />
        )}
        <span className="absolute bottom-2 right-2 rounded-md bg-black/75 px-1.5 py-0.5 text-[11px] font-medium">
          {formatDuration(tutorial.duration)}
        </span>
        <span className="absolute top-2 left-2 rounded-md bg-black/70 px-1.5 py-0.5 text-[11px] text-white/90">
          {tutorial.helpfulPercent}% helpful
        </span>
      </div>
      <div className="mt-2.5">
        <div className="text-[13px] text-muted">
          {game?.name} · {tutorial.category} · {skillLabel(tutorial.skillLevel)}
        </div>
        <h3 className="mt-0.5 font-semibold leading-snug line-clamp-2 group-hover:text-white">
          {tutorial.title}
        </h3>
        <div className="mt-1 text-xs text-muted">
          @{creator?.username} · {formatCount(tutorial.views)} views
        </div>
      </div>
    </Link>
  );
}

export function CreatorCard({ creator }: { creator: Creator }) {
  const game = games.find((g) => g.id === creator.gameId);
  return (
    <Link
      href={`/c/${creator.username}`}
      className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3 hover:bg-hover transition-colors duration-200"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={creator.avatar}
        alt=""
        className="h-12 w-12 rounded-full border border-border"
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 font-semibold truncate">
          {creator.displayName}
          {creator.verified && <span className="text-accent text-xs">✓</span>}
        </div>
        <div className="text-xs text-muted truncate">
          {creator.credential.label} · {game?.name}
        </div>
      </div>
      <RankBadge label={creator.credential.label.split(" ")[0]} type={creator.credential.type} />
    </Link>
  );
}

export function PathCard({
  path,
  progress,
}: {
  path: LearningPath;
  progress?: number;
}) {
  const game = games.find((g) => g.id === path.gameId);
  const pct = progress ?? 0;
  return (
    <Link
      href={`/learn/${path.slug}`}
      className="block rounded-2xl border border-border bg-card overflow-hidden hover:bg-hover transition-colors duration-200"
    >
      <div className="relative h-28">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={path.thumbnail} alt="" className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-card to-transparent" />
      </div>
      <div className="p-4 -mt-4 relative">
        <div className="text-xs text-muted">
          {game?.name} · {path.category} · {skillLabel(path.skillLevel)}
        </div>
        <h3 className="font-semibold mt-1">{path.title}</h3>
        <div className="text-xs text-muted mt-1">
          {path.lessons.length} lessons · {formatDuration(pathDuration(path))}
        </div>
        {pct > 0 && (
          <div className="mt-3">
            <div className="h-1.5 rounded-full bg-border overflow-hidden">
              <div className="h-full bg-accent" style={{ width: `${pct}%` }} />
            </div>
            <div className="text-xs text-muted mt-1">{pct}% complete</div>
          </div>
        )}
      </div>
    </Link>
  );
}

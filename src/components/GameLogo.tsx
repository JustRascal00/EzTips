"use client";

import type { Game } from "@/lib/types";
import { cn } from "@/lib/cn";
import { useState } from "react";

export function GameLogo({
  game,
  size = 32,
  className,
}: {
  game: Game;
  size?: number;
  className?: string;
}) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);

  return (
    <span
      role="img"
      aria-label={`${game.name} logo`}
      className={cn(
        "relative inline-grid shrink-0 place-items-center overflow-hidden border border-white/15 shadow-sm",
        className,
      )}
      style={{
        width: size,
        height: size,
        borderRadius: Math.max(6, Math.round(size * 0.24)),
        background: `linear-gradient(145deg, ${game.tint}, #11151d)`,
      }}
    >
      <span
        className="font-black tracking-[-0.06em] text-white/90"
        style={{ fontSize: Math.max(8, Math.round(size * 0.28)) }}
      >
        {game.short}
      </span>
      {game.icon && failedSrc !== game.icon && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={game.icon}
          alt=""
          onError={() => setFailedSrc(game.icon)}
          className="absolute inset-0 h-full w-full object-contain p-[18%] brightness-0 invert"
        />
      )}
    </span>
  );
}

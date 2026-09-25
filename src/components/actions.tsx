"use client";

import { AlertTriangle, ArrowBigDown, ArrowBigUp, Bookmark, Check, X } from "lucide-react";
import { useState } from "react";
import { useApp } from "@/lib/store";
import { cn } from "@/lib/cn";
import { Tooltip } from "./ui";

export function SaveControl({
  tutorialId,
  vertical,
}: {
  tutorialId: string;
  vertical?: boolean;
}) {
  const { saved, toggleSave } = useApp();
  const on = saved.includes(tutorialId);

  return (
    <>
      <Tooltip label={on ? "Saved" : "Save"}>
        <button
          onClick={() => toggleSave(tutorialId)}
          className={cn(
            "flex items-center gap-2 transition-colors duration-200",
            vertical ? "flex-col text-xs text-muted" : "text-muted hover:text-text",
            on && "text-xp",
          )}
          aria-label="Save"
        >
          <span
            className={cn(
              "grid place-items-center rounded-full border border-border bg-card transition-all duration-200",
              vertical ? "h-11 w-11" : "h-9 w-9",
              on && "border-xp/40 bg-xp/10",
            )}
          >
            <Bookmark className={cn("h-4 w-4", on && "fill-current")} />
          </span>
          {vertical && "Save"}
        </button>
      </Tooltip>
    </>
  );
}

export function FollowButton({
  creatorId,
  size = "md",
}: {
  creatorId: string;
  size?: "sm" | "md";
}) {
  const { followedCreators, toggleFollowCreator } = useApp();
  const on = followedCreators.includes(creatorId);
  return (
    <button
      onClick={() => toggleFollowCreator(creatorId)}
      className={cn(
        "rounded-xl font-medium transition-all duration-200",
        size === "sm" ? "h-8 px-3 text-sm" : "h-10 px-4 text-sm",
        on
          ? "bg-card border border-border text-muted hover:text-danger hover:border-danger/40"
          : "bg-accent text-white hover:bg-accent-hover",
      )}
    >
      {on ? "Following" : "Follow"}
    </button>
  );
}

export function HelpfulButton({
  tutorialId,
  countLabel,
  vertical,
}: {
  tutorialId: string;
  countLabel?: string;
  vertical?: boolean;
}) {
  const { helpful, toggleHelpful } = useApp();
  const on = helpful.includes(tutorialId);
  return (
    <button
      onClick={() => toggleHelpful(tutorialId)}
      className={cn(
        "flex items-center gap-2 transition-colors duration-200",
        vertical ? "flex-col text-xs" : "h-10 px-3 rounded-xl border text-sm font-medium",
        on
          ? "text-success border-success/30 bg-success/10"
          : "text-muted border-border hover:text-text",
        on && "helpful-burst",
      )}
    >
      <span
        className={cn(
          vertical &&
            "h-11 w-11 grid place-items-center rounded-full border border-border bg-card",
          vertical && on && "border-success/40 bg-success/10",
        )}
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M7 11v10M3 13v6a2 2 0 0 0 2 2h9.4a2 2 0 0 0 1.9-1.4l2.2-6.4A2 2 0 0 0 16.6 11H13V7a3 3 0 0 0-3-3h-.2L7 11Z" />
        </svg>
      </span>
      {vertical ? "Helpful" : countLabel ?? "Helpful"}
    </button>
  );
}

// ── Voting / patch awareness ───────────────────────────────────

type VoteCounts = { upvotes: number; downvotes: number; score: number };

/** Up/down vote on a tip. Counts come from the tip; your vote from the store. */
export function VoteControl({
  tipId,
  ownerId,
  initial,
  vertical,
}: {
  tipId: string;
  ownerId?: string;
  initial: VoteCounts;
  vertical?: boolean;
}) {
  const { myVotes, vote, currentUser, isLoggedIn } = useApp();
  const mine = myVotes[tipId] ?? 0;
  const [counts, setCounts] = useState<VoteCounts>(initial);
  const [busy, setBusy] = useState(false);
  const isOwn = Boolean(ownerId && isLoggedIn && currentUser.id === ownerId);

  async function press(direction: 1 | -1) {
    if (busy || isOwn) return;
    const next = mine === direction ? 0 : direction;
    // optimistic
    const up = counts.upvotes - (mine === 1 ? 1 : 0) + (next === 1 ? 1 : 0);
    const down = counts.downvotes - (mine === -1 ? 1 : 0) + (next === -1 ? 1 : 0);
    const before = counts;
    setCounts({ upvotes: up, downvotes: down, score: up - down });
    setBusy(true);
    const result = await vote(tipId, next as 1 | -1 | 0);
    setBusy(false);
    if (result) setCounts({ upvotes: result.upvotes, downvotes: result.downvotes, score: result.score });
    else setCounts(before);
  }

  const btn = "grid place-items-center rounded-full transition-colors disabled:opacity-40";
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border border-white/10 bg-black/40 backdrop-blur",
        vertical ? "flex-col gap-0.5 px-1 py-1" : "gap-1 px-1 h-10",
      )}
      title={isOwn ? "You can't vote on your own tip" : undefined}
    >
      <button type="button" aria-label="Upvote" aria-pressed={mine === 1} disabled={isOwn} onClick={() => press(1)} className={cn(btn, "h-8 w-8", mine === 1 ? "bg-accent text-white" : "text-white/75 hover:bg-white/10")}>
        <ArrowBigUp className={cn("h-5 w-5", mine === 1 && "fill-current")} />
      </button>
      <span className={cn("min-w-[2ch] text-center text-xs font-bold tabular-nums", mine === 1 ? "text-accent" : mine === -1 ? "text-danger" : "text-white/80")}>
        {counts.score}
      </span>
      <button type="button" aria-label="Downvote" aria-pressed={mine === -1} disabled={isOwn} onClick={() => press(-1)} className={cn(btn, "h-8 w-8", mine === -1 ? "bg-danger text-white" : "text-white/75 hover:bg-white/10")}>
        <ArrowBigDown className={cn("h-5 w-5", mine === -1 && "fill-current")} />
      </button>
    </div>
  );
}

/** "Does this still work on patch X?" with the community %. */
export function StillWorksControl({
  tipId,
  patch,
  initialPct,
  initialYes,
  initialNo,
}: {
  tipId: string;
  patch: string | null;
  initialPct: number | null;
  initialYes: number;
  initialNo: number;
}) {
  const { myFlags, flagStillWorks } = useApp();
  const mine = myFlags[tipId];
  const [totals, setTotals] = useState({ pct: initialPct, yes: initialYes, no: initialNo });
  const [busy, setBusy] = useState(false);

  async function answer(works: boolean) {
    if (busy) return;
    setBusy(true);
    const result = await flagStillWorks(tipId, mine === works ? null : works);
    setBusy(false);
    if (result) setTotals({ pct: result.pct === null ? null : Number(result.pct), yes: result.yes, no: result.no });
  }

  const total = totals.yes + totals.no;
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold">Still works on {patch ? `patch ${patch}` : "the current patch"}?</div>
          <div className="mt-0.5 text-xs text-muted">
            {total === 0 ? "No answers yet this patch" : `${totals.pct}% say yes · ${total} ${total === 1 ? "answer" : "answers"}`}
          </div>
        </div>
        <div className="flex gap-2">
          <button type="button" disabled={busy} onClick={() => answer(true)} aria-pressed={mine === true} className={cn("h-9 rounded-xl border px-3 text-sm font-semibold transition-colors", mine === true ? "border-success/50 bg-success/15 text-success" : "border-border text-muted hover:bg-hover hover:text-text")}>
            <Check className="mr-1 inline h-4 w-4" />Works
          </button>
          <button type="button" disabled={busy} onClick={() => answer(false)} aria-pressed={mine === false} className={cn("h-9 rounded-xl border px-3 text-sm font-semibold transition-colors", mine === false ? "border-danger/50 bg-danger/15 text-danger" : "border-border text-muted hover:bg-hover hover:text-text")}>
            <X className="mr-1 inline h-4 w-4" />Doesn&apos;t work
          </button>
        </div>
      </div>
      {total > 0 && (
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-elevated">
          <div className="h-full rounded-full bg-success" style={{ width: `${totals.pct ?? 0}%` }} />
        </div>
      )}
    </div>
  );
}

/** Patch badge + "may be outdated" label. */
export function PatchBadge({ patch, current, outdated, className }: { patch?: string | null; current?: boolean; outdated?: boolean; className?: string }) {
  if (outdated) {
    return (
      <span className={cn("inline-flex items-center gap-1 rounded-md bg-amber-400/15 px-1.5 py-0.5 text-[11px] font-semibold text-amber-300", className)} title={patch ? `Made on patch ${patch}` : undefined}>
        <AlertTriangle className="h-3 w-3" />May be outdated{patch ? ` · ${patch}` : ""}
      </span>
    );
  }
  return (
    <span className={cn("rounded-md px-1.5 py-0.5 text-[11px] font-semibold", patch && current ? "bg-accent/85 text-white" : "bg-black/60 text-white/80", className)}>
      {patch ? `Patch ${patch}` : "Patch ?"}
    </span>
  );
}

"use client";

import { AlertTriangle, ArrowBigDown, ArrowBigUp, Bookmark, Check, X } from "lucide-react";
import { useState } from "react";
import { useApp } from "@/lib/store";
import { buttonClass } from "./ui";
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
  if (vertical) {
    return (
      <button type="button" onClick={() => toggleSave(tutorialId)} aria-label={on ? "Saved" : "Save"} aria-pressed={on} className="group flex flex-col items-center gap-1 text-[11px] font-bold text-white/80">
        <span className={cn("grid h-11 w-11 place-items-center rounded-full border backdrop-blur-md transition", on ? "border-accent/60 bg-accent/25 text-accent" : "border-white/10 bg-black/45 group-hover:bg-white/15 md:bg-white/[0.07]")}>
          <Bookmark className={cn("h-5 w-5", on && "fill-current")} />
        </span>
        {on ? "Saved" : "Save"}
      </button>
    );
  }
  return (
    <Tooltip label={on ? "Saved" : "Save"}>
      <button type="button" onClick={() => toggleSave(tutorialId)} aria-label="Save" aria-pressed={on} className={buttonClass(on ? "outline" : "secondary", "icon", on ? "border-accent/60 text-accent" : undefined)}>
        <Bookmark className={cn("h-4 w-4", on && "fill-current")} />
      </button>
    </Tooltip>
  );
}

export function FollowButton({
  creatorId,
  size = "md",
}: {
  creatorId: string;
  size?: "sm" | "md";
}) {
  const { followedCreators, toggleFollowCreator, currentUser, isLoggedIn } = useApp();
  if (isLoggedIn && currentUser.id === creatorId) return null;
  const on = followedCreators.includes(creatorId);
  return (
    <button
      type="button"
      onClick={() => toggleFollowCreator(creatorId)}
      className={buttonClass(on ? "secondary" : "primary", size === "sm" ? "sm" : "md", on ? "text-muted hover:border-danger/40 hover:text-danger" : undefined)}
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
  target = "tip",
}: {
  /** id of the tip or build */
  tipId: string;
  ownerId?: string;
  initial: VoteCounts;
  vertical?: boolean;
  target?: "tip" | "build";
}) {
  const { myVotes, myBuildVotes, vote, currentUser, isLoggedIn } = useApp();
  const mine = (target === "tip" ? myVotes : myBuildVotes)[tipId] ?? 0;
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
    const result = await vote(tipId, next as 1 | -1 | 0, target);
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
      title={isOwn ? `You can't vote on your own ${target}` : undefined}
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
  target = "tip",
  compact,
}: {
  tipId: string;
  patch: string | null;
  initialPct: number | null;
  initialYes: number;
  initialNo: number;
  target?: "tip" | "build";
  compact?: boolean;
}) {
  const { myFlags, myBuildFlags, flagStillWorks } = useApp();
  const mine = (target === "tip" ? myFlags : myBuildFlags)[tipId];
  const [totals, setTotals] = useState({ pct: initialPct, yes: initialYes, no: initialNo });
  const [busy, setBusy] = useState(false);

  async function answer(works: boolean) {
    if (busy) return;
    setBusy(true);
    const result = await flagStillWorks(tipId, mine === works ? null : works, target);
    setBusy(false);
    if (result) setTotals({ pct: result.pct === null ? null : Number(result.pct), yes: result.yes, no: result.no });
  }

  const total = totals.yes + totals.no;
  if (compact) {
    return (
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="text-muted">Works on {patch ?? "this patch"}?</span>
        <button type="button" disabled={busy} onClick={() => answer(true)} aria-pressed={mine === true} className={cn("h-7 rounded-lg border px-2 font-semibold", mine === true ? "border-success/50 bg-success/15 text-success" : "border-white/[0.08] text-muted hover:text-white")}><Check className="mr-0.5 inline h-3.5 w-3.5" />Yes</button>
        <button type="button" disabled={busy} onClick={() => answer(false)} aria-pressed={mine === false} className={cn("h-7 rounded-lg border px-2 font-semibold", mine === false ? "border-danger/50 bg-danger/15 text-danger" : "border-white/[0.08] text-muted hover:text-white")}><X className="mr-0.5 inline h-3.5 w-3.5" />No</button>
        {total > 0 && <span className={cn("font-semibold", (totals.pct ?? 0) >= 50 ? "text-success" : "text-amber-300")}>{totals.pct}% of {total} say yes</span>}
      </div>
    );
  }
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

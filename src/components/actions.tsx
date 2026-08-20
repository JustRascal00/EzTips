"use client";

import { Bookmark } from "lucide-react";
import { useState } from "react";
import { useApp } from "@/lib/store";
import { cn } from "@/lib/cn";
import { Button, Modal } from "./ui";
import { Tooltip } from "./ui";

export function SaveControl({
  tutorialId,
  vertical,
}: {
  tutorialId: string;
  vertical?: boolean;
}) {
  const { saved, toggleSave, collections, saveToCollection, createCollection } = useApp();
  const on = saved.includes(tutorialId);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");

  return (
    <>
      <Tooltip label={on ? "Saved" : "Save"}>
        <button
          onClick={() => {
            if (on) toggleSave(tutorialId);
            else setOpen(true);
          }}
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
      <Modal open={open} onClose={() => setOpen(false)} title="Save to collection">
        <div className="space-y-2 mb-4">
          {collections.map((c) => (
            <button
              key={c.id}
              onClick={() => {
                saveToCollection(tutorialId, c.id);
                setOpen(false);
              }}
              className="w-full flex items-center justify-between rounded-xl border border-border bg-card px-3 py-2.5 text-sm hover:bg-hover transition-colors duration-150"
            >
              <span>{c.name}</span>
              <span className="text-muted text-xs">{c.tutorialIds.length}</span>
            </button>
          ))}
        </div>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!name.trim()) return;
            createCollection(name.trim(), tutorialId);
            setName("");
            setOpen(false);
          }}
        >
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="New collection"
            className="flex-1 h-10 rounded-xl bg-card border border-border px-3 text-sm outline-none"
          />
          <Button type="submit">Create</Button>
        </form>
        <button
          className="mt-3 text-sm text-muted hover:text-text"
          onClick={() => {
            toggleSave(tutorialId);
            setOpen(false);
          }}
        >
          Save without a collection
        </button>
      </Modal>
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

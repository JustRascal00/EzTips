"use client";

import { notifications as fallback } from "@/data/notifications";
import { formatTimeAgo } from "@/lib/format";
import { useApp } from "@/lib/store";
import { cn } from "@/lib/cn";
import { X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Tabs } from "../ui";

export function NotificationPanel({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { notifications, markAllRead } = useApp();
  const list = notifications.length ? notifications : fallback;
  const [tab, setTab] = useState("all");
  const filtered =
    tab === "all" ? list : list.filter((n) => n.category === tab);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[70] flex justify-end">
      <button className="absolute inset-0 bg-black/40" onClick={onClose} aria-label="Close" />
      <div className="relative w-full max-w-md h-full bg-elevated border-l border-border flex flex-col fade-up">
        <div className="flex items-center justify-between px-5 h-16 border-b border-border">
          <h2 className="font-semibold">Notifications</h2>
          <div className="flex items-center gap-2">
            <button onClick={markAllRead} className="text-xs text-muted hover:text-text">
              Mark all read
            </button>
            <button onClick={onClose} aria-label="Close">
              <X className="h-4 w-4 text-muted" />
            </button>
          </div>
        </div>
        <Tabs
          tabs={[
            { id: "all", label: "All" },
            { id: "creators", label: "Creators" },
            { id: "replies", label: "Replies" },
            { id: "learning", label: "Learning" },
          ]}
          value={tab}
          onChange={setTab}
        />
        <div className="flex-1 overflow-y-auto p-2">
          {filtered.map((n) => (
            <Link
              key={n.id}
              href={n.href}
              onClick={onClose}
              className={cn(
                "block rounded-xl px-3 py-3 hover:bg-hover",
                !n.read && "bg-accent/8",
              )}
            >
              <div className="text-sm font-medium">{n.title}</div>
              <div className="text-xs text-muted mt-0.5">{n.body}</div>
              <div className="text-[11px] text-muted mt-1">{formatTimeAgo(n.time)}</div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

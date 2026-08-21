"use client";

import { formatCount } from "@/lib/format";
import { useCreatorVideos } from "@/lib/supabase/creator";
import { useApp } from "@/lib/store";
import { BarChart3, Bookmark, Eye, FolderOpen, Heart, MessageSquareText, Settings2, TrendingUp, UserRound, Users } from "lucide-react";
import Link from "next/link";
import { PageHeading } from "./StudioDashboard";

export function StudioAnalytics() {
  const { videos, stats, loading } = useCreatorVideos();
  const maxViews = Math.max(1, ...videos.map((video) => video.views));
  return <div className="space-y-7"><PageHeading eyebrow="Performance" title="Analytics" description="Understand which tips players watch, like, and save." /><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><MiniMetric icon={Eye} label="Views" value={stats.views} /><MiniMetric icon={Heart} label="Likes" value={stats.likes} /><MiniMetric icon={Bookmark} label="Saves" value={stats.saves} /><MiniMetric icon={Users} label="Followers" value={stats.followers} /></div><section className="rounded-2xl border border-border bg-card p-5"><div className="flex items-center gap-2"><TrendingUp className="h-5 w-5 text-accent" /><h2 className="font-semibold">Tip performance</h2></div>{loading ? <p className="mt-8 text-sm text-muted">Loading analytics…</p> : videos.length ? <div className="mt-6 space-y-5">{videos.slice(0, 8).map((video) => <div key={video.id}><div className="mb-2 flex items-center justify-between gap-4 text-sm"><span className="truncate">{video.title}</span><span className="shrink-0 text-muted">{formatCount(video.views)} views</span></div><div className="h-2 overflow-hidden rounded-full bg-elevated"><div className="h-full rounded-full bg-gradient-to-r from-accent to-cyan-400" style={{ width: `${Math.max(3, (video.views / maxViews) * 100)}%` }} /></div></div>)}</div> : <Empty icon={BarChart3} title="Analytics start after your first upload" text="Publish a tip and its performance will appear here." />}</section></div>;
}

export function StudioComments() { return <div className="space-y-7"><PageHeading eyebrow="Community" title="Comments" description="Keep up with questions and feedback players leave on your tips." /><section className="rounded-2xl border border-border bg-card"><Empty icon={MessageSquareText} title="No creator comments yet" text="New comments on your uploaded tips will be collected here." /></section></div>; }

export function StudioCollections() {
  const { collections } = useApp();
  return <div className="space-y-7"><PageHeading eyebrow="Organization" title="Collections / Series" description="Group related tips into a sequence players can follow." /><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{collections.map((collection) => <article key={collection.id} className="rounded-2xl border border-border bg-card p-5"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 text-accent"><FolderOpen className="h-5 w-5" /></div><h2 className="mt-4 font-semibold">{collection.name}</h2><p className="mt-1 text-sm text-muted">{collection.tutorialIds.length} tips · {collection.public ? "Public" : "Private"}</p></article>)}</div></div>;
}

export function StudioProfile() {
  const { currentUser } = useApp();
  return <div className="space-y-7"><PageHeading eyebrow="Your channel" title="Creator Profile" description="Preview the identity players see when they discover your gaming tips." /><section className="rounded-2xl border border-border bg-card p-6"><div className="flex flex-col gap-5 sm:flex-row sm:items-center"><img src={currentUser.avatar} alt="" className="h-24 w-24 rounded-full object-cover" /><div className="min-w-0 flex-1"><h2 className="text-2xl font-bold">{currentUser.displayName}</h2><p className="text-sm text-muted">@{currentUser.username}</p><p className="mt-3 max-w-xl text-sm text-muted">{currentUser.bio}</p></div><Link href="/settings" className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-border px-4 text-sm font-semibold hover:bg-hover"><UserRound className="h-4 w-4" />Edit profile</Link></div></section></div>;
}

export function StudioSettings() { return <div className="space-y-7"><PageHeading eyebrow="Preferences" title="Creator settings" description="Control defaults for your creator workspace without changing the viewer experience." /><section className="divide-y divide-border rounded-2xl border border-border bg-card"><Setting title="Default upload visibility" text="New uploads begin as Public; you can change this before publishing." /><Setting title="Comment notifications" text="Receive notifications when players ask questions on your tips." toggle /><Setting title="Creator analytics" text="Keep aggregate viewing and save metrics available in Studio." toggle /></section></div>; }

function MiniMetric({ icon: Icon, label, value }: { icon: typeof Eye; label: string; value: number }) { return <div className="rounded-2xl border border-border bg-card p-5"><Icon className="h-5 w-5 text-accent" /><div className="mt-4 text-2xl font-bold">{formatCount(value)}</div><div className="mt-1 text-sm text-muted">{label}</div></div>; }
function Empty({ icon: Icon, title, text }: { icon: typeof Eye; title: string; text: string }) { return <div className="flex flex-col items-center px-5 py-16 text-center"><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/10 text-accent"><Icon className="h-6 w-6" /></div><h2 className="mt-4 font-semibold">{title}</h2><p className="mt-1 max-w-sm text-sm text-muted">{text}</p></div>; }
function Setting({ title, text, toggle }: { title: string; text: string; toggle?: boolean }) { return <div className="flex items-center justify-between gap-6 p-5"><div><div className="font-medium">{title}</div><p className="mt-1 text-sm text-muted">{text}</p></div>{toggle ? <button aria-label={title} className="relative h-6 w-11 shrink-0 rounded-full bg-accent"><span className="absolute right-1 top-1 h-4 w-4 rounded-full bg-white" /></button> : <Settings2 className="h-5 w-5 shrink-0 text-muted" />}</div>; }

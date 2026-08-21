"use client";

import { games } from "@/data/games";
import { formatCount, formatTimeAgo } from "@/lib/format";
import { useCreatorVideos } from "@/lib/supabase/creator";
import { BarChart3, Bookmark, Clapperboard, Clock3, Eye, Heart, Plus, TrendingUp, Users } from "lucide-react";
import Link from "next/link";

export function StudioDashboard() {
  const { videos, stats, loading, error } = useCreatorVideos();
  const published = videos.filter((video) => video.status === "published");
  const topViewed = [...published].sort((a, b) => b.views - a.views)[0];
  const topSaved = [...published].sort((a, b) => b.saves_count - a.saves_count)[0];

  return (
    <div className="space-y-8">
      <PageHeading eyebrow="Overview" title="Your creator dashboard" description="See what players are learning from your tips and manage your latest uploads." />
      {error && <Notice>{error}. Run the latest Supabase migration if Creator Studio was just added.</Notice>}
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Metric label="Total views" value={formatCount(stats.views)} icon={Eye} loading={loading} />
        <Metric label="Followers" value={formatCount(stats.followers)} icon={Users} loading={loading} />
        <Metric label="Likes" value={formatCount(stats.likes)} icon={Heart} loading={loading} />
        <Metric label="Saves" value={formatCount(stats.saves)} icon={Bookmark} loading={loading} />
        <Metric label="Watch time" value={`${Math.round(stats.watchSeconds / 3600)}h`} icon={Clock3} loading={loading} />
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(300px,.75fr)]">
        <section className="overflow-hidden rounded-2xl border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border p-5"><div><h2 className="font-semibold">Recent tips</h2><p className="mt-1 text-sm text-muted">Your latest published videos and drafts.</p></div><Link href="/studio/content" className="text-sm font-semibold text-accent hover:text-accent-hover">View all</Link></div>
          {loading ? <div className="p-8 text-sm text-muted">Loading your content…</div> : videos.length ? (
            <div className="divide-y divide-border">
              {videos.slice(0, 5).map((video) => {
                const game = games.find((item) => item.id === video.game_id);
                return (
                  <div key={video.id} className="grid grid-cols-[72px_minmax(0,1fr)_auto] items-center gap-3 p-4 sm:grid-cols-[92px_minmax(0,1fr)_100px_80px]">
                    <div className="aspect-video overflow-hidden rounded-lg bg-elevated">{video.thumbnail_url && <img src={video.thumbnail_url} alt="" className="h-full w-full object-cover" />}</div>
                    <div className="min-w-0"><div className="truncate text-sm font-semibold">{video.title}</div><div className="mt-1 truncate text-xs text-muted">{game?.name ?? video.game_id} · {video.topic || video.category}</div></div>
                    <div className="hidden text-sm text-muted sm:block"><Eye className="mr-1 inline h-3.5 w-3.5" />{formatCount(video.views)}</div>
                    <Status status={video.status} visibility={video.visibility} />
                  </div>
                );
              })}
            </div>
          ) : <EmptyContent />}
        </section>

        <section className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center gap-2"><BarChart3 className="h-5 w-5 text-accent" /><h2 className="font-semibold">Recent performance</h2></div>
          <div className="mt-5 space-y-5">
            <Performance label="Views this week" value={formatCount(stats.views)} detail={videos.length ? "Across all uploaded tips" : "Upload a tip to begin"} />
            <Performance label="Most viewed tip" value={topViewed ? formatCount(topViewed.views) : "—"} detail={topViewed?.title ?? "No published tips yet"} />
            <Performance label="Most saved tip" value={topSaved ? formatCount(topSaved.saves_count) : "—"} detail={topSaved?.title ?? "No published tips yet"} />
            <Performance label="Follower growth" value={stats.followers ? `+${formatCount(stats.followers)}` : "0"} detail="All-time creator followers" />
          </div>
          <Link href="/studio/analytics" className="mt-6 flex h-10 items-center justify-center gap-2 rounded-xl border border-border text-sm font-semibold hover:bg-hover"><TrendingUp className="h-4 w-4" />Open analytics</Link>
        </section>
      </div>
    </div>
  );
}

export function PageHeading({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: React.ReactNode }) {
  return <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><div className="text-xs font-bold uppercase tracking-[0.18em] text-accent">{eyebrow}</div><h1 className="mt-2 text-2xl font-bold sm:text-3xl">{title}</h1><p className="mt-2 max-w-2xl text-sm text-muted sm:text-base">{description}</p></div>{action}</div>;
}

export function Status({ status, visibility }: { status: string; visibility: string }) {
  const draft = status === "draft";
  return <span className={`inline-flex w-fit rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize ${draft ? "bg-amber-400/10 text-amber-300" : visibility === "unlisted" ? "bg-blue-400/10 text-blue-300" : "bg-emerald-400/10 text-emerald-300"}`}>{draft ? "Draft" : visibility}</span>;
}

function Metric({ label, value, icon: Icon, loading }: { label: string; value: string; icon: typeof Eye; loading: boolean }) {
  return <div className="rounded-2xl border border-border bg-card p-5"><div className="flex items-center justify-between text-sm text-muted"><span>{label}</span><Icon className="h-4 w-4 text-accent" /></div><div className="mt-3 text-2xl font-bold">{loading ? "—" : value}</div></div>;
}

function Performance({ label, value, detail }: { label: string; value: string; detail: string }) {
  return <div><div className="flex items-center justify-between gap-4"><span className="text-sm text-muted">{label}</span><strong className="text-sm">{value}</strong></div><div className="mt-1 truncate text-xs text-muted/70" title={detail}>{detail}</div></div>;
}

function EmptyContent() {
  return <div className="flex flex-col items-center px-5 py-14 text-center"><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/10 text-accent"><Clapperboard className="h-6 w-6" /></div><h3 className="mt-4 font-semibold">Share your first useful moment</h3><p className="mt-1 max-w-sm text-sm text-muted">Turn one gameplay trick into a short tip. You can save it as a draft before publishing.</p><Link href="/studio/upload" className="mt-5 inline-flex h-10 items-center gap-2 rounded-xl bg-accent px-4 text-sm font-semibold"><Plus className="h-4 w-4" />Upload Tip</Link></div>;
}

function Notice({ children }: { children: React.ReactNode }) {
  return <div className="rounded-xl border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">{children}</div>;
}

export function formatDate(value: string) { return formatTimeAgo(value); }

"use client";

import { games } from "@/data/games";
import { formatCount } from "@/lib/format";
import { type CreatorVideo, useCreatorVideos } from "@/lib/supabase/creator";
import { useApp } from "@/lib/store";
import { BarChart3, Bookmark, Edit3, Eye, Heart, MoreHorizontal, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { PageHeading, Status, formatDate } from "./StudioDashboard";

export function StudioContent({ draftsOnly = false }: { draftsOnly?: boolean }) {
  const { videos, loading, error, updateVisibility, deleteVideo } = useCreatorVideos();
  const { toast } = useApp();
  const [busy, setBusy] = useState("");
  const rows = draftsOnly ? videos.filter((video) => video.status === "draft") : videos;

  async function changeVisibility(video: CreatorVideo, value: "public" | "unlisted" | "draft") {
    try { setBusy(video.id); await updateVisibility(video, value); toast(value === "draft" ? "Moved to drafts" : `Visibility changed to ${value}`); }
    catch (cause) { toast(cause instanceof Error ? cause.message : "Could not update the tip"); }
    finally { setBusy(""); }
  }

  async function remove(video: CreatorVideo) {
    if (!window.confirm(`Delete “${video.title}”? This cannot be undone.`)) return;
    try { setBusy(video.id); await deleteVideo(video); toast("Tip deleted"); }
    catch (cause) { toast(cause instanceof Error ? cause.message : "Could not delete the tip"); }
    finally { setBusy(""); }
  }

  return (
    <div className="space-y-7">
      <PageHeading eyebrow={draftsOnly ? "Workspace" : "Library"} title={draftsOnly ? "Drafts" : "Content"} description={draftsOnly ? "Finish ideas on your own schedule, then publish when they are ready." : "Manage every gaming tip, its visibility, performance, and details from one place."} action={<Link href="/studio/upload" className="inline-flex h-10 items-center gap-2 rounded-xl bg-accent px-4 text-sm font-semibold"><Plus className="h-4 w-4" />Upload Tip</Link>} />
      {error && <div className="rounded-xl border border-danger/20 bg-danger/10 p-3 text-sm text-red-200">{error}</div>}
      <section className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border p-4"><div className="text-sm font-semibold">{rows.length} {rows.length === 1 ? "tip" : "tips"}</div><div className="text-xs text-muted">Creator content only</div></div>
        {loading ? <div className="p-10 text-center text-sm text-muted">Loading content…</div> : rows.length ? (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[1050px] text-left text-sm">
                <thead className="border-b border-border bg-elevated/50 text-xs text-muted"><tr><th className="px-4 py-3 font-medium">Video</th><th className="px-4 py-3 font-medium">Game / topic</th><th className="px-4 py-3 font-medium">Visibility</th><th className="px-4 py-3 font-medium">Views</th><th className="px-4 py-3 font-medium">Likes</th><th className="px-4 py-3 font-medium">Saves</th><th className="px-4 py-3 font-medium">Uploaded</th><th className="px-4 py-3 font-medium">Actions</th></tr></thead>
                <tbody className="divide-y divide-border">{rows.map((video) => <ContentRow key={video.id} video={video} busy={busy === video.id} onVisibility={changeVisibility} onDelete={remove} />)}</tbody>
              </table>
            </div>
            <div className="divide-y divide-border md:hidden">{rows.map((video) => <ContentCard key={video.id} video={video} busy={busy === video.id} onVisibility={changeVisibility} onDelete={remove} />)}</div>
          </>
        ) : <div className="p-12 text-center"><h3 className="font-semibold">{draftsOnly ? "No drafts waiting" : "No uploaded tips yet"}</h3><p className="mt-1 text-sm text-muted">{draftsOnly ? "Drafts you save will appear here." : "Upload a short gaming tip when you are ready to create."}</p><Link href="/studio/upload" className="mt-5 inline-flex h-10 items-center gap-2 rounded-xl bg-accent px-4 text-sm font-semibold"><Plus className="h-4 w-4" />Upload Tip</Link></div>}
      </section>
    </div>
  );
}

type RowProps = { video: CreatorVideo; busy: boolean; onVisibility: (v: CreatorVideo, x: "public" | "unlisted" | "draft") => void; onDelete: (v: CreatorVideo) => void };

function ContentRow({ video, busy, onVisibility, onDelete }: RowProps) {
  const game = games.find((item) => item.id === video.game_id);
  return <tr className="hover:bg-hover/40"><td className="px-4 py-3"><div className="flex w-[290px] items-center gap-3"><Thumb video={video} /><div className="min-w-0"><div className="truncate font-semibold">{video.title}</div><div className="mt-1 text-xs text-muted">{video.duration_seconds}s</div></div></div></td><td className="px-4 py-3"><div>{game?.name ?? video.game_id}</div><div className="mt-1 text-xs text-muted">{video.topic || video.category}</div></td><td className="px-4 py-3"><VisibilityControl video={video} busy={busy} onChange={onVisibility} /></td><td className="px-4 py-3 text-muted">{formatCount(video.views)}</td><td className="px-4 py-3 text-muted">{formatCount(video.likes_count)}</td><td className="px-4 py-3 text-muted">{formatCount(video.saves_count)}</td><td className="px-4 py-3 text-muted">{formatDate(video.created_at)}</td><td className="px-4 py-3"><Actions video={video} busy={busy} onDelete={onDelete} /></td></tr>;
}

function ContentCard({ video, busy, onVisibility, onDelete }: RowProps) {
  const game = games.find((item) => item.id === video.game_id);
  return <article className="p-4"><div className="flex gap-3"><Thumb video={video} /><div className="min-w-0 flex-1"><div className="line-clamp-2 text-sm font-semibold">{video.title}</div><div className="mt-1 text-xs text-muted">{game?.name} · {video.topic || video.category}</div><div className="mt-2"><Status status={video.status} visibility={video.visibility} /></div></div></div><div className="mt-4 grid grid-cols-3 gap-2 rounded-xl bg-elevated p-3 text-center text-xs text-muted"><span><Eye className="mx-auto mb-1 h-4 w-4" />{formatCount(video.views)}</span><span><Heart className="mx-auto mb-1 h-4 w-4" />{formatCount(video.likes_count)}</span><span><Bookmark className="mx-auto mb-1 h-4 w-4" />{formatCount(video.saves_count)}</span></div><div className="mt-3 flex items-center justify-between"><VisibilityControl video={video} busy={busy} onChange={onVisibility} /><Actions video={video} busy={busy} onDelete={onDelete} /></div></article>;
}

function Thumb({ video }: { video: CreatorVideo }) { return <div className="h-14 w-24 shrink-0 overflow-hidden rounded-lg bg-elevated">{video.thumbnail_url ? <img src={video.thumbnail_url} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-xs text-muted">No cover</div>}</div>; }

function VisibilityControl({ video, busy, onChange }: { video: CreatorVideo; busy: boolean; onChange: RowProps["onVisibility"] }) {
  const value = video.status === "draft" ? "draft" : video.visibility;
  return <select aria-label={`Visibility for ${video.title}`} disabled={busy} value={value} onChange={(event) => onChange(video, event.target.value as "public" | "unlisted" | "draft")} className="h-9 rounded-lg border border-border bg-elevated px-2 text-xs outline-none focus:border-accent"><option value="public">Public</option><option value="unlisted">Unlisted</option><option value="draft">Draft</option></select>;
}

function Actions({ video, busy, onDelete }: { video: CreatorVideo; busy: boolean; onDelete: (v: CreatorVideo) => void }) {
  return <div className="flex items-center gap-1"><Link href={`/studio/content/${video.id}`} title="Edit" className="rounded-lg p-2 text-muted hover:bg-hover hover:text-text"><Edit3 className="h-4 w-4" /></Link><Link href={`/studio/analytics?video=${video.id}`} title="View analytics" className="rounded-lg p-2 text-muted hover:bg-hover hover:text-text"><BarChart3 className="h-4 w-4" /></Link>{video.status === "published" && <Link href={`/t/${video.slug}`} title="View tip" className="rounded-lg p-2 text-muted hover:bg-hover hover:text-text"><Eye className="h-4 w-4" /></Link>}<button disabled={busy} onClick={() => onDelete(video)} title="Delete" className="rounded-lg p-2 text-muted hover:bg-danger/10 hover:text-danger"><Trash2 className="h-4 w-4" /></button><MoreHorizontal className="hidden h-4 w-4 text-muted" /></div>;
}

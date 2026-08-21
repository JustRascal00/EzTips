"use client";

import { Button } from "@/components/ui";
import { games } from "@/data/games";
import { createClient } from "@/lib/supabase/client";
import { useApp } from "@/lib/store";
import { ArrowLeft, ImageIcon, LoaderCircle, Save } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { PageHeading } from "./StudioDashboard";

type EditableVideo = { id: string; title: string; description: string | null; game_id: string; category: string; topic: string | null; tags: string[]; thumbnail_url: string | null };
const inputCls = "w-full h-11 rounded-xl bg-elevated border border-border px-3 text-sm outline-none focus:border-accent/60";

export function StudioEditVideo() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useApp();
  const [video, setVideo] = useState<EditableVideo | null>(null);
  const [tags, setTags] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) { queueMicrotask(() => setLoading(false)); return; }
    void (async () => {
      const { data, error: loadError } = await supabase.from("videos").select("id,title,description,game_id,category,topic,tags,thumbnail_url").eq("id", id).maybeSingle();
      if (loadError) setError(loadError.message);
      const row = data as EditableVideo | null;
      setVideo(row); setTags(row?.tags?.join(", ") ?? ""); setLoading(false);
    })();
  }, [id]);

  async function save() {
    if (!video || video.title.trim().length < 3) { setError("Title must have at least 3 characters."); return; }
    const supabase = createClient(); if (!supabase) return;
    setSaving(true); setError("");
    const { error: updateError } = await supabase.from("videos").update({
      title: video.title.trim(), description: video.description?.trim() || null, game_id: video.game_id,
      category: video.topic?.trim() || "Tips", topic: video.topic?.trim() || "Tips",
      tags: tags.split(",").map((tag) => tag.trim().replace(/^#/, "")).filter(Boolean).slice(0, 12),
      thumbnail_url: video.thumbnail_url?.trim() || null, updated_at: new Date().toISOString(),
    }).eq("id", video.id);
    setSaving(false);
    if (updateError) { setError(updateError.message); return; }
    toast("Tip details updated"); router.push("/studio/content");
  }

  if (loading) return <div className="py-12 text-sm text-muted">Loading tip details…</div>;
  if (!video) return <div className="rounded-2xl border border-border bg-card p-8"><h1 className="text-xl font-bold">Tip not found</h1><p className="mt-2 text-sm text-muted">It may have been deleted or you do not have access.</p><Link href="/studio/content" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-accent"><ArrowLeft className="h-4 w-4" />Back to content</Link></div>;

  const selectedGame = games.find((game) => game.id === video.game_id);
  return <div className="space-y-7"><PageHeading eyebrow="Content editor" title="Edit tip" description="Update the title, discovery metadata, or cover shown to players." /><section className="grid gap-6 rounded-2xl border border-border bg-card p-5 lg:grid-cols-[1fr_320px] lg:p-7"><div className="space-y-5"><Field label="Title"><input maxLength={140} value={video.title} onChange={(e) => setVideo({ ...video, title: e.target.value })} className={inputCls} /></Field><Field label="Description"><textarea maxLength={1000} value={video.description ?? ""} onChange={(e) => setVideo({ ...video, description: e.target.value })} className={`${inputCls} min-h-28 py-3`} /></Field><div className="grid gap-5 sm:grid-cols-2"><Field label="Game"><select value={video.game_id} onChange={(e) => setVideo({ ...video, game_id: e.target.value })} className={inputCls}>{games.map((game) => <option key={game.id} value={game.id}>{game.name}</option>)}</select></Field><Field label="Topic"><input value={video.topic ?? video.category} onChange={(e) => setVideo({ ...video, topic: e.target.value })} className={inputCls} /></Field></div><Field label="Tags"><input value={tags} onChange={(e) => setTags(e.target.value)} className={inputCls} /></Field></div><div><div className="text-sm font-medium">Cover image</div><div className="mt-2 flex aspect-video items-center justify-center overflow-hidden rounded-xl bg-elevated">{video.thumbnail_url ? <img src={video.thumbnail_url} alt="Current cover" className="h-full w-full object-cover" /> : <ImageIcon className="h-7 w-7 text-muted" />}</div><input aria-label="Cover image URL" value={video.thumbnail_url ?? ""} onChange={(e) => setVideo({ ...video, thumbnail_url: e.target.value })} placeholder="Cover image URL" className={`${inputCls} mt-3`} /><button type="button" onClick={() => setVideo({ ...video, thumbnail_url: selectedGame?.banner ?? null })} className="mt-2 text-xs font-semibold text-accent">Use {selectedGame?.name} cover</button></div></section>{error && <div className="rounded-xl border border-danger/20 bg-danger/10 p-3 text-sm text-red-200">{error}</div>}<div className="flex justify-between"><Link href="/studio/content" className="inline-flex h-10 items-center gap-2 rounded-xl px-3 text-sm text-muted hover:bg-hover hover:text-text"><ArrowLeft className="h-4 w-4" />Cancel</Link><Button disabled={saving} onClick={save}>{saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}Save changes</Button></div></div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block"><span className="mb-2 block text-sm font-medium">{label}</span>{children}</label>; }

"use client";

import { ChampionPicker, ChampionSlot } from "@/components/league";
import { buttonClass, Segmented } from "@/components/ui";
import { cn } from "@/lib/cn";
import { championSplashUrl } from "@/lib/ddragon/shared";
import { ROLES } from "@/lib/league";
import { useApp } from "@/lib/store";
import { createClient } from "@/lib/supabase/client";
import { listPatches, listTags, type PatchRow, type TagRow } from "@/lib/tips";
import { useChampions, useSupabaseQuery } from "@/lib/use-tips";
import { ArrowLeft, ExternalLink, LoaderCircle, Plus, Save, X } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

type Row = {
  id: string; slug: string; title: string; description: string | null; topic: string | null; tags: string[] | null;
  thumbnail_url: string | null; video_url: string; duration_seconds: number;
  champion_id: string | null; role_id: string | null; map_id: string | null; patch_id: number | null;
  skill_level: string; learning_metadata: Record<string, unknown> | null;
};
const inputCls = "w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-3.5 text-sm outline-none transition-colors hover:border-white/[0.14] focus:border-accent/60";

export function StudioEditVideo() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useApp();
  const { data: champions } = useChampions();
  const { data: patches } = useSupabaseQuery("edit-patches", (c) => listPatches(c, 20), [] as PatchRow[]);
  const { data: tagOptions } = useSupabaseQuery("edit-tags", listTags, [] as TagRow[]);
  const [row, setRow] = useState<Row | null>(null);
  const [points, setPoints] = useState<string[]>([""]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [picking, setPicking] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) { queueMicrotask(() => setLoading(false)); return; }
    void (async () => {
      const { data, error: loadError } = await supabase
        .from("videos")
        .select("id,slug,title,description,topic,tags,thumbnail_url,video_url,duration_seconds,champion_id,role_id,map_id,patch_id,skill_level,learning_metadata")
        .eq("id", id)
        .maybeSingle();
      if (loadError) setError(loadError.message);
      const r = data as Row | null;
      setRow(r);
      const tk = r?.learning_metadata?.takeaways;
      setPoints(Array.isArray(tk) && tk.length ? (tk as string[]) : [""]);
      setLoading(false);
    })();
  }, [id]);

  const champion = champions.find((c) => c.id === row?.champion_id);
  const set = (patch: Partial<Row>) => setRow((r) => (r ? { ...r, ...patch } : r));

  async function save() {
    if (!row) return;
    if (row.title.trim().length < 3) { setError("Title must have at least 3 characters."); return; }
    const supabase = createClient(); if (!supabase) return;
    setSaving(true); setError("");
    const { error: updateError } = await supabase.from("videos").update({
      title: row.title.trim(),
      description: row.description?.trim() || null,
      topic: row.topic?.trim() || "Tips",
      category: row.topic?.trim() || "Tips",
      tags: (row.tags ?? []).slice(0, 12),
      champion_id: row.champion_id,
      character: champion?.name ?? null,
      role_id: row.role_id,
      map_id: row.map_id ?? "sr",
      patch_id: row.patch_id,
      skill_level: row.skill_level,
      thumbnail_url: row.thumbnail_url,
      learning_metadata: { ...(row.learning_metadata ?? {}), takeaways: points.map((p) => p.trim()).filter(Boolean).slice(0, 5) },
      updated_at: new Date().toISOString(),
    }).eq("id", row.id);
    setSaving(false);
    if (updateError) { setError(updateError.message); return; }
    toast("Tip updated");
    router.push("/studio/content");
  }

  if (loading) return <div className="py-12 text-sm text-muted">Loading tip…</div>;
  if (!row) return <div className="rounded-2xl border border-white/[0.06] bg-panel p-8"><h1 className="text-xl font-bold">Tip not found</h1><p className="mt-2 text-sm text-muted">It may have been deleted, or it isn&apos;t yours.</p><Link href="/studio/content" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-accent"><ArrowLeft className="h-4 w-4" />Back to content</Link></div>;

  const tagNames = new Set((row.tags ?? []).map((t) => t.toLowerCase()));

  return (
    <div className="mx-auto max-w-6xl pb-24">
      <Link href="/studio/content" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-white"><ArrowLeft className="h-4 w-4" />Content</Link>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
        <h1 className="display text-4xl font-extrabold">Edit tip</h1>
        <Link href={`/t/${row.slug}`} className={buttonClass("secondary", "sm")}><ExternalLink className="h-4 w-4" />View tip</Link>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[280px_1fr]">
        <div className="space-y-3 lg:sticky lg:top-6 lg:self-start">
          <div className="relative mx-auto aspect-[9/16] w-full max-w-[280px] overflow-hidden rounded-3xl border border-white/[0.08] bg-black">
            <video src={row.video_url} poster={row.thumbnail_url ?? undefined} controls playsInline className="h-full w-full object-contain" />
            <span className="absolute left-2 top-2 rounded-lg bg-black/60 px-2 py-1 text-xs font-bold text-white">{row.duration_seconds}s</span>
          </div>
          {row.champion_id && row.thumbnail_url !== championSplashUrl(row.champion_id) && (
            <button type="button" onClick={() => set({ thumbnail_url: championSplashUrl(row.champion_id!) })} className={buttonClass("ghost", "sm", "w-full")}>Use {champion?.name ?? "champion"} splash as cover</button>
          )}
          <p className="text-center text-xs text-muted">The video file and its length can&apos;t be changed. Upload a new tip instead.</p>
        </div>

        <div className="space-y-5">
          <Card title="What's it about">
            <div className="flex flex-wrap items-start gap-5">
              <ChampionSlot id={row.champion_id} name={champion?.name} size={72} highlight label="Champion" onClick={() => setPicking(true)} />
              <div className="min-w-0 flex-1 space-y-3">
                <Line label="Role"><Segmented size="sm" className="no-scrollbar max-w-full overflow-x-auto" value={row.role_id ?? "any"} onChange={(v) => set({ role_id: v === "any" ? null : v })} options={[{ id: "any", label: "Any" }, ...ROLES.map((r) => ({ id: r.id, label: r.label }))]} /></Line>
                <Line label="Map"><Segmented size="sm" value={row.map_id ?? "sr"} onChange={(v) => set({ map_id: v })} options={[{ id: "sr", label: "Summoner's Rift" }, { id: "aram", label: "ARAM" }, { id: "arena", label: "Arena" }]} /></Line>
                <Line label="Patch">
                  <select value={row.patch_id ?? ""} onChange={(e) => set({ patch_id: e.target.value ? Number(e.target.value) : null })} className={cn(inputCls, "h-9 w-auto pr-8")}>
                    <option value="">Unknown</option>
                    {patches.map((p) => <option key={p.id} value={p.id}>{p.version}{p.is_current ? " (current)" : ""}</option>)}
                  </select>
                </Line>
              </div>
            </div>
          </Card>

          <Card title="Title & what players learn">
            <input maxLength={140} value={row.title} onChange={(e) => set({ title: e.target.value })} className={cn(inputCls, "h-11")} />
            <textarea maxLength={1000} value={row.description ?? ""} onChange={(e) => set({ description: e.target.value })} placeholder="Description" className={cn(inputCls, "min-h-24 resize-y py-3")} />
            <div className="space-y-2">
              {points.map((p, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-accent/15 text-xs font-bold text-accent">{i + 1}</span>
                  <input maxLength={200} value={p} onChange={(e) => setPoints((cur) => cur.map((x, n) => (n === i ? e.target.value : x)))} placeholder="Key point" className={cn(inputCls, "h-10")} />
                  {points.length > 1 && <button type="button" onClick={() => setPoints((cur) => cur.filter((_, n) => n !== i))} aria-label="Remove point" className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:text-white"><X className="h-4 w-4" /></button>}
                </div>
              ))}
              {points.length < 5 && <button type="button" onClick={() => setPoints((cur) => [...cur, ""])} className={buttonClass("ghost", "sm")}><Plus className="h-4 w-4" />Add point</button>}
            </div>
          </Card>

          <Card title="Tags & difficulty">
            <div className="flex flex-wrap gap-2">
              {tagOptions.map((t) => {
                const on = tagNames.has(t.name.toLowerCase());
                return (
                  <button key={t.id} type="button" onClick={() => set({ tags: on ? (row.tags ?? []).filter((x) => x.toLowerCase() !== t.name.toLowerCase()) : [...(row.tags ?? []), t.name] })} className={cn("h-8 rounded-full border px-3 text-xs font-semibold transition-colors", on ? "border-accent/60 bg-accent/15 text-white" : "border-white/[0.08] bg-white/[0.03] text-muted hover:text-white")}>
                    {t.name}
                  </button>
                );
              })}
            </div>
            <Line label="Difficulty"><Segmented size="sm" value={row.skill_level} onChange={(v) => set({ skill_level: v })} options={[{ id: "beginner", label: "Beginner" }, { id: "intermediate", label: "Intermediate" }, { id: "advanced", label: "Advanced" }]} /></Line>
          </Card>

          {error && <div className="rounded-xl border border-danger/30 bg-danger/10 p-3 text-sm text-red-200">{error}</div>}
          <div className="sticky bottom-4 z-20 flex justify-end gap-2 rounded-2xl border border-white/[0.08] bg-panel/95 p-3 backdrop-blur">
            <Link href="/studio/content" className={buttonClass("ghost", "md")}>Cancel</Link>
            <button type="button" disabled={saving} onClick={save} className={buttonClass("primary", "md")}>{saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}Save changes</button>
          </div>
        </div>
      </div>

      <ChampionPicker open={picking} onClose={() => setPicking(false)} title="Which champion?" onPick={(c) => { set({ champion_id: c.id }); setPicking(false); }} />
    </div>
  );
}

function Card({ title, children }: { title: string; children: ReactNode }) {
  return <section className="space-y-4 rounded-2xl border border-white/[0.06] bg-panel p-5"><h2 className="text-xs font-bold uppercase tracking-[0.14em] text-muted">{title}</h2>{children}</section>;
}
function Line({ label, children }: { label: string; children: ReactNode }) {
  return <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5"><span className="w-20 shrink-0 text-sm font-medium text-white/80">{label}</span>{children}</div>;
}

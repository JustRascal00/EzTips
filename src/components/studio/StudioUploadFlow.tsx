"use client";

import { ChampionPicker, ChampionSlot } from "@/components/league";
import { buttonClass, Segmented, Select } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/cn";
import { championSplashUrl } from "@/lib/ddragon/shared";
import { ROLES } from "@/lib/league";
import { createClient } from "@/lib/supabase/client";
import { useApp } from "@/lib/store";
import { listPatches, listTags, type PatchRow, type TagRow } from "@/lib/tips";
import { useSupabaseQuery } from "@/lib/use-tips";
import { AlertCircle, Check, CheckCircle2, Film, LoaderCircle, Plus, UploadCloud, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";

const MAX_SECONDS = 60;
const MAX_BYTES = 50 * 1024 * 1024;
const inputCls = "w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-3.5 text-sm outline-none transition-colors placeholder:text-muted/70 hover:border-white/[0.14] focus:border-accent/60";

type Visibility = "public" | "unlisted" | "draft";
type Frame = { url: string; blob: Blob } | { url: string; blob: null; splash: true };

/** Grab a few frames from a local video file to use as cover options. */
async function captureFrames(src: string, duration: number): Promise<{ url: string; blob: Blob }[]> {
  const video = document.createElement("video");
  video.src = src;
  video.muted = true;
  video.playsInline = true;
  video.preload = "auto";
  await new Promise<void>((resolve, reject) => {
    video.onloadeddata = () => resolve();
    video.onerror = () => reject(new Error("load"));
  });
  const canvas = document.createElement("canvas");
  canvas.width = 540;
  canvas.height = 960;
  const ctx = canvas.getContext("2d");
  if (!ctx) return [];
  const frames: { url: string; blob: Blob }[] = [];
  for (const ratio of [0.12, 0.38, 0.62, 0.86]) {
    await new Promise<void>((resolve) => {
      video.onseeked = () => resolve();
      video.currentTime = Math.max(0.1, duration * ratio);
    });
    // cover-crop to 9:16
    const vw = video.videoWidth, vh = video.videoHeight;
    const scale = Math.max(canvas.width / vw, canvas.height / vh);
    const w = vw * scale, h = vh * scale;
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(video, (canvas.width - w) / 2, (canvas.height - h) / 2, w, h);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.82));
    if (blob) frames.push({ url: URL.createObjectURL(blob), blob });
  }
  video.removeAttribute("src");
  video.load();
  return frames;
}

export function StudioUploadFlow() {
  const { toast } = useApp();
  const { configured, user } = useAuth();
  const router = useRouter();

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [duration, setDuration] = useState(0);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [frames, setFrames] = useState<{ url: string; blob: Blob }[]>([]);
  const [cover, setCover] = useState(0);

  const [champion, setChampion] = useState<{ id: string; name: string } | null>(null);
  const [picking, setPicking] = useState(false);
  const [role, setRole] = useState<string>("any");
  const [map, setMap] = useState<string>("sr");
  const [patchId, setPatchId] = useState<number | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [points, setPoints] = useState<string[]>([""]);
  const [tags, setTags] = useState<string[]>([]);
  const [skill, setSkill] = useState("intermediate");
  const [visibility, setVisibility] = useState<Visibility>("public");

  const [error, setError] = useState("");
  const [stage, setStage] = useState("");
  const [busy, setBusy] = useState(false);
  const dropRef = useRef<HTMLLabelElement>(null);

  const { data: patches } = useSupabaseQuery("upload-patches", (c) => listPatches(c, 10), [] as PatchRow[]);
  const { data: tagOptions } = useSupabaseQuery("upload-tags", listTags, [] as TagRow[]);
  const currentPatchId = patches.find((p) => p.is_current)?.id ?? patches[0]?.id ?? null;
  const selectedPatch = patchId ?? currentPatchId;

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);
  useEffect(() => () => frames.forEach((f) => URL.revokeObjectURL(f.url)), [frames]);

  function chooseFile(next: File) {
    setError("");
    if (!next.type.startsWith("video/")) return setError("Choose a video file (MP4, WebM or MOV).");
    if (next.size > MAX_BYTES) return setError("Keep videos under 50 MB.");
    if (preview) URL.revokeObjectURL(preview);
    setFrames([]);
    setCover(0);
    setDuration(0);
    setFile(next);
    setPreview(URL.createObjectURL(next));
  }

  async function onMetadata(video: HTMLVideoElement) {
    const d = video.duration || 0;
    setDuration(d);
    setSize({ w: video.videoWidth, h: video.videoHeight });
    if (d > MAX_SECONDS + 0.5) { setError(`Tips can be at most ${MAX_SECONDS} seconds. This one is ${Math.round(d)}s. Trim it and try again.`); return; }
    try { setFrames(await captureFrames(preview, d)); } catch { setFrames([]); }
  }

  const tooLong = duration > MAX_SECONDS + 0.5;
  const coverOptions: Frame[] = [...frames, ...(champion ? [{ url: championSplashUrl(champion.id), blob: null, splash: true } as const] : [])];
  const missing = !file ? "Add a video" : tooLong ? "Video is too long" : !champion ? "Pick the champion" : title.trim().length < 3 ? "Add a title" : !selectedPatch ? "Pick the patch" : "";

  async function publish() {
    if (missing) { setError(missing); return; }
    if (!configured) { setError("Connect Supabase in .env.local first."); return; }
    if (!user) { router.push("/auth?next=/studio/upload"); return; }
    const supabase = createClient();
    if (!supabase || !file || !champion) return;
    setBusy(true); setError("");
    const ext = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "mp4";
    const videoPath = `${user.id}/${crypto.randomUUID()}.${ext}`;
    let thumbnailPath: string | null = null;
    try {
      setStage("Uploading video…");
      const up = await supabase.storage.from("videos").upload(videoPath, file, { cacheControl: "3600", contentType: file.type, upsert: false });
      if (up.error) throw new Error(up.error.message);

      const chosen = coverOptions[cover];
      if (chosen?.blob) {
        setStage("Uploading cover…");
        thumbnailPath = `${user.id}/${crypto.randomUUID()}.jpg`;
        const coverUp = await supabase.storage.from("thumbnails").upload(thumbnailPath, chosen.blob, { contentType: "image/jpeg", upsert: false });
        if (coverUp.error) thumbnailPath = null; // not fatal: falls back to champion splash
      }

      setStage("Checking the video and publishing…");
      const res = await fetch("/api/tips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          videoPath,
          thumbnailPath,
          title,
          description,
          championId: champion.id,
          roleId: role === "any" ? "" : role,
          mapId: map,
          patchId: selectedPatch,
          topic: tags[0] ? tagOptions.find((t) => t.id === tags[0])?.name : "Tips",
          tags: [champion.name, ...tags.map((id) => tagOptions.find((t) => t.id === id)?.name ?? id)],
          takeaways: points,
          skillLevel: skill,
          visibility,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? `Upload failed (${res.status})`);
      toast(visibility === "draft" ? "Draft saved" : "Tip published");
      router.push(visibility === "draft" ? "/studio/content" : `/t/${data.slug}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
      setStage("");
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl pb-24">
      <div>
        <div className="text-xs font-bold uppercase tracking-[0.16em] text-accent">New tip</div>
        <h1 className="display mt-1 text-4xl font-extrabold">Upload a tip</h1>
        <p className="mt-1 text-sm text-muted">One useful moment, 60 seconds max. Vertical 9:16 looks best in the feed.</p>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[320px_1fr]">
        {/* ── Video + cover ──────────────────────── */}
        <div className="space-y-4 lg:sticky lg:top-6 lg:self-start">
          {preview ? (
            <div className="relative mx-auto aspect-[9/16] w-full max-w-[320px] overflow-hidden rounded-3xl border border-white/[0.08] bg-black">
              <video src={preview} controls playsInline onLoadedMetadata={(e) => void onMetadata(e.currentTarget)} className="h-full w-full object-contain" />
              <button type="button" onClick={() => { setFile(null); setPreview(""); setFrames([]); setDuration(0); setError(""); }} aria-label="Remove video" className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-black/60 text-white backdrop-blur hover:bg-black/80"><X className="h-4 w-4" /></button>
              {duration > 0 && (
                <span className={cn("absolute left-2 top-2 rounded-lg px-2 py-1 text-xs font-bold tabular backdrop-blur", tooLong ? "bg-danger text-white" : "bg-black/60 text-white")}>
                  {Math.round(duration)}s / {MAX_SECONDS}s
                </span>
              )}
            </div>
          ) : (
            <label
              ref={dropRef}
              onDragOver={(e) => { e.preventDefault(); dropRef.current?.classList.add("border-accent"); }}
              onDragLeave={() => dropRef.current?.classList.remove("border-accent")}
              onDrop={(e) => { e.preventDefault(); dropRef.current?.classList.remove("border-accent"); const f = e.dataTransfer.files[0]; if (f) chooseFile(f); }}
              className="mx-auto flex aspect-[9/16] w-full max-w-[320px] cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed border-white/[0.12] bg-white/[0.02] p-6 text-center transition-colors hover:border-accent/60 hover:bg-accent/[0.04]"
            >
              <span className="grid h-14 w-14 place-items-center rounded-2xl bg-accent/15 text-accent"><UploadCloud className="h-7 w-7" /></span>
              <span className="mt-4 font-semibold">Drop your clip here</span>
              <span className="mt-1 text-sm text-muted">or click to choose a file</span>
              <span className="mt-5 rounded-full bg-white/[0.05] px-3 py-1.5 text-xs text-muted">MP4 / WebM / MOV · ≤ 60s · ≤ 50 MB</span>
              <input type="file" accept="video/mp4,video/webm,video/quicktime" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) chooseFile(f); }} />
            </label>
          )}
          {preview && size.w > size.h && !tooLong && <p className="rounded-xl border border-amber-400/20 bg-amber-400/[0.08] p-3 text-xs text-amber-100">This clip is horizontal. It works, but vertical 9:16 fills the feed.</p>}

          {coverOptions.length > 0 && (
            <div>
              <div className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-muted">Cover</div>
              <div className="grid grid-cols-5 gap-2">
                {coverOptions.map((f, i) => (
                  <button key={f.url} type="button" onClick={() => setCover(i)} className={cn("relative aspect-[9/16] overflow-hidden rounded-lg border-2 transition", cover === i ? "border-accent" : "border-transparent opacity-70 hover:opacity-100")}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={f.url} alt={`Cover option ${i + 1}`} className="h-full w-full object-cover" />
                    {cover === i && <span className="absolute right-1 top-1 grid h-4 w-4 place-items-center rounded-full bg-accent"><Check className="h-2.5 w-2.5" /></span>}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Details ────────────────────────────── */}
        <div className="space-y-5">
          <Card title="What's it about">
            <div className="flex flex-wrap items-start gap-5">
              <div className="flex flex-col items-center gap-1">
                <ChampionSlot id={champion?.id} name={champion?.name} size={72} highlight label="Champion" onClick={() => setPicking(true)} />
              </div>
              <div className="min-w-0 flex-1 space-y-3">
                <Row label="Role"><Segmented size="sm" className="no-scrollbar max-w-full overflow-x-auto" value={role} onChange={setRole} options={[{ id: "any", label: "Any" }, ...ROLES.map((r) => ({ id: r.id, label: r.label }))]} /></Row>
                <Row label="Map"><Segmented size="sm" value={map} onChange={setMap} options={[{ id: "sr", label: "Summoner's Rift" }, { id: "aram", label: "ARAM" }, { id: "arena", label: "Arena" }]} /></Row>
                <Row label="Patch">
                  <Select
                    size="sm"
                    ariaLabel="Patch"
                    className="w-40"
                    value={String(selectedPatch ?? "")}
                    onChange={(v) => setPatchId(Number(v))}
                    options={patches.map((p) => ({ id: String(p.id), label: `Patch ${p.version}`, hint: p.is_current ? "current" : undefined }))}
                  />
                  <span className="text-xs text-muted">The patch you recorded on. Tips from old patches rank lower.</span>
                </Row>
              </div>
            </div>
          </Card>

          <Card title="Title & what players learn">
            <Field label="Title" hint={`${title.length}/140`}>
              <input maxLength={140} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Punish Zed the moment his W is down" className={cn(inputCls, "h-11")} />
            </Field>
            <Field label="Description" optional>
              <textarea maxLength={1000} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="When does this work, and what should players watch for?" className={cn(inputCls, "min-h-24 resize-y py-3")} />
            </Field>
            <Field label="Key points" optional>
              <div className="space-y-2">
                {points.map((p, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-accent/15 text-xs font-bold text-accent">{i + 1}</span>
                    <input maxLength={200} value={p} onChange={(e) => setPoints((cur) => cur.map((x, n) => (n === i ? e.target.value : x)))} placeholder={["Wait for his shadow to be used", "Walk up and trade with Q + auto", "Back off before W is up again"][i] ?? "Another point"} className={cn(inputCls, "h-10")} />
                    {points.length > 1 && <button type="button" onClick={() => setPoints((cur) => cur.filter((_, n) => n !== i))} aria-label="Remove point" className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted hover:text-white"><X className="h-4 w-4" /></button>}
                  </div>
                ))}
                {points.length < 5 && <button type="button" onClick={() => setPoints((cur) => [...cur, ""])} className={buttonClass("ghost", "sm")}><Plus className="h-4 w-4" />Add point</button>}
              </div>
            </Field>
          </Card>

          <Card title="Tags & difficulty">
            <div className="flex flex-wrap gap-2">
              {tagOptions.map((t) => {
                const on = tags.includes(t.id);
                return (
                  <button key={t.id} type="button" onClick={() => setTags((cur) => (on ? cur.filter((x) => x !== t.id) : [...cur, t.id].slice(0, 6)))} className={cn("h-8 rounded-full border px-3 text-xs font-semibold transition-colors", on ? "border-accent/60 bg-accent/15 text-white" : "border-white/[0.08] bg-white/[0.03] text-muted hover:text-white")}>
                    {t.name}
                  </button>
                );
              })}
            </div>
            <Row label="Difficulty"><Segmented size="sm" value={skill} onChange={setSkill} options={[{ id: "beginner", label: "Beginner" }, { id: "intermediate", label: "Intermediate" }, { id: "advanced", label: "Advanced" }]} /></Row>
          </Card>

          <Card title="Who can see it">
            <Segmented value={visibility} onChange={setVisibility} options={[{ id: "public", label: "Public" }, { id: "unlisted", label: "Unlisted" }, { id: "draft", label: "Draft" }]} />
            <p className="text-xs text-muted">{visibility === "public" ? "Shows in the feed, search and on the champion page." : visibility === "unlisted" ? "Only people with the link can watch it." : "Saved privately in your Studio."}</p>
          </Card>

          {error && <div role="alert" className="flex gap-2 rounded-xl border border-danger/30 bg-danger/10 p-3 text-sm text-red-200"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{error}</div>}
          {stage && !error && <div className="flex items-center gap-2 rounded-xl border border-accent/25 bg-accent/10 p-3 text-sm text-white"><LoaderCircle className="h-4 w-4 animate-spin text-accent" />{stage}</div>}

          <div className="sticky bottom-4 z-20 flex items-center justify-between gap-3 rounded-2xl border border-white/[0.08] bg-panel/95 p-3 shadow-2xl shadow-black/50 backdrop-blur">
            <div className="flex min-w-0 items-center gap-2 text-sm">
              {missing ? <><Film className="h-4 w-4 shrink-0 text-muted" /><span className="truncate text-muted">{missing}</span></> : <><CheckCircle2 className="h-4 w-4 shrink-0 text-success" /><span className="truncate">Ready to {visibility === "draft" ? "save" : "publish"}</span></>}
            </div>
            <button type="button" disabled={busy || Boolean(missing)} onClick={publish} className={buttonClass("primary", "md")}>
              {busy && <LoaderCircle className="h-4 w-4 animate-spin" />}{visibility === "draft" ? "Save draft" : "Publish tip"}
            </button>
          </div>
        </div>
      </div>

      <ChampionPicker open={picking} onClose={() => setPicking(false)} title="Which champion?" onPick={(c) => { setChampion({ id: c.id, name: c.name }); setPicking(false); }} />
    </div>
  );
}

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-4 rounded-2xl border border-white/[0.06] bg-panel p-5">
      <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-muted">{title}</h2>
      {children}
    </section>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
      <span className="w-20 shrink-0 text-sm font-medium text-white/80">{label}</span>
      {children}
    </div>
  );
}

function Field({ label, hint, optional, children }: { label: string; hint?: string; optional?: boolean; children: ReactNode }) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-sm font-medium">
        <span>{label}{optional && <span className="ml-1 font-normal text-muted">(optional)</span>}</span>
        {hint && <span className="text-xs font-normal text-muted tabular">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

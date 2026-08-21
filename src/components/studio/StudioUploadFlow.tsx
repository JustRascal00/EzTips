"use client";

import { Button } from "@/components/ui";
import { games } from "@/data/games";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/cn";
import { createClient } from "@/lib/supabase/client";
import { useApp } from "@/lib/store";
import { AlertCircle, ArrowLeft, ArrowRight, Check, CheckCircle2, FileVideo2, ImageIcon, LoaderCircle, LockKeyhole, UploadCloud } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";

const steps = ["Upload video", "Video details", "Learning info", "Publish"];
const inputCls = "w-full h-11 rounded-xl bg-elevated border border-border px-3 text-sm outline-none transition-colors focus:border-accent/60 placeholder:text-muted/60";
type Visibility = "public" | "unlisted" | "draft";
type MetaField = { key: string; label: string; placeholder: string; options?: string[] };

function fieldsForGame(gameId: string): MetaField[] {
  if (gameId === "lol") return [
    { key: "character", label: "Champion", placeholder: "Ahri, Lee Sin…" }, { key: "role", label: "Lane / role", placeholder: "Choose a role", options: ["Top", "Jungle", "Mid", "ADC", "Support"] }, { key: "gameMode", label: "Game mode", placeholder: "Ranked, ARAM…" }, { key: "rankRelevance", label: "Rank relevance", placeholder: "Any rank, Emerald+…" }, { key: "version", label: "Patch", placeholder: "e.g. 26.16" },
  ];
  if (gameId === "valorant") return [
    { key: "character", label: "Agent", placeholder: "Jett, Omen…" }, { key: "map", label: "Map", placeholder: "Ascent, Haven…" }, { key: "weapon", label: "Weapon", placeholder: "Vandal, Operator…" }, { key: "gameMode", label: "Game mode", placeholder: "Competitive, Swiftplay…" }, { key: "rankRelevance", label: "Rank relevance", placeholder: "Any rank, Ascendant+…" }, { key: "version", label: "Patch", placeholder: "Optional" },
  ];
  if (gameId === "cs2") return [
    { key: "map", label: "Map", placeholder: "Mirage, Inferno…" }, { key: "weapon", label: "Weapon / utility", placeholder: "AK-47, Smoke…" }, { key: "gameMode", label: "Game mode", placeholder: "Competitive, Premier…" }, { key: "rankRelevance", label: "Rank relevance", placeholder: "Any rating, 15K+…" }, { key: "version", label: "Game version", placeholder: "Optional" },
  ];
  if (gameId === "minecraft") return [
    { key: "gameMode", label: "Game mode", placeholder: "Survival, Creative…" }, { key: "technique", label: "Build / technique", placeholder: "Redstone, farm, PvP…" }, { key: "edition", label: "Edition", placeholder: "Choose an edition", options: ["Java", "Bedrock", "Both"] }, { key: "version", label: "Version", placeholder: "e.g. 1.21" },
  ];
  return [{ key: "character", label: "Character / hero", placeholder: "Optional" }, { key: "map", label: "Map", placeholder: "Optional" }, { key: "gameMode", label: "Game mode", placeholder: "Ranked, casual…" }, { key: "rankRelevance", label: "Rank relevance", placeholder: "Any rank…" }, { key: "version", label: "Patch / game version", placeholder: "Optional" }];
}

export function StudioUploadFlow() {
  const { toast } = useApp();
  const { configured, user } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [duration, setDuration] = useState(0);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [gameId, setGameId] = useState("lol");
  const [topic, setTopic] = useState("");
  const [tags, setTags] = useState("");
  const [thumb, setThumb] = useState(0);
  const [metadata, setMetadata] = useState<Record<string, string>>({});
  const [visibility, setVisibility] = useState<Visibility>("public");
  const [publishing, setPublishing] = useState(false);
  const [stage, setStage] = useState("");
  const [error, setError] = useState("");
  const game = games.find((item) => item.id === gameId)!;
  const metaFields = fieldsForGame(gameId);
  const thumbnails = useMemo(() => [game?.banner, game?.characters[0]?.image, game?.characters[1]?.image].filter((item): item is string => Boolean(item)), [game]);

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  function chooseFile(nextFile: File) {
    setError("");
    if (!nextFile.type.startsWith("video/")) { setError("Choose a video file such as MP4, WebM, or MOV."); return; }
    if (nextFile.size > 50 * 1024 * 1024) { setError("Keep video files under 50 MB."); return; }
    if (preview) URL.revokeObjectURL(preview);
    setFile(nextFile); setPreview(URL.createObjectURL(nextFile));
  }

  function next() {
    setError("");
    if (step === 0 && !file) { setError("Upload a video to continue."); return; }
    if (step === 0 && duration > 180) { setError("Tips can be up to 3 minutes long."); return; }
    if (step === 1 && title.trim().length < 3) { setError("Add a clear title with at least 3 characters."); return; }
    if (step === 1 && !topic.trim()) { setError("Add a topic so players can discover the tip."); return; }
    setStep((current) => Math.min(3, current + 1));
  }

  async function publish() {
    if (!configured) { setError("Connect Supabase in .env.local before uploading real videos."); return; }
    if (!user) { router.push("/auth?next=/studio/upload"); return; }
    if (!file) { setStep(0); setError("Upload a video first."); return; }
    setPublishing(true); setError(""); setStage("Uploading video…");
    const supabase = createClient();
    if (!supabase) return;
    const extension = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "mp4";
    const storagePath = `${user.id}/${crypto.randomUUID()}.${extension}`;
    const { error: uploadError } = await supabase.storage.from("videos").upload(storagePath, file, { cacheControl: "3600", contentType: file.type, upsert: false });
    if (uploadError) { setError(uploadError.message); setPublishing(false); return; }
    const { data: publicFile } = supabase.storage.from("videos").getPublicUrl(storagePath);
    const slugBase = title.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 60) || "gaming-tip";
    const slug = `${slugBase}-${crypto.randomUUID().slice(0, 8)}`;
    setStage(visibility === "draft" ? "Saving draft…" : "Publishing tip…");
    const { error: insertError } = await supabase.from("videos").insert({
      user_id: user.id, slug, title: title.trim(), description: description.trim() || null, game_id: gameId,
      category: topic.trim(), topic: topic.trim(), character: metadata.character?.trim() || null,
      tags: tags.split(",").map((tag) => tag.trim().replace(/^#/, "")).filter(Boolean).slice(0, 12),
      skill_level: "intermediate", duration_seconds: Math.round(duration), video_path: storagePath,
      video_url: publicFile.publicUrl, thumbnail_url: thumbnails[thumb] || null,
      status: visibility === "draft" ? "draft" : "published", visibility: visibility === "draft" ? "private" : visibility,
      learning_metadata: metadata,
    });
    if (insertError) { await supabase.storage.from("videos").remove([storagePath]); setError(insertError.message); setPublishing(false); return; }
    toast(visibility === "draft" ? "Draft saved" : "Tip published"); router.push("/studio/content");
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div><div className="text-xs font-bold uppercase tracking-[0.18em] text-accent">Upload workflow</div><h1 className="mt-2 text-2xl font-bold sm:text-3xl">Create a new gaming tip</h1><p className="mt-2 text-sm text-muted">Share one useful moment. You can keep it unlisted or finish it later as a draft.</p></div>
      <ol className="no-scrollbar mt-7 flex overflow-x-auto rounded-2xl border border-border bg-card p-2">{steps.map((label, index) => <li key={label} className="flex min-w-[145px] flex-1 items-center gap-2 px-3 py-2"><span className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-bold", index < step ? "border-accent bg-accent text-white" : index === step ? "border-accent bg-accent/15 text-white" : "border-border text-muted")}>{index < step ? <Check className="h-3.5 w-3.5" /> : index + 1}</span><span className={cn("text-xs font-medium", index <= step ? "text-text" : "text-muted")}>{label}</span></li>)}</ol>
      <div className="mt-6 rounded-2xl border border-border bg-card p-4 sm:p-6 lg:p-8">
        {step === 0 && <UploadStep file={file} preview={preview} duration={duration} dimensions={dimensions} onFile={chooseFile} onMetadata={(video) => { setDuration(video.duration || 0); setDimensions({ width: video.videoWidth, height: video.videoHeight }); }} />}
        {step === 1 && <DetailsStep title={title} setTitle={setTitle} description={description} setDescription={setDescription} gameId={gameId} setGameId={(value) => { setGameId(value); setMetadata({}); setThumb(0); }} topic={topic} setTopic={setTopic} tags={tags} setTags={setTags} thumbs={thumbnails} thumb={thumb} setThumb={setThumb} />}
        {step === 2 && <LearningStep gameName={game.name} fields={metaFields} metadata={metadata} setMetadata={setMetadata} />}
        {step === 3 && <PublishStep gameName={game.name} title={title} topic={topic} thumbnail={thumbnails[thumb]} visibility={visibility} setVisibility={setVisibility} duration={duration} />}
        {error && <div role="alert" className="mt-6 flex gap-2 rounded-xl border border-danger/30 bg-danger/10 p-3 text-sm text-red-200"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{error}</div>}
        {stage && !error && <div className="mt-6 flex gap-2 rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-3 text-sm text-emerald-100">{publishing ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}{stage}</div>}
        {!configured && step === 3 && <div className="mt-6 flex gap-2 rounded-xl border border-amber-400/20 bg-amber-400/10 p-3 text-sm text-amber-100"><AlertCircle className="h-4 w-4" />Backend setup is required before publishing. The Studio preview still works locally.</div>}
        <div className="mt-8 flex items-center justify-between border-t border-border pt-5"><Button variant="ghost" disabled={step === 0 || publishing} onClick={() => { setError(""); setStep((current) => Math.max(0, current - 1)); }}><ArrowLeft className="h-4 w-4" />Back</Button>{step < 3 ? <Button onClick={next}>Continue<ArrowRight className="h-4 w-4" /></Button> : <Button disabled={publishing || !configured} onClick={publish}>{publishing && <LoaderCircle className="h-4 w-4 animate-spin" />}{visibility === "draft" ? "Save Draft" : "Publish Tip"}</Button>}</div>
      </div>
    </div>
  );
}

function UploadStep({ file, preview, duration, dimensions, onFile, onMetadata }: { file: File | null; preview: string; duration: number; dimensions: { width: number; height: number }; onFile: (f: File) => void; onMetadata: (v: HTMLVideoElement) => void }) {
  return <div><StepTitle title="Upload your video" description="Short, focused gameplay tips work best in a vertical format." />{preview ? <div className="grid gap-6 md:grid-cols-[230px_1fr]"><div className="mx-auto aspect-[9/16] w-full max-w-[230px] overflow-hidden rounded-2xl bg-black"><video src={preview} controls onLoadedMetadata={(event) => onMetadata(event.currentTarget)} className="h-full w-full object-contain" /></div><div className="space-y-4"><div className="rounded-xl border border-border bg-elevated p-4"><div className="flex gap-3"><FileVideo2 className="h-5 w-5 shrink-0 text-accent" /><div className="min-w-0"><div className="truncate text-sm font-semibold">{file?.name}</div><div className="mt-1 text-xs text-muted">{file ? (file.size / 1024 / 1024).toFixed(1) : 0} MB · {Math.round(duration)} sec{dimensions.width ? ` · ${dimensions.width}×${dimensions.height}` : ""}</div></div></div></div>{dimensions.width > dimensions.height && <div className="rounded-xl border border-amber-400/20 bg-amber-400/10 p-3 text-sm text-amber-100">This video is horizontal. It can still be uploaded, but 9:16 vertical video works best in the feed.</div>}<FilePicker label="Replace video" onFile={onFile} /></div></div> : <label onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); const next = e.dataTransfer.files[0]; if (next) onFile(next); }} className="flex min-h-72 cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-accent/40 bg-accent/[0.04] p-6 text-center hover:bg-accent/[0.07]"><div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/15 text-accent"><UploadCloud className="h-7 w-7" /></div><div className="mt-4 font-semibold">Drop a vertical gaming video here</div><div className="mt-1 text-sm text-muted">or click to select a file</div><div className="mt-5 rounded-full bg-elevated px-3 py-1.5 text-xs text-muted">9:16 · 15 seconds–3 minutes · up to 50 MB</div><input type="file" accept="video/*" className="hidden" onChange={(e) => { const next = e.target.files?.[0]; if (next) onFile(next); }} /></label>}</div>;
}

function FilePicker({ label, onFile }: { label: string; onFile: (f: File) => void }) { return <label className="inline-flex h-10 cursor-pointer items-center rounded-xl border border-border px-4 text-sm font-semibold hover:bg-hover">{label}<input type="file" accept="video/*" className="hidden" onChange={(e) => { const next = e.target.files?.[0]; if (next) onFile(next); }} /></label>; }

type DetailsProps = { title: string; setTitle: (v: string) => void; description: string; setDescription: (v: string) => void; gameId: string; setGameId: (v: string) => void; topic: string; setTopic: (v: string) => void; tags: string; setTags: (v: string) => void; thumbs: string[]; thumb: number; setThumb: (v: number) => void };
function DetailsStep(props: DetailsProps) {
  return <div><StepTitle title="Add video details" description="Clear metadata helps the right players discover your tip." /><div className="grid gap-5"><Field label="Title" hint={`${props.title.length}/140`}><input maxLength={140} value={props.title} onChange={(e) => props.setTitle(e.target.value)} placeholder="Easy Mirage window smoke from spawn" className={inputCls} /></Field><Field label="Description" optional><textarea maxLength={1000} value={props.description} onChange={(e) => props.setDescription(e.target.value)} placeholder="Explain what players will learn and when to use it." className={`${inputCls} min-h-28 resize-y py-3`} /></Field><div className="grid gap-5 sm:grid-cols-2"><Field label="Game"><select value={props.gameId} onChange={(e) => props.setGameId(e.target.value)} className={inputCls}>{games.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field><Field label="Topic / category"><input value={props.topic} onChange={(e) => props.setTopic(e.target.value)} placeholder="Smoke lineup, Mid lane, Redstone…" className={inputCls} /></Field></div><Field label="Tags" optional><input value={props.tags} onChange={(e) => props.setTags(e.target.value)} placeholder="Mirage, Smoke, Lineup, Utility" className={inputCls} /><p className="mt-2 text-xs text-muted">Separate tags with commas. They help recommendations behind the scenes.</p></Field>{props.thumbs.length > 0 && <Field label="Cover image"><div className="flex gap-3 overflow-x-auto pb-1">{props.thumbs.map((src, index) => <button key={src} type="button" onClick={() => props.setThumb(index)} className={cn("relative aspect-video w-36 shrink-0 overflow-hidden rounded-xl border-2", props.thumb === index ? "border-accent" : "border-transparent")}><img src={src} alt={`Cover option ${index + 1}`} className="h-full w-full object-cover" />{props.thumb === index && <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-accent"><Check className="h-3 w-3" /></span>}</button>)}</div></Field>}</div></div>;
}

function LearningStep({ gameName, fields, metadata, setMetadata }: { gameName: string; fields: MetaField[]; metadata: Record<string, string>; setMetadata: (v: Record<string, string>) => void }) {
  return <div><StepTitle title={`Add ${gameName} context`} description="These optional fields change with the selected game and make specific tips easier to understand." /><div className="grid gap-5 sm:grid-cols-2">{fields.map((field) => <Field key={field.key} label={field.label} optional>{field.options ? <select value={metadata[field.key] || ""} onChange={(e) => setMetadata({ ...metadata, [field.key]: e.target.value })} className={inputCls}><option value="">Not specified</option>{field.options.map((option) => <option key={option}>{option}</option>)}</select> : <input value={metadata[field.key] || ""} onChange={(e) => setMetadata({ ...metadata, [field.key]: e.target.value })} placeholder={field.placeholder} className={inputCls} />}</Field>)}</div><div className="mt-6 rounded-xl border border-border bg-elevated p-4 text-sm text-muted"><strong className="text-text">Optional by design.</strong> Players discover topics through the feed; this metadata improves recommendations without turning onboarding into a questionnaire.</div></div>;
}

function PublishStep({ gameName, title, topic, thumbnail, visibility, setVisibility, duration }: { gameName: string; title: string; topic: string; thumbnail?: string; visibility: Visibility; setVisibility: (v: Visibility) => void; duration: number }) {
  const options: { id: Visibility; title: string; description: string; icon: typeof CheckCircle2 }[] = [{ id: "public", title: "Public", description: "Visible in eligible feeds, search, and your creator profile.", icon: CheckCircle2 }, { id: "unlisted", title: "Unlisted", description: "Only people with the direct link can watch it.", icon: LockKeyhole }, { id: "draft", title: "Draft", description: "Save privately and publish when you are ready.", icon: FileVideo2 }];
  return <div><StepTitle title="Choose how to publish" description="Review the tip, then decide who can see it." /><div className="grid gap-3 md:grid-cols-3">{options.map((option) => <button key={option.id} onClick={() => setVisibility(option.id)} type="button" className={cn("rounded-2xl border p-4 text-left transition-colors", visibility === option.id ? "border-accent bg-accent/10" : "border-border bg-elevated hover:bg-hover")}><div className="flex items-center justify-between"><option.icon className={cn("h-5 w-5", visibility === option.id ? "text-accent" : "text-muted")} />{visibility === option.id && <Check className="h-4 w-4 text-accent" />}</div><div className="mt-4 font-semibold">{option.title}</div><p className="mt-1 text-xs leading-5 text-muted">{option.description}</p></button>)}</div><div className="mt-7 grid gap-5 rounded-2xl border border-border bg-elevated p-4 sm:grid-cols-[180px_1fr]">{thumbnail ? <div className="aspect-video overflow-hidden rounded-xl"><img src={thumbnail} alt="Selected cover" className="h-full w-full object-cover" /></div> : <div className="flex aspect-video items-center justify-center rounded-xl bg-card text-muted"><ImageIcon className="h-6 w-6" /></div>}<div><div className="text-xs font-bold uppercase tracking-wider text-accent">{gameName} · {topic}</div><h3 className="mt-2 text-lg font-semibold">{title}</h3><p className="mt-2 text-sm text-muted">{Math.round(duration)} sec · {visibility === "draft" ? "Private draft" : `${visibility[0].toUpperCase()}${visibility.slice(1)} tip`}</p></div></div></div>;
}

function StepTitle({ title, description }: { title: string; description: string }) { return <div className="mb-6"><h2 className="text-xl font-bold sm:text-2xl">{title}</h2><p className="mt-1 text-sm text-muted">{description}</p></div>; }
function Field({ label, hint, optional, children }: { label: string; hint?: string; optional?: boolean; children: ReactNode }) { return <label className="block"><span className="mb-2 flex items-center justify-between text-sm font-medium"><span>{label}{optional && <span className="ml-1 font-normal text-muted">(optional)</span>}</span>{hint && <span className="text-xs font-normal text-muted">{hint}</span>}</span>{children}</label>; }

"use client";

import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui";
import { games } from "@/data/games";
import { cn } from "@/lib/cn";
import { useApp } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/client";
import { AlertCircle, CheckCircle2, LoaderCircle, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function UploadPage() {
  const { toast } = useApp();
  const { configured, user } = useAuth();
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [game, setGame] = useState("lol");
  const [category, setCategory] = useState("Mid Lane");
  const [character, setCharacter] = useState("Ahri");
  const [level, setLevel] = useState("intermediate");
  const [tags, setTags] = useState("Ahri, MidLane");
  const [thumb, setThumb] = useState(0);
  const [duration, setDuration] = useState(0);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState("");
  const [stage, setStage] = useState("");

  const g = games.find((x) => x.id === game);
  const thumbs = g ? [g.banner, g.characters[0]?.image].filter(Boolean) : [];

  const onDrop = (f: File) => {
    setError("");
    if (!f.type.startsWith("video/")) {
      setError("Choose a video file.");
      return;
    }
    if (f.size > 50 * 1024 * 1024) {
      setError("Keep clips under 50 MB for the current upload plan.");
      return;
    }
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  async function publish() {
    if (!configured) {
      setError("Connect Supabase using .env.local before publishing real clips.");
      return;
    }
    if (!user) {
      router.push("/auth?next=/upload");
      return;
    }
    if (!file || !title.trim()) {
      setError("Add a video and title before publishing.");
      return;
    }
    const supabase = createClient();
    if (!supabase) return;

    setPublishing(true);
    setError("");
    setStage("Uploading video…");
    const extension = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "mp4";
    const storagePath = `${user.id}/${crypto.randomUUID()}.${extension}`;
    const { error: uploadError } = await supabase.storage.from("videos").upload(storagePath, file, {
      cacheControl: "3600",
      contentType: file.type,
      upsert: false,
    });
    if (uploadError) {
      setError(uploadError.message);
      setPublishing(false);
      return;
    }

    const { data: publicFile } = supabase.storage.from("videos").getPublicUrl(storagePath);
    const slugBase = title.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 60) || "gaming-clip";
    const slug = `${slugBase}-${crypto.randomUUID().slice(0, 8)}`;
    setStage("Publishing clip…");
    const { error: insertError } = await supabase.from("videos").insert({
      user_id: user.id,
      slug,
      title: title.trim(),
      description: `A community ${g?.name ?? "gaming"} clip about ${category || "gameplay"}.`,
      game_id: game,
      category: category.trim() || "Tips",
      topic: category.trim() || "Tips",
      character: character.trim() || null,
      tags: tags.split(",").map((tag) => tag.trim().replace(/^#/, "")).filter(Boolean).slice(0, 10),
      skill_level: level,
      duration_seconds: Math.round(duration),
      video_path: storagePath,
      video_url: publicFile.publicUrl,
      thumbnail_url: thumbs[thumb] || null,
      status: "published",
    });
    if (insertError) {
      await supabase.storage.from("videos").remove([storagePath]);
      setError(insertError.message);
      setPublishing(false);
      return;
    }
    setStage("Published");
    toast("Clip published to the community feed");
    router.push(`/t/${slug}`);
  }

  return (
    <AppShell>
      <div className="px-6 py-8 max-w-3xl">
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">Creator studio</div>
        <h1 className="mt-2 text-3xl font-bold">Upload a gaming clip</h1>
        <p className="text-muted mt-1">One useful moment is enough. Add the game, topics, and publish.</p>

        <label
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const f = e.dataTransfer.files[0];
            if (f) onDrop(f);
          }}
          className={cn(
            "mt-6 flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card h-56 cursor-pointer hover:bg-hover transition-colors duration-200",
            preview && "h-auto p-0 overflow-hidden",
          )}
        >
          {preview ? (
            <video src={preview} controls onLoadedMetadata={(event) => setDuration(event.currentTarget.duration || 0)} className="w-full max-h-[360px] bg-black" />
          ) : (
            <>
              <Upload className="h-8 w-8 text-muted" />
              <div className="font-semibold mt-3">Drop your gameplay clip here</div>
              <div className="text-sm text-muted mt-1">or browse files</div>
            </>
          )}
          <input
            type="file"
            accept="video/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onDrop(f);
            }}
          />
        </label>

        {!configured && (
          <div className="mt-4 flex gap-3 rounded-2xl border border-amber-400/30 bg-amber-400/10 p-4 text-sm text-amber-100">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
            <div><div className="font-semibold">Backend setup required</div><div className="mt-1 text-amber-100/75">Add your Supabase URL and publishable key to <code>.env.local</code>, then restart the app.</div></div>
          </div>
        )}

        <div className="mt-8 space-y-4">
          <Field label="Caption / title">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="How to punish Zed after he uses W"
              className={inputCls}
            />
          </Field>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Game">
              <select value={game} onChange={(e) => setGame(e.target.value)} className={inputCls}>
                {games.map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Category">
              <input value={category} onChange={(e) => setCategory(e.target.value)} className={inputCls} />
            </Field>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Character / Champion / Agent">
              <input value={character} onChange={(e) => setCharacter(e.target.value)} className={inputCls} />
            </Field>
            <Field label="Skill Level">
              <div className="flex gap-2">
                {["beginner", "intermediate", "advanced"].map((lv) => (
                  <button
                    key={lv}
                    type="button"
                    onClick={() => setLevel(lv)}
                    className={cn(
                      "flex-1 h-10 rounded-xl border text-sm capitalize",
                      level === lv
                        ? "border-accent bg-accent/15"
                        : "border-border bg-card text-muted",
                    )}
                  >
                    {lv}
                  </button>
                ))}
              </div>
            </Field>
          </div>
          <Field label="Tags">
            <input value={tags} onChange={(e) => setTags(e.target.value)} className={inputCls} />
          </Field>
          <div className="rounded-2xl border border-border bg-card p-4 text-sm text-muted">
            Your clip will appear in feeds for <span className="font-semibold text-text">{g?.name}</span>
            {category ? <> under <span className="font-semibold text-text">{category}</span></> : null}. A single 20–60 second tip is enough—no course or lesson setup required.
          </div>
          {thumbs.length > 0 && (
            <div>
              <div className="text-sm font-medium mb-2">Thumbnail</div>
              <div className="flex gap-2">
                {thumbs.map((src, i) => (
                  <button
                    key={src}
                    type="button"
                    onClick={() => setThumb(i)}
                    className={cn(
                      "h-20 w-32 rounded-xl overflow-hidden border",
                      thumb === i ? "border-accent" : "border-border",
                    )}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        {error && <div role="alert" className="mt-5 flex gap-2 rounded-xl border border-danger/30 bg-danger/10 p-3 text-sm text-red-200"><AlertCircle className="h-4 w-4 shrink-0" />{error}</div>}
        {stage && !error && <div className="mt-5 flex gap-2 rounded-xl border border-emerald-400/30 bg-emerald-400/10 p-3 text-sm text-emerald-100">{publishing ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}{stage}</div>}
        <Button
          size="lg"
          className="mt-8"
          disabled={publishing || !configured}
          onClick={publish}
        >
          {publishing && <LoaderCircle className="h-4 w-4 animate-spin" />}
          {publishing ? "Publishing…" : "Publish clip"}
        </Button>
      </div>
    </AppShell>
  );
}

const inputCls =
  "w-full h-10 rounded-xl bg-card border border-border px-3 text-sm outline-none focus:border-accent/50";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="text-sm font-medium mb-1.5">{label}</div>
      {children}
    </label>
  );
}

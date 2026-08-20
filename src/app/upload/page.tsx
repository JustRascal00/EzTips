"use client";

import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui";
import { games } from "@/data/games";
import { cn } from "@/lib/cn";
import { useApp } from "@/lib/store";
import { Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function UploadPage() {
  const { toast } = useApp();
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [game, setGame] = useState("lol");
  const [category, setCategory] = useState("Mid Lane");
  const [character, setCharacter] = useState("Ahri");
  const [level, setLevel] = useState("intermediate");
  const [tags, setTags] = useState("Ahri, MidLane");
  const [desc, setDesc] = useState("");
  const [learn, setLearn] = useState("");
  const [k1, setK1] = useState("");
  const [k2, setK2] = useState("");
  const [k3, setK3] = useState("");
  const [thumb, setThumb] = useState(0);

  const g = games.find((x) => x.id === game);
  const thumbs = g ? [g.banner, g.icon, g.characters[0]?.image].filter(Boolean) : [];

  const onDrop = (f: File) => {
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  return (
    <AppShell>
      <div className="px-6 py-8 max-w-3xl">
        <h1 className="text-3xl font-bold">Create tutorial</h1>
        <p className="text-muted mt-1">Drop a clip. Tell players what they’ll walk away with. Publish.</p>

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
            <video src={preview} controls className="w-full max-h-[360px] bg-black" />
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

        <div className="mt-8 space-y-4">
          <Field label="Tutorial Title">
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
          <Field label="Description">
            <textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={3} className={inputCls} />
          </Field>
          <Field label="What will viewers learn?">
            <input
              value={learn}
              onChange={(e) => setLearn(e.target.value)}
              placeholder="How to punish Zed when his W is on cooldown."
              className={inputCls}
            />
          </Field>
          <div>
            <div className="text-sm font-medium mb-2">Key Takeaways (optional)</div>
            <input value={k1} onChange={(e) => setK1(e.target.value)} placeholder="1." className={cn(inputCls, "mb-2")} />
            <input value={k2} onChange={(e) => setK2(e.target.value)} placeholder="2." className={cn(inputCls, "mb-2")} />
            <input value={k3} onChange={(e) => setK3(e.target.value)} placeholder="3." className={inputCls} />
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
        <Button
          size="lg"
          className="mt-8"
          onClick={() => {
            toast("Tutorial published");
            router.push("/home");
          }}
        >
          Publish Tutorial
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

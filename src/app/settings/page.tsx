"use client";

import { AppShell } from "@/components/layout/AppShell";
import { buttonClass } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/cn";
import { useApp } from "@/lib/store";
import { createClient } from "@/lib/supabase/client";
import { avatarFor } from "@/lib/tips";
import { Camera, CheckCircle2, ExternalLink, LoaderCircle, LogOut, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";

const USERNAME = /^[a-z0-9_]{3,24}$/;
const inputCls = "h-11 w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-3.5 text-sm outline-none transition-colors hover:border-white/[0.14] focus:border-accent/60";

/** Center-crop an image file to a 256×256 JPEG. */
async function squareAvatar(file: File): Promise<Blob> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error("Couldn't read that image"));
      i.src = url;
    });
    const side = Math.min(img.naturalWidth, img.naturalHeight);
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 256;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas not available");
    ctx.drawImage(img, (img.naturalWidth - side) / 2, (img.naturalHeight - side) / 2, side, side, 0, 0, 256, 256);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.88));
    if (!blob) throw new Error("Couldn't process that image");
    return blob;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export default function SettingsPage() {
  const { user, profile, refreshProfile } = useAuth();
  const { logout, toast } = useApp();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [loadedFor, setLoadedFor] = useState<string | null>(null);

  // Fill the form once the profile has loaded.
  useEffect(() => {
    if (!profile || loadedFor === profile.id) return;
    queueMicrotask(() => {
      setDisplayName(profile.display_name);
      setUsername(profile.username);
      setBio(profile.bio ?? "");
      setAvatarUrl(profile.avatar_url);
      setLoadedFor(profile.id);
    });
  }, [profile, loadedFor]);

  const usernameError = username && !USERNAME.test(username) ? "3–24 characters: lowercase letters, numbers and _" : "";
  const dirty = profile && (displayName !== profile.display_name || username !== profile.username || bio !== (profile.bio ?? "") || avatarUrl !== profile.avatar_url);

  async function uploadAvatar(file: File) {
    const supabase = createClient();
    if (!supabase || !user) return;
    if (!file.type.startsWith("image/")) { setError("Choose an image file."); return; }
    setUploading(true); setError("");
    try {
      const blob = await squareAvatar(file);
      const path = `${user.id}/avatar-${crypto.randomUUID().slice(0, 8)}.jpg`;
      const { error: upError } = await supabase.storage.from("thumbnails").upload(path, blob, { contentType: "image/jpeg", upsert: false });
      if (upError) throw new Error(upError.message);
      setAvatarUrl(supabase.storage.from("thumbnails").getPublicUrl(path).data.publicUrl);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function save() {
    const supabase = createClient();
    if (!supabase || !user) return;
    if (!displayName.trim()) { setError("Add a display name."); return; }
    if (usernameError) { setError(usernameError); return; }
    setSaving(true); setError("");
    const { error: updateError } = await supabase.from("profiles").update({
      display_name: displayName.trim().slice(0, 50),
      username,
      bio: bio.trim().slice(0, 300),
      avatar_url: avatarUrl,
      updated_at: new Date().toISOString(),
    }).eq("id", user.id);
    setSaving(false);
    if (updateError) {
      setError(updateError.code === "23505" ? "That username is taken." : updateError.message);
      return;
    }
    await refreshProfile();
    toast("Profile saved");
  }

  const preview = avatarFor({ username: username || profile?.username || "player", avatar_url: avatarUrl });

  return (
    <AppShell>
      <div className="mx-auto max-w-2xl py-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="display text-4xl font-extrabold">Settings</h1>
            <p className="mt-1 text-sm text-muted">How you show up on EZTips.</p>
          </div>
          {profile && <Link href={`/u/${profile.username}`} className={buttonClass("secondary", "sm")}><ExternalLink className="h-4 w-4" />View profile</Link>}
        </div>

        <Card title="Profile">
          <div className="flex items-center gap-5">
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={preview} alt="" className="h-24 w-24 rounded-3xl border border-white/10 bg-card object-cover" />
              {uploading && <span className="absolute inset-0 grid place-items-center rounded-3xl bg-black/60"><LoaderCircle className="h-6 w-6 animate-spin" /></span>}
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading} className={buttonClass("secondary", "sm")}><Camera className="h-4 w-4" />Change photo</button>
              {avatarUrl && <button type="button" onClick={() => setAvatarUrl(null)} className={buttonClass("ghost", "sm")}><Trash2 className="h-4 w-4" />Remove</button>}
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void uploadAvatar(f); e.target.value = ""; }} />
            </div>
          </div>

          <Field label="Display name" hint={`${displayName.length}/50`}>
            <input maxLength={50} value={displayName} onChange={(e) => setDisplayName(e.target.value)} className={inputCls} />
          </Field>
          <Field label="Username" hint={usernameError || "eztips.gg/u/" + (username || "…")}>
            <div className="relative">
              <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-muted">@</span>
              <input maxLength={24} value={username} onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))} className={cn(inputCls, "pl-8", usernameError && "border-danger/60")} />
            </div>
          </Field>
          <Field label="Bio" hint={`${bio.length}/300`}>
            <textarea maxLength={300} value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Main role, champions you play, rank you're climbing…" className={cn(inputCls, "h-auto min-h-24 resize-y py-3")} />
          </Field>

          {error && <div className="rounded-xl border border-danger/30 bg-danger/10 p-3 text-sm text-red-200">{error}</div>}
          <div className="flex items-center justify-end gap-3">
            {!dirty && loadedFor && <span className="inline-flex items-center gap-1.5 text-xs text-muted"><CheckCircle2 className="h-3.5 w-3.5 text-success" />All changes saved</span>}
            <button type="button" disabled={!dirty || saving || Boolean(usernameError)} onClick={save} className={buttonClass("primary", "md")}>
              {saving && <LoaderCircle className="h-4 w-4 animate-spin" />}Save changes
            </button>
          </div>
        </Card>

        <Card title="Account">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm">
              <div className="text-muted">Signed in as</div>
              <div className="font-semibold">{user?.email ?? "…"}</div>
            </div>
            <button type="button" onClick={async () => { await logout(); router.push("/"); }} className={buttonClass("secondary", "md", "hover:border-danger/40 hover:text-danger")}>
              <LogOut className="h-4 w-4" />Sign out
            </button>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-6 space-y-5 rounded-2xl border border-white/[0.06] bg-panel p-5 sm:p-6">
      <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-muted">{title}</h2>
      {children}
    </section>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3 text-sm font-medium">
        <span>{label}</span>
        {hint && <span className="truncate text-xs font-normal text-muted">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

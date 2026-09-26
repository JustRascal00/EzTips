import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { readVideoDuration } from "@/lib/video-duration";

const MAX_SECONDS = 60;
const TOLERANCE = 0.5; // encoders round; 60.4s is fine
const ROLES = new Set(["top", "jungle", "mid", "adc", "support"]);
const MAPS = new Set(["sr", "aram", "arena"]);
const SKILLS = new Set(["beginner", "intermediate", "advanced", "competitive"]);
const VISIBILITY = new Set(["public", "unlisted", "draft"]);

type Body = {
  videoPath?: unknown;
  thumbnailPath?: unknown;
  title?: unknown;
  description?: unknown;
  championId?: unknown;
  roleId?: unknown;
  mapId?: unknown;
  patchId?: unknown;
  topic?: unknown;
  tags?: unknown;
  takeaways?: unknown;
  skillLevel?: unknown;
  visibility?: unknown;
};

const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const bad = (message: string, status = 400) => NextResponse.json({ error: message }, { status });

/**
 * Creates a tip after the browser uploaded the file to Storage (videos/<user id>/...).
 * Checks the real duration from the file itself, then inserts the row with the secret key.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  if (!supabase) return bad("Supabase is not configured.", 503);
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) return bad("Sign in to upload.", 401);

  const admin = createAdminClient();
  if (!admin) return bad("Uploads are not set up: SUPABASE_SECRET_KEY is missing on the server.", 500);

  let body: Body;
  try { body = await request.json(); } catch { return bad("Invalid JSON body."); }

  const videoPath = str(body.videoPath, 300);
  if (!videoPath.startsWith(`${user.id}/`) || videoPath.includes("..")) return bad("Invalid video path.");
  const thumbnailPath = str(body.thumbnailPath, 300);
  if (thumbnailPath && (!thumbnailPath.startsWith(`${user.id}/`) || thumbnailPath.includes(".."))) return bad("Invalid cover path.");

  const removeUpload = async () => {
    await admin.storage.from("videos").remove([videoPath]);
    if (thumbnailPath) await admin.storage.from("thumbnails").remove([thumbnailPath]);
  };

  // ── validate fields ─────────────────────────────
  const title = str(body.title, 140);
  if (title.length < 3) return bad("Add a title (3+ characters).");
  const description = str(body.description, 1000);
  const championId = str(body.championId, 40);
  const roleId = str(body.roleId, 20);
  const mapId = str(body.mapId, 20) || "sr";
  const topic = str(body.topic, 60) || "Tips";
  const skillLevel = str(body.skillLevel, 20) || "intermediate";
  const visibility = str(body.visibility, 20) || "public";
  const patchId = Number(body.patchId);
  if (!championId) return bad("Pick the champion this tip is about.");
  if (roleId && !ROLES.has(roleId)) return bad("Invalid role.");
  if (!MAPS.has(mapId)) return bad("Invalid map.");
  if (!SKILLS.has(skillLevel)) return bad("Invalid difficulty.");
  if (!VISIBILITY.has(visibility)) return bad("Invalid visibility.");
  if (!Number.isInteger(patchId) || patchId <= 0) return bad("Pick the patch this was recorded on.");
  const tags = Array.from(new Map((Array.isArray(body.tags) ? body.tags : [])
    .filter((t): t is string => typeof t === "string")
    .map((t) => t.trim().replace(/^#/, "").slice(0, 30))
    .filter(Boolean)
    .map((t) => [t.toLowerCase(), t] as const)).values()).slice(0, 12);
  const takeaways = (Array.isArray(body.takeaways) ? body.takeaways : [])
    .filter((t): t is string => typeof t === "string")
    .map((t) => t.trim().slice(0, 200))
    .filter(Boolean)
    .slice(0, 5);

  const [{ data: champion }, { data: patch }] = await Promise.all([
    admin.from("champions").select("id,name").eq("id", championId).maybeSingle(),
    admin.from("patches").select("id").eq("id", patchId).maybeSingle(),
  ]);
  if (!champion) return bad("Unknown champion.");
  if (!patch) return bad("Unknown patch.");

  // ── check the real video length ─────────────────
  const { data: file, error: downloadError } = await admin.storage.from("videos").download(videoPath);
  if (downloadError || !file) return bad("Couldn't find the uploaded video. Try uploading again.");
  const duration = readVideoDuration(new Uint8Array(await file.arrayBuffer()));
  if (duration === null) {
    await removeUpload();
    return bad("Couldn't read this video's length. Export it as MP4 (H.264) and try again.");
  }
  if (duration > MAX_SECONDS + TOLERANCE) {
    await removeUpload();
    return bad(`Tips can be at most ${MAX_SECONDS} seconds. This video is ${Math.round(duration)} seconds.`);
  }

  // ── insert ───────────────────────────────────────
  const { data: videoUrl } = admin.storage.from("videos").getPublicUrl(videoPath);
  const thumbnailUrl = thumbnailPath ? admin.storage.from("thumbnails").getPublicUrl(thumbnailPath).data.publicUrl : null;
  const slugBase = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 60) || "tip";
  const slug = `${slugBase}-${crypto.randomUUID().slice(0, 8)}`;

  const { data: row, error: insertError } = await admin.from("videos").insert({
    user_id: user.id,
    slug,
    title,
    description: description || null,
    game_id: "lol",
    category: topic,
    topic,
    character: champion.name,
    champion_id: champion.id,
    role_id: roleId || null,
    map_id: mapId,
    patch_id: patchId,
    tags,
    skill_level: skillLevel,
    duration_seconds: Math.max(1, Math.round(Math.min(duration, MAX_SECONDS))),
    video_path: videoPath,
    video_url: videoUrl.publicUrl,
    thumbnail_url: thumbnailUrl,
    status: visibility === "draft" ? "draft" : "published",
    visibility: visibility === "draft" ? "private" : visibility,
    learning_metadata: { takeaways, checked_duration: Math.round(duration * 100) / 100 },
  }).select("id,slug").single();

  if (insertError) {
    await removeUpload();
    console.error("[tips] insert failed", insertError.message);
    return bad("Couldn't save the tip. Try again.", 500);
  }
  return NextResponse.json({ id: row.id, slug: row.slug, duration });
}

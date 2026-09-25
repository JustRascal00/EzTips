// EZTips seed: patches + champions from Riot Data Dragon, demo League tips, and backfill of existing videos.
// Run from the arc folder:  npm run seed
// Needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY in .env.local. Safe to run again (upserts, no duplicates).
import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "node:crypto";
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const DDRAGON = "https://ddragon.leagueoflegends.com";

// ── env ─────────────────────────────────────────────────────────
function loadEnv(file) {
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!match || process.env[match[1]]) continue;
    process.env[match[1]] = match[2].replace(/^(['"])(.*)\1$/, "$2");
  }
}
loadEnv(join(root, ".env.local"));
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY;
if (!url || !secret) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY in .env.local");
  process.exit(1);
}
const db = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });

// ── helpers ─────────────────────────────────────────────────────
const toPatch = (version) => {
  const [major, minor] = version.split(".").map((part) => Number.parseInt(part, 10));
  return `${major >= 15 ? major + 10 : major}.${minor}`;
};
const norm = (value) => String(value ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
async function getJson(path) {
  const res = await fetch(`${DDRAGON}${path}`);
  if (!res.ok) throw new Error(`Data Dragon ${path} -> HTTP ${res.status}`);
  return res.json();
}
function must(result, what) {
  if (result.error) throw new Error(`${what}: ${result.error.message}`);
  return result.data;
}
const step = (label) => console.log(`\n▸ ${label}`);

// ── 1. patches ──────────────────────────────────────────────────
step("Patches");
const versions = (await getJson("/api/versions.json")).filter((v) => /^\d+\.\d+\.\d+$/.test(v));
const latest = versions[0];
const patchRows = [];
const seenPatch = new Set();
for (const v of versions) {
  if (Number.parseInt(v, 10) < 15) break; // 2025 (25.x) onwards is enough history
  const version = toPatch(v);
  if (seenPatch.has(version)) continue;
  seenPatch.add(version);
  patchRows.push({ version, ddragon_version: v });
}
must(await db.from("patches").upsert(patchRows, { onConflict: "ddragon_version", ignoreDuplicates: true }), "upsert patches");
must(await db.from("patches").update({ is_current: false }).neq("ddragon_version", latest).eq("is_current", true), "clear current patch");
must(await db.from("patches").update({ is_current: true }).eq("ddragon_version", latest), "set current patch");
const patches = must(await db.from("patches").select("id, version, ddragon_version, is_current"), "read patches");
const current = patches.find((p) => p.is_current);
const patchByName = new Map(patches.map((p) => [p.version, p]));
console.log(`  current patch ${current.version} (Data Dragon ${current.ddragon_version}), ${patches.length} patches stored`);

// ── 2. champions ────────────────────────────────────────────────
step("Champions");
const champJson = await getJson(`/cdn/${latest}/data/en_US/champion.json`);
const champRows = Object.values(champJson.data).map((c) => ({
  id: c.id,
  key: Number.parseInt(c.key, 10),
  name: c.name,
  title: c.title,
  tags: c.tags,
  image: c.image.full,
  updated_patch_id: current.id,
  updated_at: new Date().toISOString(),
}));
must(await db.from("champions").upsert(champRows, { onConflict: "id" }), "upsert champions");
const championByName = new Map();
for (const c of champRows) {
  championByName.set(norm(c.name), c.id);
  championByName.set(norm(c.id), c.id);
}
const findChampion = (text) => (text ? championByName.get(norm(text)) ?? null : null);
console.log(`  ${champRows.length} champions`);

// ── 3. demo tips (from the old mock data) ───────────────────────
step("Demo tips");
const SEED_EMAIL = "seed@eztips.invalid";
let seedUserId = must(await db.from("profiles").select("id").eq("username", "eztips").maybeSingle(), "find seed profile")?.id;
if (!seedUserId) {
  const created = await db.auth.admin.createUser({
    email: SEED_EMAIL,
    password: randomBytes(24).toString("base64url"),
    email_confirm: true,
    user_metadata: { username: "eztips", display_name: "EZTips" },
  });
  if (created.error) {
    // already exists under that email -> look it up
    const list = must(await db.auth.admin.listUsers({ perPage: 1000 }), "list users");
    seedUserId = list.users.find((u) => u.email === SEED_EMAIL)?.id;
    if (!seedUserId) throw new Error(`create seed user: ${created.error.message}`);
  } else {
    seedUserId = created.data.user.id;
  }
  // make sure the profile exists and is named eztips (the signup trigger usually does this)
  must(await db.from("profiles").upsert({ id: seedUserId, username: "eztips", display_name: "EZTips", bio: "Official EZTips demo clips." }, { onConflict: "id" }), "seed profile");
}
const tips = JSON.parse(readFileSync(join(root, "supabase/seed/lol-tips.json"), "utf8"));
const tipRows = tips.map((t) => ({
  user_id: seedUserId,
  slug: t.slug,
  title: t.title,
  description: t.description,
  game_id: "lol",
  category: t.category,
  topic: t.topic,
  character: t.champion,
  champion_id: findChampion(t.champion),
  role_id: t.role,
  map_id: "sr",
  patch_id: current.id,
  tags: t.tags,
  skill_level: t.skill_level,
  duration_seconds: Math.min(60, t.duration_seconds),
  video_path: `seed/${t.slug}`,
  video_url: t.video_url,
  thumbnail_url: t.thumbnail_url,
  status: "published",
  visibility: "public",
  learning_metadata: { seed: true, takeaways: t.takeaways },
  created_at: t.created_at,
}));
must(await db.from("videos").upsert(tipRows, { onConflict: "slug" }), "upsert demo tips");
console.log(`  ${tipRows.length} demo tips (owner @eztips, marked learning_metadata.seed = true)`);

// ── 4. backfill champion + patch on existing uploads ───────────
step("Backfill existing videos");
const existing = must(
  await db.from("videos").select("id, slug, character, champion_id, patch_id, learning_metadata").eq("game_id", "lol"),
  "read videos",
);
let updated = 0;
const unmatched = [];
for (const v of existing) {
  if (v.learning_metadata?.seed) continue;
  const patch = {};
  if (!v.champion_id && v.character) {
    const id = findChampion(v.character);
    if (id) patch.champion_id = id;
    else unmatched.push(`${v.slug}: champion "${v.character}"`);
  }
  const rawVersion = String(v.learning_metadata?.version ?? "").trim();
  if (!v.patch_id && rawVersion) {
    const m = rawVersion.match(/(\d+)\.(\d+)/);
    const name = m ? (Number(m[1]) >= 25 ? `${m[1]}.${Number(m[2])}` : toPatch(`${m[1]}.${m[2]}.1`)) : null;
    const hit = name && patchByName.get(name);
    if (hit) patch.patch_id = hit.id;
    else unmatched.push(`${v.slug}: patch "${rawVersion}"`);
  }
  if (Object.keys(patch).length) {
    must(await db.from("videos").update(patch).eq("id", v.id), `update ${v.slug}`);
    updated += 1;
  }
}
console.log(`  ${existing.length - tipRows.length} uploaded LoL videos checked, ${updated} updated`);
if (unmatched.length) console.log(`  couldn't match (fix in Studio later):\n   - ${unmatched.join("\n   - ")}`);

const noPatch = existing.filter((v) => !v.learning_metadata?.seed && !v.patch_id).length;
console.log(`\n✓ Seed done. Current patch ${current.version}.${noPatch ? ` ${noPatch} uploaded video(s) still have no patch.` : ""}`);

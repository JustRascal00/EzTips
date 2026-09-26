import { NextResponse } from "next/server";
import { MAP_DDRAGON_ID, MAP_SPELL_MODE, type BuildInput } from "@/lib/builds-data";
import { getItems, getLatestVersion, getRuneTrees, getSummonerSpells } from "@/lib/ddragon/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const ROLES = new Set(["top", "jungle", "mid", "adc", "support"]);
const bad = (message: string, status = 400) => NextResponse.json({ error: message }, { status });

/** Validates a build against the current patch's Data Dragon data. Returns the row to write or an error. */
async function validate(input: Partial<BuildInput>) {
  const title = String(input.title ?? "").trim().slice(0, 100);
  if (title.length < 3) return { error: "Give the build a name (3+ characters)." };
  const roleId = String(input.roleId ?? "");
  if (!ROLES.has(roleId)) return { error: "Pick a role." };
  const mapId = String(input.mapId ?? "sr");
  if (mapId !== "sr" && mapId !== "aram") return { error: "Builds are for Summoner's Rift or ARAM." };
  const championId = String(input.championId ?? "");

  const { version } = await getLatestVersion();
  const [items, trees, spells] = await Promise.all([getItems(version, { mapId: MAP_DDRAGON_ID[mapId] }), getRuneTrees(version), getSummonerSpells(version)]);
  const itemIds = new Set(items.map((i) => i.id));
  const list = (v: unknown, max: number) => (Array.isArray(v) ? v.map(String) : []).slice(0, max);
  const starting = list(input.startingItems, 4);
  const core = list(input.items, 6);
  const situational = list(input.situationalItems, 6);
  const unknown = [...starting, ...core, ...situational].filter((id) => !itemIds.has(id));
  if (unknown.length) return { error: `Unknown item(s) for this patch/map: ${unknown.join(", ")}` };
  if (core.length < 3) return { error: "Add at least 3 core items." };

  const r = input.runes;
  const tree = (id: unknown) => trees.find((t) => t.id === Number(id));
  const primary = tree(r?.primary);
  const secondary = tree(r?.secondary);
  if (!primary || !secondary || primary.id === secondary.id) return { error: "Pick a primary and a different secondary rune tree." };
  const inSlot = (t: typeof primary, slot: number, id: unknown) => t.slots[slot]?.runes.some((x) => x.id === Number(id));
  if (!inSlot(primary, 0, r?.keystone)) return { error: "Pick a keystone." };
  const primaryRunes = (r?.primaryRunes ?? []).map(Number);
  if (primaryRunes.length !== 3 || !primaryRunes.every((id, i) => inSlot(primary, i + 1, id))) return { error: "Pick one rune in each primary row." };
  const secondaryRunes = (r?.secondaryRunes ?? []).map(Number);
  const secondarySlots = secondaryRunes.map((id) => [1, 2, 3].find((slot) => inSlot(secondary, slot, id)));
  if (secondaryRunes.length !== 2 || secondarySlots.some((s) => s === undefined) || secondarySlots[0] === secondarySlots[1]) {
    return { error: "Pick two secondary runes from different rows." };
  }

  const mode = MAP_SPELL_MODE[mapId];
  const spellIds = new Set(spells.filter((s) => s.modes.includes(mode)).map((s) => s.id));
  const chosenSpells = list(input.spells, 2);
  if (chosenSpells.length !== 2 || chosenSpells[0] === chosenSpells[1] || !chosenSpells.every((s) => spellIds.has(s))) return { error: "Pick two different summoner spells." };

  const skillOrder = list(input.skillOrder, 18).map((s) => s.toUpperCase());
  if (skillOrder.some((s) => !["Q", "W", "E", "R"].includes(s))) return { error: "Invalid skill order." };

  return {
    row: {
      champion_id: championId,
      role_id: roleId,
      map_id: mapId,
      title,
      notes: String(input.notes ?? "").trim().slice(0, 2000),
      starting_items: starting,
      items: core,
      situational_items: situational,
      runes: { primary: primary.id, keystone: Number(r?.keystone), primaryRunes, secondary: secondary.id, secondaryRunes },
      spells: chosenSpells,
      skill_order: skillOrder,
    },
  };
}

async function context() {
  const supabase = await createClient();
  if (!supabase) return { error: bad("Supabase is not configured.", 503) };
  const { data } = await supabase.auth.getUser();
  if (!data.user) return { error: bad("Sign in to save builds.", 401) };
  const admin = createAdminClient();
  if (!admin) return { error: bad("Builds are not set up: SUPABASE_SECRET_KEY is missing on the server.", 500) };
  const { data: profile } = await admin.from("profiles").select("role").eq("id", data.user.id).maybeSingle();
  return { user: data.user, admin, isModerator: profile?.role === "moderator" || profile?.role === "admin" };
}

/** Create a build. */
export async function POST(request: Request) {
  const ctx = await context();
  if ("error" in ctx) return ctx.error;
  const input = (await request.json().catch(() => null)) as Partial<BuildInput> | null;
  if (!input) return bad("Invalid JSON body.");
  const { data: champ } = await ctx.admin.from("champions").select("id").eq("id", String(input.championId ?? "")).maybeSingle();
  if (!champ) return bad("Unknown champion.");
  try {
    const result = await validate(input);
    if ("error" in result) return bad(result.error!);
    const { data: patch } = await ctx.admin.from("patches").select("id").eq("is_current", true).maybeSingle();
    const { data, error } = await ctx.admin.from("builds").insert({ ...result.row, author_id: ctx.user.id, patch_id: patch?.id ?? null }).select("id").single();
    if (error) { console.error("[builds] insert", error.message); return bad("Couldn't save the build.", 500); }
    return NextResponse.json({ id: data.id });
  } catch (e) {
    console.error("[builds]", e);
    return bad("Couldn't check the build against patch data. Try again.", 502);
  }
}

/** Update your build (or any build, for moderators). Saving re-stamps it with the current patch. */
export async function PATCH(request: Request) {
  const ctx = await context();
  if ("error" in ctx) return ctx.error;
  const input = (await request.json().catch(() => null)) as (Partial<BuildInput> & { id?: string }) | null;
  if (!input?.id) return bad("Missing build id.");
  const { data: existing } = await ctx.admin.from("builds").select("id,author_id,champion_id").eq("id", input.id).maybeSingle();
  if (!existing) return bad("Build not found.", 404);
  if (existing.author_id !== ctx.user.id && !ctx.isModerator) return bad("You can only edit your own builds.", 403);
  try {
    const result = await validate({ ...input, championId: existing.champion_id });
    if ("error" in result) return bad(result.error!);
    const { data: patch } = await ctx.admin.from("patches").select("id").eq("is_current", true).maybeSingle();
    const { champion_id: _champion, ...fields } = result.row;
    void _champion;
    const { error } = await ctx.admin.from("builds").update({ ...fields, patch_id: patch?.id ?? null }).eq("id", existing.id);
    if (error) { console.error("[builds] update", error.message); return bad("Couldn't save the build.", 500); }
    return NextResponse.json({ id: existing.id });
  } catch (e) {
    console.error("[builds]", e);
    return bad("Couldn't check the build against patch data. Try again.", 502);
  }
}

import { NextResponse } from "next/server";
import { getChampionSpells, getItems, getLatestVersion, getRuneTrees, getSummonerSpells } from "@/lib/ddragon/server";
import { toPatch } from "@/lib/ddragon/shared";
import { MAP_DDRAGON_ID, parseItemDescription, plain, type PatchData } from "@/lib/builds-data";

/** Trimmed current-patch data for the build editor: items for a map, runes, summoner spells (+ champion skills). */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const map = url.searchParams.get("map") ?? "sr";
  const championId = url.searchParams.get("champion");
  try {
    const { version } = await getLatestVersion();
    const [items, trees, spells, champion] = await Promise.all([
      getItems(version, { mapId: MAP_DDRAGON_ID[map] ?? 11 }),
      getRuneTrees(version),
      getSummonerSpells(version),
      championId && /^[A-Za-z]+$/.test(championId) ? getChampionSpells(version, championId).catch(() => null) : Promise.resolve(undefined),
    ]);
    const body: PatchData = {
      version,
      patch: toPatch(version),
      items: items
        .map((i) => ({ id: i.id, name: i.name, gold: i.gold.total, tags: i.tags, plaintext: i.plaintext || plain(i.description).slice(0, 140), into: i.into ?? [], from: i.from ?? [], depth: (i as { depth?: number }).depth ?? 1, ...parseItemDescription(i.description) }))
        .sort((a, b) => a.gold - b.gold || a.name.localeCompare(b.name)),
      runeTrees: trees.map((t) => ({ id: t.id, name: t.name, icon: t.icon, slots: t.slots.map((s) => s.runes.map((r) => ({ id: r.id, name: r.name, icon: r.icon, shortDesc: plain(r.shortDesc) }))) })),
      spells: spells.map((s) => ({ id: s.id, name: s.name, image: s.image.full, modes: s.modes })),
      ...(champion !== undefined ? { champion } : {}),
    };
    return NextResponse.json(body, { headers: { "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400" } });
  } catch (error) {
    console.error("[ddragon]", error);
    return NextResponse.json({ error: "Couldn't load patch data from Riot. Try again." }, { status: 502 });
  }
}

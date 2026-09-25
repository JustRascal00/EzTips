import "server-only";

import { DDRAGON_BASE, DDRAGON_FALLBACK_VERSION } from "./shared";

const REVALIDATE_SECONDS = 60 * 60 * 6; // re-check for a new patch every 6 hours
const LOCALE = "en_US";

export type DDragonImage = { full: string; sprite: string; group: string; x: number; y: number; w: number; h: number };

export type DDragonChampion = {
  id: string; // "MonkeyKing"
  key: string; // numeric string, "62"
  name: string; // "Wukong"
  title: string;
  tags: string[];
  image: DDragonImage;
};

export type DDragonItem = {
  name: string;
  plaintext: string;
  description: string;
  gold: { base: number; total: number; sell: number; purchasable: boolean };
  tags: string[];
  maps: Record<string, boolean>;
  from?: string[];
  into?: string[];
  inStore?: boolean;
  requiredChampion?: string;
  image: DDragonImage;
};

export type DDragonRune = { id: number; key: string; name: string; icon: string; shortDesc: string; longDesc: string };
export type DDragonRuneTree = { id: number; key: string; name: string; icon: string; slots: { runes: DDragonRune[] }[] };

export type DDragonSummonerSpell = {
  id: string;
  key: string;
  name: string;
  description: string;
  modes: string[];
  image: DDragonImage;
};

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { next: { revalidate: REVALIDATE_SECONDS, tags: ["ddragon"] } });
  if (!res.ok) throw new Error(`Data Dragon request failed (${res.status}): ${url}`);
  return (await res.json()) as T;
}

/** Latest live version, e.g. "15.19.1". Falls back to a known version if Riot is unreachable. */
export async function getLatestVersion(): Promise<{ version: string; fallback: boolean }> {
  try {
    const versions = await getJson<string[]>(`${DDRAGON_BASE}/api/versions.json`);
    const latest = versions.find((v) => /^\d+\.\d+\.\d+$/.test(v));
    if (latest) return { version: latest, fallback: false };
  } catch {
    // fall through
  }
  return { version: DDRAGON_FALLBACK_VERSION, fallback: true };
}

const dataUrl = (version: string, file: string) => `${DDRAGON_BASE}/cdn/${version}/data/${LOCALE}/${file}`;

export async function getChampions(version: string) {
  const json = await getJson<{ data: Record<string, DDragonChampion> }>(dataUrl(version, "champion.json"));
  return Object.values(json.data).sort((a, b) => a.name.localeCompare(b.name));
}

/** Summoner's Rift (map 11) purchasable items only, unless includeAll is set. */
export async function getItems(version: string, { includeAll = false } = {}) {
  const json = await getJson<{ data: Record<string, DDragonItem> }>(dataUrl(version, "item.json"));
  return Object.entries(json.data)
    .map(([id, item]) => ({ id, ...item }))
    .filter((item) => includeAll || (item.gold.purchasable && item.maps["11"] && item.inStore !== false && !item.requiredChampion));
}

export async function getRuneTrees(version: string) {
  return getJson<DDragonRuneTree[]>(dataUrl(version, "runesReforged.json"));
}

export async function getSummonerSpells(version: string) {
  const json = await getJson<{ data: Record<string, DDragonSummonerSpell> }>(dataUrl(version, "summoner.json"));
  return Object.values(json.data);
}

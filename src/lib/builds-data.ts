// Shared shapes for build data (client + server).
export const MAP_DDRAGON_ID: Record<string, number> = { sr: 11, aram: 12, arena: 30 };
export const MAP_SPELL_MODE: Record<string, string> = { sr: "CLASSIC", aram: "ARAM", arena: "CHERRY" };

export type BuildItem = {
  id: string;
  name: string;
  gold: number;
  tags: string[];
  plaintext: string;
  into: string[];
  from: string[];
  depth: number;
  /** e.g. ["45 Attack Damage", "25% Attack Speed"] */
  stats: string[];
  /** passive / active text, paragraphs separated by \n */
  effect: string;
};
export type BuildRune = { id: number; name: string; icon: string; shortDesc: string };
export type BuildRuneTree = { id: number; name: string; icon: string; slots: BuildRune[][] };
export type BuildSpell = { id: string; name: string; image: string; modes: string[] };
export type ChampionSkills = { passive: { name: string; image: string }; spells: { key: string; name: string; image: string }[] } | null;

export type PatchData = {
  version: string;
  patch: string;
  items: BuildItem[];
  runeTrees: BuildRuneTree[];
  spells: BuildSpell[];
  champion?: ChampionSkills;
};

export type BuildRunes = {
  primary: number | null;     // tree id
  keystone: number | null;    // rune id (slot 0)
  primaryRunes: (number | null)[]; // slots 1..3
  secondary: number | null;   // tree id
  secondaryRunes: number[];   // 2 rune ids from slots 1..3
};

export const emptyRunes = (): BuildRunes => ({ primary: null, keystone: null, primaryRunes: [null, null, null], secondary: null, secondaryRunes: [] });

export type BuildInput = {
  championId: string;
  roleId: string;
  mapId: string;
  title: string;
  notes: string;
  startingItems: string[];
  items: string[];
  situationalItems: string[];
  runes: BuildRunes;
  spells: string[];
  skillOrder: string[];
};

/** Split a Data Dragon item description into stat lines and effect text. */
export function parseItemDescription(html: string): { stats: string[]; effect: string } {
  const statsMatch = html.match(/<stats>([\s\S]*?)<\/stats>/i);
  const stats = statsMatch
    ? statsMatch[1].split(/<br\s*\/?>/i).map((line) => line.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim()).filter(Boolean)
    : [];
  const rest = html
    .replace(/<stats>[\s\S]*?<\/stats>/i, "")
    .replace(/<(passive|active|unique|rarityMythic|rarityLegendary)>([\s\S]*?)<\/\1>/gi, "§$2§")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<li>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/[ \t]+/g, " ")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .join("\n");
  return { stats, effect: rest };
}

/** Strip Riot's HTML-ish markup from descriptions. */
export const plain = (html: string) => html.replace(/<br\s*\/?>/gi, " ").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();

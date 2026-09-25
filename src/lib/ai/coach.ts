import "server-only";

import { getChampions, getItems, getLatestVersion, getRuneTrees, getSummonerSpells } from "@/lib/ddragon/server";
import { toPatch } from "@/lib/ddragon/shared";
import { generateJson, type GeminiTurn } from "./gemini";

export type CoachRef = { id: string; name: string };

export type CoachAnswer = {
  answer: string;
  items: CoachRef[];
  champions: CoachRef[];
  runes: string[];
  /** Names the model used that don't exist in this patch's Data Dragon data. */
  unverified: string[];
  patch: string;
  version: string;
  model: string;
  usedFallback: boolean;
};

const norm = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, "");

async function loadPatchData() {
  const { version } = await getLatestVersion();
  const [champions, items, runeTrees, spells] = await Promise.all([
    getChampions(version),
    getItems(version),
    getRuneTrees(version),
    getSummonerSpells(version),
  ]);

  // Several items share a name (e.g. Ornn upgrades / map variants); keep the first purchasable one.
  const itemByName = new Map<string, CoachRef>();
  for (const item of items) {
    const key = norm(item.name);
    if (!itemByName.has(key)) itemByName.set(key, { id: item.id, name: item.name });
  }
  const championByName = new Map<string, CoachRef>(
    champions.flatMap((champ) => [
      [norm(champ.name), { id: champ.id, name: champ.name }] as const,
      [norm(champ.id), { id: champ.id, name: champ.name }] as const,
    ]),
  );
  const runeNames = runeTrees.flatMap((tree) => [tree.name, ...tree.slots.flatMap((slot) => slot.runes.map((rune) => rune.name))]);
  const spellNames = spells.filter((spell) => spell.modes.includes("CLASSIC")).map((spell) => spell.name);

  return { version, champions, itemByName, championByName, runeNames, spellNames };
}

function systemPrompt(data: Awaited<ReturnType<typeof loadPatchData>>) {
  const patch = toPatch(data.version);
  return `You are the EZTips coach, a League of Legends coach for Summoner's Rift.
Current patch: ${patch} (Data Dragon ${data.version}).

Rules:
- Only use champion, item, rune and summoner spell names from the lists below. Never invent items, runes or stats.
- If you are not sure about exact numbers, don't give numbers.
- Be concise and practical: short reasons a player can act on in game.
- If the question is not about League of Legends, say you can only help with League.

Reply with JSON only, in this shape:
{"answer": "markdown-free text, max ~180 words", "items": ["exact item names you recommend"], "champions": ["exact champion names you mention"], "runes": ["exact rune names you recommend"]}

CHAMPIONS: ${data.champions.map((c) => c.name).join(", ")}
ITEMS: ${[...new Set([...data.itemByName.values()].map((i) => i.name))].join(", ")}
RUNES: ${data.runeNames.join(", ")}
SUMMONER SPELLS: ${data.spellNames.join(", ")}`;
}

function parseJson(text: string): Record<string, unknown> {
  const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "").trim();
  try {
    const parsed = JSON.parse(cleaned);
    return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : { answer: String(parsed) };
  } catch {
    return { answer: cleaned };
  }
}

const strings = (value: unknown) => (Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : []);

export async function askCoach(message: string, history: GeminiTurn[]): Promise<CoachAnswer> {
  const data = await loadPatchData();
  const turns: GeminiTurn[] = [...history, { role: "user", text: message }];
  const { text, model, usedFallback } = await generateJson(systemPrompt(data), turns);
  const raw = parseJson(text);

  const unverified: string[] = [];
  const items: CoachRef[] = [];
  for (const name of strings(raw.items)) {
    const hit = data.itemByName.get(norm(name));
    if (hit) items.push(hit);
    else unverified.push(name);
  }
  const champions: CoachRef[] = [];
  for (const name of strings(raw.champions)) {
    const hit = data.championByName.get(norm(name));
    if (hit) champions.push(hit);
    else unverified.push(name);
  }
  const runeSet = new Map(data.runeNames.map((name) => [norm(name), name]));
  const runes: string[] = [];
  for (const name of strings(raw.runes)) {
    const hit = runeSet.get(norm(name));
    if (hit) runes.push(hit);
    else unverified.push(name);
  }

  return {
    answer: typeof raw.answer === "string" ? raw.answer : text,
    items,
    champions,
    runes,
    unverified,
    patch: toPatch(data.version),
    version: data.version,
    model,
    usedFallback,
  };
}

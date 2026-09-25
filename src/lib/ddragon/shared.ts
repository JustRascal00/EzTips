// Client-safe Data Dragon helpers (URL builders only, no network).
// The live patch version comes from getLatestVersion() in ./server.ts.

export const DDRAGON_BASE = "https://ddragon.leagueoflegends.com";

/** Used only if the versions endpoint is unreachable. Never treated as the "current" patch. */
export const DDRAGON_FALLBACK_VERSION = "16.19.1";

export const championIconUrl = (version: string, championId: string) =>
  `${DDRAGON_BASE}/cdn/${version}/img/champion/${championId}.png`;

export const championSplashUrl = (championId: string, skin = 0) =>
  `${DDRAGON_BASE}/cdn/img/champion/splash/${championId}_${skin}.jpg`;

export const championLoadingUrl = (championId: string, skin = 0) =>
  `${DDRAGON_BASE}/cdn/img/champion/loading/${championId}_${skin}.jpg`;

export const itemIconUrl = (version: string, itemId: string | number) =>
  `${DDRAGON_BASE}/cdn/${version}/img/item/${itemId}.png`;

export const spellIconUrl = (version: string, imageFull: string) =>
  `${DDRAGON_BASE}/cdn/${version}/img/spell/${imageFull}`;

/** Rune icons live under /cdn/img/ with a path taken from runesReforged.json. */
export const runeIconUrl = (iconPath: string) => `${DDRAGON_BASE}/cdn/img/${iconPath}`;

/** "15.18.1" -> "15.18" (the patch players talk about). */
export const toPatch = (version: string) => version.split(".").slice(0, 2).join(".");

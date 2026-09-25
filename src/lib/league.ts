// Small static League metadata for the UI.
export const ROLES = [
  { id: "top", label: "Top" },
  { id: "jungle", label: "Jungle" },
  { id: "mid", label: "Mid" },
  { id: "adc", label: "ADC" },
  { id: "support", label: "Support" },
] as const;

export const ROLE_LABEL: Record<string, string> = Object.fromEntries(ROLES.map((r) => [r.id, r.label]));

/** Data Dragon champion classes (champion.tags). */
export const CLASSES = ["Assassin", "Fighter", "Mage", "Marksman", "Support", "Tank"] as const;

export const MAP_LABEL: Record<string, string> = { sr: "Summoner's Rift", aram: "ARAM", arena: "Arena" };

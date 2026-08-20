import type { LearningPath } from "@/lib/types";

const lolSplash = (champ: string) =>
  `https://ddragon.leagueoflegends.com/cdn/img/champion/splash/${champ}_0.jpg`;

export const learningPaths: LearningPath[] = [
  {
    id: "ahri-mastery",
    slug: "ahri-mastery",
    title: "Ahri Mastery",
    gameId: "lol",
    category: "Mid Lane",
    skillLevel: "intermediate",
    description:
      "Combos, laning, matchups, and team fighting — built as short lessons you can finish between queues.",
    thumbnail: lolSplash("Ahri"),
    learners: 48_200,
    lessons: [
      { id: "l1", title: "Understanding abilities", duration: 52, tutorialId: "t9" },
      { id: "l2", title: "Basic combos", duration: 39, tutorialId: "t9" },
      { id: "l3", title: "Laning fundamentals", duration: 61 },
      { id: "l4", title: "Trading patterns", duration: 48, tutorialId: "t2" },
      { id: "l5", title: "Wave management", duration: 63, tutorialId: "t12" },
      { id: "l6", title: "Roaming", duration: 54, tutorialId: "t1" },
      { id: "l7", title: "Advanced combos", duration: 44 },
      { id: "l8", title: "Matchups", duration: 58, tutorialId: "t2" },
      { id: "l9", title: "Team fighting", duration: 50 },
      { id: "l10", title: "Advanced positioning", duration: 47 },
      { id: "l11", title: "Side lane after 20", duration: 41 },
      { id: "l12", title: "Charm setups with jungle", duration: 36 },
      { id: "l13", title: "Vs assassins", duration: 55 },
      { id: "l14", title: "Vs control mages", duration: 49 },
      { id: "l15", title: "Ultimate usage", duration: 33 },
      { id: "l16", title: "Item spikes", duration: 40 },
      { id: "l17", title: "Review: a Challenger VOD", duration: 70 },
      { id: "l18", title: "Ranked checklist", duration: 28 },
    ],
  },
  {
    id: "mid-fundamentals",
    slug: "mid-lane-fundamentals",
    title: "Mid Lane Fundamentals",
    gameId: "lol",
    category: "Mid Lane",
    skillLevel: "beginner",
    description:
      "Waves, trades, and the roam timer. Twelve short lessons that replace guessing with a plan.",
    thumbnail: lolSplash("Orianna"),
    learners: 91_400,
    lessons: [
      { id: "m1", title: "The three wave states", duration: 46, tutorialId: "t12" },
      { id: "m2", title: "Last-hitting under pressure", duration: 38 },
      { id: "m3", title: "When you are allowed to trade", duration: 41 },
      { id: "m4", title: "Crash, bounce, freeze", duration: 63, tutorialId: "t12" },
      { id: "m5", title: "Tracking the enemy jungler", duration: 44 },
      { id: "m6", title: "Roam rules", duration: 54, tutorialId: "t1" },
      { id: "m7", title: "Plates vs XP", duration: 33 },
      { id: "m8", title: "Recall timing", duration: 29 },
      { id: "m9", title: "Playing for Herald", duration: 48 },
      { id: "m10", title: "Mid after first turret", duration: 52 },
      { id: "m11", title: "Don't group mid on a side wave", duration: 68, tutorialId: "t19" },
      { id: "m12", title: "Your first 20 games checklist", duration: 24 },
    ],
  },
  {
    id: "ranked-macro",
    slug: "ranked-macro-fundamentals",
    title: "Ranked Macro Fundamentals",
    gameId: "lol",
    category: "Macro",
    skillLevel: "intermediate",
    description:
      "When to group, when to split, and how to stop throwing leads after 20 minutes.",
    thumbnail: lolSplash("Yasuo"),
    learners: 36_800,
    lessons: [
      { id: "r1", title: "Win conditions by composition", duration: 50 },
      { id: "r2", title: "When grouping mid throws", duration: 68, tutorialId: "t19" },
      { id: "r3", title: "Herald and first turret", duration: 41 },
      { id: "r4", title: "Dragon soul vs Baron", duration: 47 },
      { id: "r5", title: "Side lane assignments", duration: 39 },
      { id: "r6", title: "Playing from behind", duration: 44 },
      { id: "r7", title: "Closing a 5k lead", duration: 36 },
      { id: "r8", title: "Vision that actually matters", duration: 42 },
      { id: "r9", title: "Death timers after 30", duration: 28 },
      { id: "r10", title: "End-game checklist", duration: 31 },
    ],
  },
  {
    id: "jett-fundamentals",
    slug: "jett-fundamentals",
    title: "Jett Fundamentals",
    gameId: "valorant",
    category: "Agents",
    skillLevel: "beginner",
    description:
      "Smokes, dashes, and space — the Jett toolkit without the highlight-reel habits.",
    thumbnail:
      "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1200&q=80",
    learners: 54_600,
    lessons: [
      { id: "j1", title: "The beginner smoke", duration: 42, tutorialId: "t5" },
      { id: "j2", title: "Ascent A main smokes", duration: 51, tutorialId: "t10" },
      { id: "j3", title: "Dash after the pick, not before", duration: 36 },
      { id: "j4", title: "Updraft as a reset, not a peek", duration: 33 },
      { id: "j5", title: "Knives: when they're a round win", duration: 40 },
      { id: "j6", title: "Lurking without throwing", duration: 45 },
      { id: "j7", title: "Retake vs default", duration: 38 },
      { id: "j8", title: "Entry with a controller", duration: 47 },
      { id: "j9", title: "Operator Jett — only these setups", duration: 44 },
      { id: "j10", title: "Ranked demo review", duration: 62 },
    ],
  },
  {
    id: "aim-foundations",
    slug: "aim-foundations",
    title: "Aim Foundations",
    gameId: "valorant",
    category: "Aim",
    skillLevel: "beginner",
    description:
      "Crosshair, peeking, and a 12-minute routine that shows up in actual games.",
    thumbnail:
      "https://images.unsplash.com/photo-1542751110-97427bbecf20?auto=format&fit=crop&w=1200&q=80",
    learners: 120_400,
    lessons: [
      { id: "a1", title: "Crosshair placement in 30 seconds", duration: 33, tutorialId: "t6" },
      { id: "a2", title: "Counter-strafing that sticks", duration: 28 },
      { id: "a3", title: "Don't repeek", duration: 40, tutorialId: "t15" },
      { id: "a4", title: "The 12-minute routine", duration: 55 },
      { id: "a5", title: "Flicks vs micro-adjust", duration: 31 },
      { id: "a6", title: "Spray vs tap by range", duration: 36 },
      { id: "a7", title: "Moving while shooting — never", duration: 22 },
      { id: "a8", title: "Transfer to ranked", duration: 40 },
    ],
  },
  {
    id: "cs2-recoil",
    slug: "cs2-recoil-control",
    title: "CS2 Recoil Control",
    gameId: "cs2",
    category: "Aim",
    skillLevel: "beginner",
    description: "AK, M4, and the reset that wins more fights than a 30-bullet spray.",
    thumbnail: "https://cdn.cloudflare.steamstatic.com/steam/apps/730/header.jpg",
    learners: 77_200,
    lessons: [
      { id: "c1", title: "How to control CS2 recoil", duration: 46, tutorialId: "t7" },
      { id: "c2", title: "Counter-strafe first", duration: 27 },
      { id: "c3", title: "Burst windows by range", duration: 34 },
      { id: "c4", title: "M4 vs AK patterns", duration: 41 },
      { id: "c5", title: "Spray transfer", duration: 38 },
      { id: "c6", title: "Deathmatch that actually helps", duration: 29 },
    ],
  },
  {
    id: "mc-early-farms",
    slug: "minecraft-early-farms",
    title: "Minecraft Early-Game Farms",
    gameId: "minecraft",
    category: "Farms",
    skillLevel: "beginner",
    description: "The farm order that gets you iron, food, and XP without a 4-hour project.",
    thumbnail:
      "https://images.unsplash.com/photo-1587573089734-09d51121ea00?auto=format&fit=crop&w=1200&q=80",
    learners: 63_100,
    lessons: [
      { id: "f1", title: "The easiest iron farm", duration: 72, tutorialId: "t8" },
      { id: "f2", title: "Farm priority", duration: 58, tutorialId: "t13" },
      { id: "f3", title: "Crop loops that don't stall", duration: 36 },
      { id: "f4", title: "Villager workspace", duration: 49 },
      { id: "f5", title: "XP without a gold farm yet", duration: 40 },
      { id: "f6", title: "Storage before the mega-base", duration: 44 },
    ],
  },
  {
    id: "adc-silver",
    slug: "adc-out-of-silver",
    title: "ADC: Out of Silver",
    gameId: "lol",
    category: "ADC",
    skillLevel: "beginner",
    description: "Spacing, waves, and the fights you keep taking for no reason.",
    thumbnail: lolSplash("Jinx"),
    learners: 41_900,
    lessons: [
      { id: "s1", title: "3 Silver ADC mistakes", duration: 61, tutorialId: "t3" },
      { id: "s2", title: "Spacing vs engage supports", duration: 38 },
      { id: "s3", title: "Crash before objective", duration: 33 },
      { id: "s4", title: "When it's not a 2v2", duration: 29 },
      { id: "s5", title: "Kiting without walking into them", duration: 44 },
      { id: "s6", title: "Recall and tempo", duration: 31 },
      { id: "s7", title: "First item spike fights", duration: 36 },
      { id: "s8", title: "Team fighting as ADC", duration: 50 },
    ],
  },
];

export function getPath(idOrSlug: string) {
  return learningPaths.find((p) => p.id === idOrSlug || p.slug === idOrSlug);
}

export function pathDuration(path: LearningPath) {
  return path.lessons.reduce((s, l) => s + l.duration, 0);
}

export function pathsByGame(gameId: string) {
  return learningPaths.filter((p) => p.gameId === gameId);
}

export function pathsByCreatorGame(gameId: string) {
  return pathsByGame(gameId);
}

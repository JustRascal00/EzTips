import { commentsFor } from "./comments";
import { creators, getCreator } from "./creators";
import { games, getGame } from "./games";
import { getPath, learningPaths } from "./paths";
import { getTutorial, tutorials } from "./tutorials";

export {
  commentsFor,
  creators,
  games,
  getCreator,
  getGame,
  getPath,
  getTutorial,
  learningPaths,
  tutorials,
};

export function searchAll(query: string) {
  const q = query.trim().toLowerCase();
  if (!q) {
    return {
      tutorials: [],
      games: [],
      creators: [],
      characters: [] as { gameId: string; id: string; name: string; image: string }[],
      paths: [],
      topics: [] as string[],
    };
  }

  const tuts = tutorials.filter((t) => {
    const blob = [
      t.title,
      t.learn,
      t.category,
      t.topic,
      t.character,
      t.tags.join(" "),
      getGame(t.gameId)?.name,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return blob.includes(q) || q.split(" ").every((w) => blob.includes(w));
  });

  const g = games.filter(
    (game) =>
      game.name.toLowerCase().includes(q) ||
      game.short.toLowerCase().includes(q) ||
      game.slug.includes(q.replace(/\s+/g, "-")),
  );

  const c = creators.filter(
    (cr) =>
      cr.displayName.toLowerCase().includes(q) ||
      cr.username.toLowerCase().includes(q) ||
      cr.mainFocus.toLowerCase().includes(q) ||
      cr.credential.label.toLowerCase().includes(q),
  );

  const characters = games.flatMap((game) =>
    game.characters
      .filter((ch) => ch.name.toLowerCase().includes(q))
      .map((ch) => ({ gameId: game.id, ...ch })),
  );

  const paths = learningPaths.filter((p) => {
    const game = getGame(p.gameId);
    return (
      p.title.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q) ||
      (game?.name.toLowerCase().includes(q) ?? false)
    );
  });

  const topicSet = new Set<string>();
  tutorials.forEach((t) => {
    if (t.topic.toLowerCase().includes(q) || t.category.toLowerCase().includes(q)) {
      topicSet.add(t.topic);
    }
    t.tags.forEach((tag) => {
      if (tag.toLowerCase().includes(q.replace(/\s+/g, ""))) topicSet.add(tag);
    });
  });

  return {
    tutorials: tuts,
    games: g,
    creators: c,
    characters,
    paths,
    topics: [...topicSet],
  };
}

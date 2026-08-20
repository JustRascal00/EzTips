import { getTutorial, tutorials } from "@/data/tutorials";
import { getCreator } from "@/data/creators";
import { getGame } from "@/data/games";
import type { Metadata } from "next";
import { TutorialView } from "./view";
import { notFound } from "next/navigation";

export function generateStaticParams() {
  return tutorials.map((t) => ({ slug: t.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const t = getTutorial(slug);
  if (!t) return { title: "Tutorial" };
  const game = getGame(t.gameId);
  const creator = getCreator(t.creatorId);
  return {
    title: t.title,
    description: t.learn,
    openGraph: {
      title: `${t.title} · EZTips`,
      description: `${game?.name} · ${t.category} · ${t.learn}`,
      type: "video.other",
    },
    other: {
      "twitter:creator": creator ? `@${creator.username}` : "",
    },
  };
}

export default async function TutorialPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const tutorial = getTutorial(slug);
  if (!tutorial) notFound();
  return <TutorialView slug={slug} />;
}

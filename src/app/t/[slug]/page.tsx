import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { getCommunityVideoBySlug } from "@/lib/supabase/videos.server";
import { TutorialView } from "./view";

const loadTip = cache((slug: string) => getCommunityVideoBySlug(slug));

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const tip = await loadTip(slug);
  if (!tip) return { title: "Tip not found" };
  const context = [tip.championName, tip.patch ? `Patch ${tip.patch}` : null].filter(Boolean).join(" · ");
  return {
    title: tip.title,
    description: tip.learn || undefined,
    openGraph: {
      title: `${tip.title} · EZTips`,
      description: [context, tip.learn].filter(Boolean).join(" · "),
      type: "video.other",
      images: tip.thumbnail ? [{ url: tip.thumbnail }] : undefined,
    },
  };
}

export default async function TipPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const tip = await loadTip(slug);
  if (!tip) notFound();
  return <TutorialView tutorial={tip} />;
}

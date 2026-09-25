import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { championSplashUrl } from "@/lib/ddragon/shared";
import { ChampionView } from "./view";

type Champion = { id: string; name: string; title: string; tags: string[] };

const loadChampion = cache(async (id: string): Promise<Champion | null> => {
  const supabase = await createClient();
  if (!supabase) return null;
  const { data } = await supabase.from("champions").select("id,name,title,tags").eq("id", id).maybeSingle();
  return (data as Champion | null) ?? null;
});

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const champion = await loadChampion(id);
  if (!champion) return { title: "Champion not found" };
  return {
    title: `${champion.name} tips, builds and matchups`,
    description: `Short ${champion.name} tips from real players, builds and matchups for the current patch.`,
    openGraph: { images: [{ url: championSplashUrl(champion.id) }] },
  };
}

export default async function ChampionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const champion = await loadChampion(id);
  if (!champion) notFound();
  return <ChampionView champion={champion} />;
}

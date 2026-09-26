import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { championSplashUrl } from "@/lib/ddragon/shared";
import { MatchupPage } from "./view";

const loadPair = cache(async (a: string, b: string) => {
  const supabase = await createClient();
  if (!supabase || a === b) return null;
  const { data } = await supabase.from("champions").select("id,name").in("id", [a, b]);
  const me = data?.find((c) => c.id === a);
  const vs = data?.find((c) => c.id === b);
  return me && vs ? { me, vs } : null;
});

export async function generateMetadata({ params }: { params: Promise<{ a: string; b: string }> }): Promise<Metadata> {
  const { a, b } = await params;
  const pair = await loadPair(a, b);
  if (!pair) return { title: "Matchup not found" };
  return {
    title: `${pair.me.name} vs ${pair.vs.name}: lane tips and power spikes`,
    description: `How to play ${pair.me.name} into ${pair.vs.name}: lane tips, power spikes, build changes and short tips for the current patch.`,
    openGraph: { images: [{ url: championSplashUrl(pair.me.id) }] },
  };
}

export default async function Page({ params }: { params: Promise<{ a: string; b: string }> }) {
  const { a, b } = await params;
  const pair = await loadPair(a, b);
  if (!pair) notFound();
  return <MatchupPage me={pair.me} vs={pair.vs} />;
}

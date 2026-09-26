import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { avatarFor, getProfileByUsername } from "@/lib/tips";
import { ProfileView } from "./view";

const load = cache(async (username: string) => {
  const supabase = await createClient();
  if (!supabase) return null;
  return getProfileByUsername(supabase, decodeURIComponent(username));
});

export async function generateMetadata({ params }: { params: Promise<{ username: string }> }): Promise<Metadata> {
  const { username } = await params;
  const profile = await load(username);
  if (!profile) return { title: "Player not found" };
  return {
    title: `${profile.display_name} (@${profile.username})`,
    description: profile.bio || `League of Legends tips by @${profile.username} on EZTips.`,
    openGraph: { images: [{ url: avatarFor(profile) }] },
  };
}

export default async function ProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const profile = await load(username);
  if (!profile) notFound();
  return <ProfileView profile={profile} />;
}

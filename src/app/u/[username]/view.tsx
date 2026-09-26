"use client";

import { FollowButton } from "@/components/actions";
import { AppShell } from "@/components/layout/AppShell";
import { ReportButton } from "@/components/ReportButton";
import { ChampionIcon, TipGrid } from "@/components/league";
import { buttonClass, EmptyState, Segmented, Tabs } from "@/components/ui";
import { championSplashUrl } from "@/lib/ddragon/shared";
import { formatCount } from "@/lib/format";
import { useApp } from "@/lib/store";
import { avatarFor, getTipsByIds, listTips, type ProfileFull } from "@/lib/tips";
import type { Tutorial } from "@/lib/types";
import { useSupabaseQuery } from "@/lib/use-tips";
import { CalendarDays, Clapperboard, Link2, Settings2, Upload } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

export function ProfileView({ profile }: { profile: ProfileFull }) {
  const { currentUser, isLoggedIn, liked, followedCreators, toast } = useApp();
  const isMe = isLoggedIn && currentUser.id === profile.id;
  const [tab, setTab] = useState("tips");
  const [sort, setSort] = useState<"top" | "new">("top");

  const { data: tips, loading } = useSupabaseQuery(
    `profile:${profile.id}:${sort}`,
    (c) => listTips(c, { creatorIds: [profile.id], sort, limit: 100 }),
    [] as Tutorial[],
  );
  const { data: upvoted, loading: upLoading } = useSupabaseQuery(
    `profile-upvoted:${isMe ? liked.join(",") : ""}`,
    (c) => (isMe ? getTipsByIds(c, liked) : Promise.resolve([])),
    [] as Tutorial[],
  );

  // Follower count shown live: server count, adjusted if you (un)follow on this page.
  const followingNow = followedCreators.includes(profile.id);
  const [initialFollowing] = useState(followingNow);
  const followers = profile.follower_count + (followingNow === initialFollowing ? 0 : followingNow ? 1 : -1);

  const stats = useMemo(() => {
    const score = tips.reduce((sum, t) => sum + (t.score ?? 0), 0);
    const champs = new Map<string, { id: string; name: string; n: number }>();
    for (const t of tips) if (t.championId) {
      const c = champs.get(t.championId) ?? { id: t.championId, name: t.championName ?? t.championId, n: 0 };
      c.n += 1;
      champs.set(t.championId, c);
    }
    return { score, mains: [...champs.values()].sort((a, b) => b.n - a.n).slice(0, 3) };
  }, [tips]);

  const banner = stats.mains[0]?.id;
  const joined = new Date(profile.created_at).toLocaleDateString(undefined, { month: "long", year: "numeric" });

  return (
    <AppShell publicPage>
      {/* ── Header ──────────────────────────────── */}
      <section className="relative -mx-4 mt-0 overflow-hidden sm:mx-0 sm:mt-6 sm:rounded-3xl sm:border sm:border-white/[0.06]">
        <div className="relative h-36 sm:h-44">
          {banner ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={championSplashUrl(banner)} alt="" className="h-full w-full object-cover object-[center_25%] opacity-60" />
          ) : (
            <div className="h-full w-full bg-[radial-gradient(circle_at_20%_20%,rgba(118,87,255,0.45),transparent_55%),radial-gradient(circle_at_80%_0%,rgba(56,189,248,0.2),transparent_50%)]" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-panel via-panel/30 to-transparent" />
          <div className="absolute inset-0 bg-grid opacity-40" />
        </div>
        <div className="relative bg-panel px-5 pb-6 sm:px-8">
          <div className="-mt-12 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex items-end gap-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={avatarFor(profile)} alt="" className="h-24 w-24 rounded-3xl border-4 border-panel bg-card object-cover shadow-xl sm:h-28 sm:w-28" />
              <div className="pb-1">
                <h1 className="display text-3xl font-extrabold leading-none sm:text-4xl">{profile.display_name}</h1>
                <div className="mt-1 text-sm text-muted">@{profile.username}</div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {isMe ? (
                <>
                  <Link href="/settings" className={buttonClass("secondary", "md")}><Settings2 className="h-4 w-4" />Edit profile</Link>
                  <Link href="/studio" className={buttonClass("secondary", "md")}><Clapperboard className="h-4 w-4" />Studio</Link>
                </>
              ) : (
                <FollowButton creatorId={profile.id} />
              )}
              <button type="button" onClick={() => { navigator.clipboard?.writeText(window.location.href); toast("Profile link copied"); }} className={buttonClass("ghost", "icon")} aria-label="Copy profile link"><Link2 className="h-4 w-4" /></button>
              {!isMe && <ReportButton target="profile" targetId={profile.id} compact />}
            </div>
          </div>

          {profile.bio && <p className="mt-4 max-w-2xl whitespace-pre-line text-[15px] leading-6 text-white/80">{profile.bio}</p>}

          <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-3">
            <Stat value={tips.length} label="Tips" />
            <Stat value={followers} label="Followers" />
            <Stat value={profile.following_count} label="Following" />
            <Stat value={stats.score} label="Tip score" />
            <span className="inline-flex items-center gap-1.5 text-xs text-muted"><CalendarDays className="h-3.5 w-3.5" />Joined {joined}</span>
          </div>

          {stats.mains.length > 0 && (
            <div className="mt-5 flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted">Makes tips for</span>
              {stats.mains.map((c) => (
                <Link key={c.id} href={`/champions/${c.id}`} className="inline-flex items-center gap-1.5 rounded-xl border border-white/[0.07] bg-white/[0.03] py-1 pl-1 pr-2.5 text-xs font-bold hover:border-accent/40">
                  <ChampionIcon id={c.id} size={22} className="rounded-md" />{c.name}<span className="text-muted">{c.n}</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── Tabs ────────────────────────────────── */}
      <div className="sticky top-14 z-30 -mx-4 mt-2 bg-bg/90 px-4 backdrop-blur-xl sm:mx-0 sm:px-0">
        <Tabs
          value={tab}
          onChange={setTab}
          tabs={[
            { id: "tips", label: "Tips", count: loading ? undefined : tips.length },
            ...(isMe ? [{ id: "upvoted", label: "Upvoted", count: liked.length }] : []),
          ]}
        />
      </div>

      <div className="mt-6">
        {tab === "tips" && (
          <>
            {tips.length > 1 && <Segmented className="mb-4" value={sort} onChange={setSort} options={[{ id: "top", label: "Top" }, { id: "new", label: "New" }]} />}
            <TipGrid
              tips={tips}
              loading={loading}
              empty={isMe
                ? <EmptyState title="You haven't posted a tip yet" body="Share one thing that works, in 60 seconds or less." action={<Link href="/studio/upload" className={buttonClass("primary", "md")}><Upload className="h-4 w-4" />Upload your first tip</Link>} />
                : <EmptyState title={`@${profile.username} hasn't posted tips yet`} body="Follow them to see their first one in your Following feed." />}
            />
          </>
        )}
        {tab === "upvoted" && isMe && (
          <TipGrid tips={upvoted} loading={upLoading} empty={<EmptyState title="No upvoted tips yet" body="Upvote tips that helped you. Only you can see this list." />} />
        )}
      </div>
    </AppShell>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <span className="display text-2xl font-bold tabular">{formatCount(value)}</span>
      <span className="text-sm text-muted">{label}</span>
    </div>
  );
}

"use client";

import { Button, VerifiedMark } from "@/components/ui";
import { GameCard, TutorialCard } from "@/components/cards";
import { Logo } from "@/components/Logo";
import { creators } from "@/data/creators";
import { games } from "@/data/games";
import { tutorials } from "@/data/tutorials";
import { formatCount } from "@/lib/format";
import { useApp } from "@/lib/store";
import { Bookmark, Heart, MessageCircle, Play, Share2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

function FeedPreview() {
  const clip = tutorials[0];
  const creator = creators.find((item) => item.id === clip.creatorId);
  return (
    <div className="relative mx-auto w-full max-w-[420px]">
      <div className="absolute -inset-8 rounded-full bg-accent/15 blur-3xl" />
      <div className="relative mx-auto aspect-[9/16] max-h-[620px] overflow-hidden rounded-[28px] border border-white/10 bg-black shadow-2xl shadow-black/60">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={clip.thumbnail} alt="Gameplay clip preview" className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/25" />
        <div className="absolute left-4 top-4 rounded-full border border-white/15 bg-black/45 px-3 py-1.5 text-xs font-semibold backdrop-blur">
          League of Legends
        </div>
        <div className="absolute inset-0 grid place-items-center">
          <span className="grid h-16 w-16 place-items-center rounded-full border border-white/20 bg-black/40 backdrop-blur">
            <Play className="ml-1 h-7 w-7 fill-white" />
          </span>
        </div>
        <div className="absolute bottom-5 left-4 right-16">
          <div className="mb-3 flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={creator?.avatar} alt="" className="h-9 w-9 rounded-full border border-white/25" />
            <div>
              <div className="text-sm font-bold">@{creator?.username}</div>
              <div className="text-[11px] text-white/60">Community creator</div>
            </div>
            <span className="rounded-lg bg-accent px-2.5 py-1 text-xs font-bold">Follow</span>
          </div>
          <h2 className="text-xl font-bold leading-tight">{clip.title}</h2>
          <p className="mt-2 text-xs font-semibold">#MidLane #Macro #Intermediate</p>
          <p className="mt-2 text-[11px] text-white/55">{formatCount(clip.views)} views</p>
        </div>
        <div className="absolute bottom-5 right-3 flex flex-col gap-4">
          {([
            { Icon: Heart, label: formatCount(clip.likes) },
            { Icon: MessageCircle, label: formatCount(clip.comments) },
            { Icon: Bookmark, label: "Save" },
            { Icon: Share2, label: "Share" },
          ] as const).map(({ Icon, label }, index) => (
            <span key={index} className="flex flex-col items-center gap-1 text-[10px] font-semibold">
              <span className="grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-black/45 backdrop-blur">
                <Icon className="h-4 w-4" />
              </span>
              {label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function MarketingPage() {
  const { hydrated, isLoggedIn } = useApp();
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!hydrated) return;
    if (isLoggedIn) router.replace("/home");
    else setReady(true);
  }, [hydrated, isLoggedIn, router]);

  if (!ready) return <div className="min-h-screen bg-bg" />;

  return (
    <div className="min-h-screen overflow-hidden bg-bg">
      <header className="sticky top-0 z-40 border-b border-border bg-bg/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
          <Logo />
          <nav className="hidden items-center gap-6 text-sm text-muted md:flex">
            <a href="#games" className="hover:text-text">Games</a>
            <a href="#creators" className="hover:text-text">Creators</a>
            <a href="#how-it-works" className="hover:text-text">How it works</a>
            <a href="#trending" className="hover:text-text">Explore</a>
          </nav>
          <Link href="/onboarding"><Button>Build my feed</Button></Link>
        </div>
      </header>

      <main>
        <section className="relative mx-auto grid max-w-6xl items-center gap-14 px-5 py-16 md:grid-cols-2 md:py-24">
          <div className="pointer-events-none absolute -left-80 top-10 h-[480px] w-[480px] rounded-full bg-accent/10 blur-[120px]" />
          <div className="relative">
            <p className="text-sm font-semibold text-accent">Community clips. Personalized to your games.</p>
            <h1 className="mt-4 text-4xl font-bold leading-[1.06] tracking-tight md:text-6xl">
              Learn your favorite games, one clip at a time.
            </h1>
            <p className="mt-5 max-w-lg text-lg leading-relaxed text-muted">
              Choose the games you play and scroll a feed of tips, mechanics, strategies, and guides uploaded by real players.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/onboarding"><Button size="lg">Choose my games</Button></Link>
              <a href="#trending"><Button size="lg" variant="secondary">Watch community clips</Button></a>
            </div>
            <div className="mt-10 grid max-w-lg grid-cols-3 gap-4 border-t border-border pt-6 text-sm">
              <div><div className="text-xl font-bold">22K+</div><div className="text-muted">Creators</div></div>
              <div><div className="text-xl font-bold">20–60s</div><div className="text-muted">Useful clips</div></div>
              <div><div className="text-xl font-bold">Your games</div><div className="text-muted">Your feed</div></div>
            </div>
          </div>
          <FeedPreview />
        </section>

        <section id="games" className="mx-auto max-w-6xl px-5 py-16">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent">Personalized discovery</p>
          <h2 className="mt-3 text-3xl font-bold">Pick the games you actually play</h2>
          <p className="mt-2 text-muted">Choose one or several. Your For You feed stays focused on those games.</p>
          <div className="mt-7 grid grid-cols-2 gap-3 md:grid-cols-4">
            {games.map((game) => <GameCard key={game.id} game={game} href="/onboarding" />)}
          </div>
        </section>

        <section id="how-it-works" className="mx-auto max-w-6xl px-5 py-16">
          <h2 className="text-3xl font-bold">A learning feed that stays in your lane</h2>
          <div className="mt-7 grid gap-4 md:grid-cols-3">
            {[
              ["01", "Choose your games", "Select one or many games during onboarding and change them whenever you want."],
              ["02", "Swipe useful clips", "For You stays inside those games. Explore lets you branch out intentionally."],
              ["03", "Save what works", "Organize tips into collections like Ahri Combos, Valorant Aim, or CS2 Smokes."],
            ].map(([number, title, body]) => (
              <div key={number} className="rounded-2xl border border-border bg-card p-6">
                <div className="text-xs font-bold text-accent">{number}</div>
                <h3 className="mt-6 text-lg font-bold">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{body}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="creators" className="mx-auto max-w-6xl px-5 py-16">
          <h2 className="text-3xl font-bold">Follow creators who make you better</h2>
          <p className="mt-2 text-muted">Real profiles, real gameplay, and a feed that learns who you trust.</p>
          <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {creators.slice(0, 6).map((creator) => (
              <div key={creator.id} className="flex gap-3 rounded-2xl border border-border bg-card p-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={creator.avatar} alt="" className="h-12 w-12 rounded-full border border-border" />
                <div className="min-w-0">
                  <div className="flex items-center gap-1 font-semibold">@{creator.username}{creator.verified && <VerifiedMark />}</div>
                  <div className="mt-1 text-xs font-medium text-accent">{creator.mainFocus}</div>
                  <p className="mt-2 line-clamp-2 text-xs text-muted">{creator.bio}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section id="trending" className="mx-auto max-w-6xl px-5 py-16">
          <h2 className="text-3xl font-bold">Trending community clips</h2>
          <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {tutorials.slice(0, 8).map((clip) => <TutorialCard key={clip.id} tutorial={clip} />)}
          </div>
        </section>

        <section className="mx-auto max-w-4xl px-5 py-24 text-center">
          <h2 className="text-3xl font-bold md:text-4xl">Your next useful clip is waiting.</h2>
          <p className="mt-3 text-muted">Pick the games you play and build a feed that helps you improve.</p>
          <Link href="/onboarding" className="mt-7 inline-block"><Button size="lg">Build my feed</Button></Link>
        </section>
      </main>

      <footer className="border-t border-border py-8 text-center text-sm text-muted">
        EZTips · Learn your games, one clip at a time
      </footer>
    </div>
  );
}

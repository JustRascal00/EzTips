"use client";

import { Logo } from "@/components/Logo";
import { GameCard, PathCard, TutorialCard } from "@/components/cards";
import { Button, RankBadge, VerifiedMark } from "@/components/ui";
import { creators } from "@/data/creators";
import { games } from "@/data/games";
import { learningPaths } from "@/data/paths";
import { tutorials } from "@/data/tutorials";
import { useApp } from "@/lib/store";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

function FeedPreview() {
  const t = tutorials[0];
  return (
    <div className="relative w-full max-w-[420px] mx-auto">
      <div className="absolute -inset-4 rounded-[28px] border border-border bg-elevated" />
      <div className="relative overflow-hidden rounded-2xl border border-border aspect-[9/16] max-h-[560px]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={t.thumbnail} alt="" className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
        <div className="absolute top-4 left-4 right-4">
          <div className="text-[11px] font-medium text-white/75">
            League of Legends · Mid Lane · Intermediate
          </div>
          <div className="font-bold text-xl mt-1 leading-tight">{t.title}</div>
        </div>
        <div className="absolute bottom-4 left-4 right-4 space-y-2">
          <div className="rounded-xl border border-white/10 bg-black/50 p-3">
            <div className="text-[11px] uppercase tracking-wider text-white/60">You&apos;ll learn</div>
            <p className="text-sm mt-1">{t.learn}</p>
          </div>
          <div className="text-sm font-medium text-[#43D17A]">94% found this helpful</div>
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
    if (hydrated) {
      if (isLoggedIn) router.replace("/home");
      else setReady(true);
    }
  }, [hydrated, isLoggedIn, router]);

  if (!ready) return <div className="min-h-screen bg-bg" />;

  return (
    <div className="min-h-screen bg-bg">
      <header className="sticky top-0 z-40 border-b border-border bg-bg/80 backdrop-blur">
        <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between">
          <Logo />
          <nav className="hidden md:flex items-center gap-6 text-sm text-muted">
            <a href="#games" className="hover:text-text">
              Games
            </a>
            <a href="#creators" className="hover:text-text">
              Creators
            </a>
            <a href="#paths" className="hover:text-text">
              Paths
            </a>
            <a href="#trending" className="hover:text-text">
              Explore
            </a>
          </nav>
          <div className="flex items-center gap-2">
            <Link href="/onboarding">
              <Button>Start Learning</Button>
            </Link>
          </div>
        </div>
      </header>

      <section className="max-w-6xl mx-auto px-5 py-16 md:py-24 grid md:grid-cols-2 gap-12 items-center">
        <div>
          <p className="text-sm text-muted font-medium">Short-form coaching for ranked players</p>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mt-3 leading-[1.1]">
            Get better at the games you play.
          </h1>
          <p className="text-muted text-lg mt-4 max-w-md leading-relaxed">
            Short tutorials from skilled players. Find the exact tip you need, learn new mechanics,
            and improve one minute at a time.
          </p>
          <div className="flex flex-wrap gap-3 mt-8">
            <Link href="/onboarding">
              <Button size="lg">Start Learning</Button>
            </Link>
            <Link href="#trending">
              <Button size="lg" variant="secondary">
                Explore Tutorials
              </Button>
            </Link>
          </div>
          <div className="flex gap-8 mt-10 text-sm">
            <div>
              <div className="text-xl font-semibold">8 games</div>
              <div className="text-muted">Dedicated hubs</div>
            </div>
            <div>
              <div className="text-xl font-semibold">30–70s</div>
              <div className="text-muted">Typical tutorial</div>
            </div>
            <div>
              <div className="text-xl font-semibold">Helpful</div>
              <div className="text-muted">Not just likes</div>
            </div>
          </div>
        </div>
        <FeedPreview />
      </section>

      <section id="games" className="max-w-6xl mx-auto px-5 py-16">
        <h2 className="text-2xl font-bold">Pick your game</h2>
        <p className="text-muted mt-1">Every title gets its own hub — roles, characters, paths.</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
          {games.map((g) => (
            <GameCard key={g.id} game={g} href="/onboarding" />
          ))}
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-5 py-16 grid md:grid-cols-2 gap-10 items-center">
        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted">A minute, not a course</div>
          <h3 className="text-xl font-bold mt-2">Stop making this roaming mistake</h3>
          <p className="text-sm text-muted mt-2">League of Legends · Mid Lane · Intermediate · 54s</p>
          <div className="mt-4 rounded-xl border border-border bg-elevated p-4 text-sm">
            You&apos;ll learn: how to recognize when leaving your lane actually gives the opponent an
            advantage.
          </div>
        </div>
        <div>
          <h2 className="text-2xl font-bold">Learn in minutes, not hours</h2>
          <p className="text-muted mt-3 leading-relaxed">
            Each tutorial is one decision, one mechanic, one mistake. Watch it between queues. Save
            it. Then follow a path when you want the full picture — not a two-hour VOD dump.
          </p>
        </div>
      </section>

      <section id="creators" className="max-w-6xl mx-auto px-5 py-16">
        <h2 className="text-2xl font-bold">Learn from players who know the game</h2>
        <p className="text-muted mt-1">Ranks and coaching credentials, not vanity badges.</p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-6">
          {creators.slice(0, 6).map((c) => (
            <div key={c.id} className="rounded-2xl border border-border bg-card p-4 flex gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={c.avatar} alt="" className="h-12 w-12 rounded-full border border-border" />
              <div>
                <div className="flex items-center gap-1 font-semibold">
                  {c.displayName}
                  {c.verified && <VerifiedMark />}
                </div>
                <div className="mt-1">
                  <RankBadge label={c.credential.label} type={c.credential.type} />
                </div>
                <p className="text-xs text-muted mt-2 line-clamp-2">{c.bio}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section id="paths" className="max-w-6xl mx-auto px-5 py-16">
        <h2 className="text-2xl font-bold">From random tips to real improvement</h2>
        <p className="text-muted mt-1">
          Discovery gets you the clip. Paths turn it into a sequence you can finish.
        </p>
        <div className="grid md:grid-cols-3 gap-4 mt-6">
          {learningPaths.slice(0, 3).map((p) => (
            <PathCard key={p.id} path={p} />
          ))}
        </div>
      </section>

      <section id="trending" className="max-w-6xl mx-auto px-5 py-16">
        <h2 className="text-2xl font-bold">Trending tutorials</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
          {tutorials.slice(0, 8).map((t) => (
            <TutorialCard key={t.id} tutorial={t} />
          ))}
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-5 py-20 text-center">
        <h2 className="text-3xl font-bold">Ready to climb with intent?</h2>
        <p className="text-muted mt-2">Pick your games. Tell us what you want to improve. We&apos;ll build the feed.</p>
        <Link href="/onboarding" className="inline-block mt-6">
          <Button size="lg">Build my feed</Button>
        </Link>
      </section>

      <footer className="border-t border-border py-8 text-center text-sm text-muted">
        EZTips · Get better at the games you play
      </footer>
    </div>
  );
}

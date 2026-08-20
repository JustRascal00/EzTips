"use client";

import { PathCard, TutorialCard } from "@/components/cards";
import { AppShell } from "@/components/layout/AppShell";
import { RightRail, RailSection } from "@/components/layout/Sidebar";
import { Button, Tabs } from "@/components/ui";
import { getGame } from "@/data/games";
import { pathsByGame } from "@/data/paths";
import { tutorialsByGame } from "@/data/tutorials";
import { formatCount } from "@/lib/format";
import { useApp } from "@/lib/store";
import Link from "next/link";
import { useState } from "react";
import { notFound, useParams } from "next/navigation";

export default function GameHubPage() {
  const { slug } = useParams<{ slug: string }>();
  const game = getGame(slug);
  const { followedGames, toggleFollowGame } = useApp();
  const [tab, setTab] = useState("overview");

  if (!game) return notFound();

  const tuts = tutorialsByGame(game.id);
  const paths = pathsByGame(game.id);
  const following = followedGames.includes(game.id);

  return (
    <AppShell
      publicPage
      right={
        <RightRail>
          <RailSection title="On this hub">
            <p className="text-sm text-muted leading-relaxed">
              Treat this like a school for {game.name} — roles, characters, then a path if you want
              structure.
            </p>
          </RailSection>
          <RailSection title="Trending tutorials">
            <div className="space-y-2">
              {tuts.slice(0, 4).map((t) => (
                <Link key={t.id} href={`/t/${t.slug}`} className="block text-sm hover:text-white text-muted">
                  {t.title}
                </Link>
              ))}
            </div>
          </RailSection>
        </RightRail>
      }
    >
      <div className="relative h-56 md:h-72 overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={game.banner} alt="" className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/50 to-transparent" />
        <div className="absolute bottom-6 left-6 right-6 flex items-end justify-between gap-4">
          <div className="flex items-center gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={game.icon} alt="" className="h-16 w-16 rounded-2xl border border-border object-cover" />
            <div>
              <h1 className="text-3xl font-bold">{game.name}</h1>
              <p className="text-sm text-muted">{formatCount(game.learners)} learners</p>
            </div>
          </div>
          <Button variant={following ? "secondary" : "primary"} onClick={() => toggleFollowGame(game.id)}>
            {following ? "Following" : "Follow Game"}
          </Button>
        </div>
      </div>

      <div className="px-6">
        <Tabs
          tabs={[
            { id: "overview", label: "Overview" },
            { id: "champions", label: game.id === "valorant" ? "Agents" : "Champions" },
            { id: "roles", label: "Roles" },
            { id: "guides", label: "Guides" },
            { id: "paths", label: "Learning Paths" },
          ]}
          value={tab}
          onChange={setTab}
        />

        {tab === "overview" && (
          <div className="py-8 space-y-10">
            <section>
              <h2 className="text-lg font-semibold mb-3">Learn by Role</h2>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                {game.roles.map((r) => (
                  <Link
                    key={r.id}
                    href={`/search?q=${encodeURIComponent(r.name + " " + game.name)}`}
                    className="rounded-2xl border border-border bg-card p-4 font-semibold hover:bg-hover transition-colors duration-200"
                  >
                    {r.name}
                  </Link>
                ))}
              </div>
            </section>
            {game.characters.length > 0 && (
              <section>
                <h2 className="text-lg font-semibold mb-3">
                  Popular {game.id === "valorant" ? "Agents" : "Champions"}
                </h2>
                <div className="flex gap-3 overflow-x-auto pb-2">
                  {game.characters.map((ch) => (
                    <Link
                      key={ch.id}
                      href={`/search?q=${encodeURIComponent(ch.name)}`}
                      className="shrink-0 w-28 text-center"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={ch.image}
                        alt={ch.name}
                        className="h-28 w-28 rounded-2xl object-cover border border-border"
                      />
                      <div className="text-sm font-medium mt-2">{ch.name}</div>
                      <div className="text-[11px] text-muted">{ch.role}</div>
                    </Link>
                  ))}
                </div>
              </section>
            )}
            <section>
              <h2 className="text-lg font-semibold mb-3">Trending Tutorials</h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {tuts.map((t) => (
                  <TutorialCard key={t.id} tutorial={t} />
                ))}
              </div>
            </section>
            <section>
              <h2 className="text-lg font-semibold mb-3">Popular Learning Paths</h2>
              <div className="grid md:grid-cols-3 gap-4">
                {paths.map((p) => (
                  <PathCard key={p.id} path={p} />
                ))}
              </div>
            </section>
          </div>
        )}

        {tab === "champions" && (
          <div className="py-8">
            {game.characters.length === 0 ? (
              <p className="text-muted">Character pages for {game.name} are coming. Browse roles and guides for now.</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-4">
                {game.characters.map((ch) => (
                  <Link key={ch.id} href={`/search?q=${encodeURIComponent(ch.name)}`} className="text-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={ch.image} alt="" className="h-32 w-full rounded-2xl object-cover border border-border" />
                    <div className="font-medium mt-2">{ch.name}</div>
                    <div className="text-xs text-muted">{ch.role}</div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === "roles" && (
          <div className="py-8 grid md:grid-cols-2 gap-3">
            {game.roles.map((r) => (
              <Link
                key={r.id}
                href={`/search?q=${encodeURIComponent(r.name)}`}
                className="rounded-2xl border border-border bg-card p-5 hover:bg-hover"
              >
                <div className="font-semibold text-lg">{r.name}</div>
                <p className="text-sm text-muted mt-1">
                  Tutorials, matchups, and paths tagged for {r.name.toLowerCase()} on {game.name}.
                </p>
              </Link>
            ))}
          </div>
        )}

        {tab === "guides" && (
          <div className="py-8 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {tuts.map((t) => (
              <TutorialCard key={t.id} tutorial={t} />
            ))}
          </div>
        )}

        {tab === "paths" && (
          <div className="py-8 grid md:grid-cols-3 gap-4">
            {paths.map((p) => (
              <PathCard key={p.id} path={p} />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}

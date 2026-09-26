"use client";

import { BuildsTab } from "@/components/builds";
import { CoachChat } from "@/components/coach/CoachChat";
import { AppShell } from "@/components/layout/AppShell";
import { ChampionIcon, ChampionPicker, TipGrid } from "@/components/league";
import { buttonClass, EmptyState, Segmented, Tabs } from "@/components/ui";
import { championSplashUrl } from "@/lib/ddragon/shared";
import { ROLES } from "@/lib/league";
import { listTips, searchTips } from "@/lib/tips";
import type { Tutorial } from "@/lib/types";
import { useCurrentPatch, useSupabaseQuery } from "@/lib/use-tips";
import { Sparkles, Swords, Upload, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

type Champion = { id: string; name: string; title: string; tags: string[] };

export function ChampionView({ champion }: { champion: Champion }) {
  const { patch } = useCurrentPatch();
  const [tab, setTab] = useState("tips");
  // allow deep links like /champions/Ahri#builds
  useEffect(() => {
    const hash = window.location.hash.replace("#", "");
    if (["tips", "builds", "matchups", "coach"].includes(hash)) queueMicrotask(() => setTab(hash));
  }, []);
  const [sort, setSort] = useState<"top" | "new">("top");
  const [role, setRole] = useState("all");
  const [opponent, setOpponent] = useState<{ id: string; name: string } | null>(null);
  const [picking, setPicking] = useState(false);

  const { data: tips, loading } = useSupabaseQuery(
    `champ:${champion.id}:${sort}:${role}`,
    (c) => listTips(c, { championId: champion.id, sort, roleId: role === "all" ? undefined : role, limit: 60 }),
    [] as Tutorial[],
  );
  const { data: matchupTips, loading: matchupLoading } = useSupabaseQuery(
    `champ-vs:${champion.id}:${opponent?.id ?? ""}`,
    (c) => (opponent ? searchTips(c, opponent.name, { championId: champion.id, limit: 30 }) : Promise.resolve([])),
    [] as Tutorial[],
  );

  return (
    <AppShell publicPage>
      {/* ── Header ─────────────────────────────────── */}
      <section className="relative -mx-4 overflow-hidden sm:mx-0 sm:mt-6 sm:rounded-3xl sm:border sm:border-white/[0.06]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={championSplashUrl(champion.id)} alt="" className="absolute inset-0 h-full w-full object-cover object-[center_18%]" />
        <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/75 to-bg/10" />
        <div className="absolute inset-0 bg-gradient-to-r from-bg/90 via-bg/30 to-transparent" />
        <div className="relative flex min-h-[260px] flex-col justify-end gap-5 p-5 pt-24 sm:min-h-[320px] sm:flex-row sm:items-end sm:justify-between sm:p-8">
          <div className="flex items-end gap-4">
            <ChampionIcon id={champion.id} size={88} className="rounded-2xl border-2 border-white/10 shadow-2xl" />
            <div>
              <div className="flex flex-wrap gap-1.5">
                {champion.tags.map((t) => <span key={t} className="rounded-md bg-white/10 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-white/80 backdrop-blur">{t}</span>)}
                {patch && <span className="rounded-md bg-accent/85 px-2 py-0.5 text-[11px] font-bold text-white">Patch {patch}</span>}
              </div>
              <h1 className="display mt-2 text-5xl font-extrabold leading-none sm:text-6xl">{champion.name}</h1>
              <p className="mt-1 text-sm capitalize text-white/60">{champion.title}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => setTab("coach")} className={buttonClass("primary", "md")}><Sparkles className="h-4 w-4" />Ask the coach</button>
            <Link href="/studio/upload" className={buttonClass("secondary", "md")}><Upload className="h-4 w-4" />Add a tip</Link>
          </div>
        </div>
      </section>

      {/* ── Tabs ───────────────────────────────────── */}
      <div className="sticky top-14 z-30 -mx-4 mt-2 bg-bg/90 px-4 backdrop-blur-xl sm:mx-0 sm:px-0">
        <Tabs
          value={tab}
          onChange={setTab}
          tabs={[
            { id: "tips", label: "Tips", count: loading ? undefined : tips.length },
            { id: "builds", label: "Builds" },
            { id: "matchups", label: "Matchups" },
            { id: "coach", label: <span className="inline-flex items-center gap-1.5"><Sparkles className="h-3.5 w-3.5 text-accent" />Coach</span> },
          ]}
        />
      </div>

      <div className="mt-6">
        {tab === "tips" && (
          <>
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <Segmented value={sort} onChange={setSort} options={[{ id: "top", label: "Top" }, { id: "new", label: "New" }]} />
              <Segmented value={role} onChange={setRole} className="no-scrollbar max-w-full overflow-x-auto" options={[{ id: "all", label: "Any role" }, ...ROLES.map((r) => ({ id: r.id, label: r.label }))]} />
            </div>
            <TipGrid
              tips={tips}
              loading={loading}
              empty={<EmptyState title={`No ${champion.name} tips yet`} body="Be the first: upload a short clip (60 seconds max) that shows one thing that works." action={<Link href="/studio/upload" className={buttonClass("primary", "md")}><Upload className="h-4 w-4" />Upload a tip</Link>} />}
            />
          </>
        )}

        {tab === "builds" && <BuildsTab championId={champion.id} championName={champion.name} onAskCoach={() => setTab("coach")} />}

        {tab === "matchups" && (
          <div>
            <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-white/[0.06] bg-panel p-4">
              <ChampionIcon id={champion.id} size={56} />
              <Swords className="h-5 w-5 text-muted" />
              {opponent ? (
                <div className="flex items-center gap-3">
                  <button type="button" onClick={() => setPicking(true)}><ChampionIcon id={opponent.id} size={56} ring /></button>
                  <div>
                    <div className="display text-2xl font-bold">{champion.name} vs {opponent.name}</div>
                    <button type="button" onClick={() => setOpponent(null)} className="mt-0.5 inline-flex items-center gap-1 text-xs font-semibold text-muted hover:text-white"><X className="h-3 w-3" />Clear</button>
                  </div>
                </div>
              ) : (
                <button type="button" onClick={() => setPicking(true)} className={buttonClass("outline", "md")}>Pick the enemy laner</button>
              )}
            </div>
            <div className="mt-6">
              {opponent ? (
                <TipGrid
                  tips={matchupTips}
                  loading={matchupLoading}
                  empty={<EmptyState title={`No ${champion.name} vs ${opponent.name} tips yet`} body="Ask the coach for lane tips and power spikes in this matchup." action={<button type="button" onClick={() => setTab("coach")} className={buttonClass("primary", "md")}><Sparkles className="h-4 w-4" />Ask about this matchup</button>} />}
                />
              ) : (
                <p className="text-sm text-muted">Pick an opponent to see tips for this matchup.</p>
              )}
            </div>
            <ChampionPicker open={picking} onClose={() => setPicking(false)} disabledIds={[champion.id]} title="Enemy laner" onPick={(c) => { setOpponent({ id: c.id, name: c.name }); setPicking(false); }} />
          </div>
        )}

        {tab === "coach" && (
          <CoachChat
            className="max-w-3xl"
            suggestions={[
              opponent ? `How do I play ${champion.name} into ${opponent.name}? Give lane tips and power spikes.` : `What's the standard ${champion.name} build this patch, and when do I change it?`,
              `What are ${champion.name}'s power spikes?`,
              `Which champions counter ${champion.name}, and how do I play around them?`,
            ]}
          />
        )}
      </div>
    </AppShell>
  );
}

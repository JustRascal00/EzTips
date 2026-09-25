"use client";

import { AppShell } from "@/components/layout/AppShell";
import { ChampionIcon, ClassFilter, filterChampions, TipRail } from "@/components/league";
import { buttonClass, Segmented } from "@/components/ui";
import { cn } from "@/lib/cn";
import { championSplashUrl } from "@/lib/ddragon/shared";
import { useApp } from "@/lib/store";
import { championTipCounts, listTips } from "@/lib/tips";
import type { Tutorial } from "@/lib/types";
import { useChampions, useCurrentPatch, useSupabaseQuery } from "@/lib/use-tips";
import { ArrowRight, Plus, Search, Sparkles } from "lucide-react";
import Link from "next/link";
import { useMemo, useRef, useState } from "react";

export default function ChampionHub() {
  const { isLoggedIn } = useApp();
  const { patch } = useCurrentPatch();
  const { data: champions, loading: champsLoading } = useChampions();
  const { data: counts } = useSupabaseQuery("hub-counts", championTipCounts, {} as Record<string, number>);
  const { data: topTips, loading: topLoading } = useSupabaseQuery("hub-top", (c) => listTips(c, { sort: "top", limit: 14 }), [] as Tutorial[]);
  const { data: newTips, loading: newLoading } = useSupabaseQuery("hub-new", (c) => listTips(c, { sort: "new", limit: 14 }), [] as Tutorial[]);
  const [query, setQuery] = useState("");
  const [cls, setCls] = useState("all");
  const [sort, setSort] = useState<"az" | "tips">("az");
  const gridRef = useRef<HTMLDivElement>(null);

  const list = useMemo(() => {
    const filtered = filterChampions(champions, query, cls);
    return sort === "tips" ? [...filtered].sort((a, b) => (counts[b.id] ?? 0) - (counts[a.id] ?? 0) || a.name.localeCompare(b.name)) : filtered;
  }, [champions, query, cls, sort, counts]);
  const totalTips = Object.values(counts).reduce((a, b) => a + b, 0);
  const heroChampion = topTips[0]?.championId ?? "Ahri";

  return (
    <AppShell publicPage>
      {/* ── Hero ─────────────────────────────────────── */}
      <section className="relative mt-4 overflow-hidden rounded-3xl border border-white/[0.06] sm:mt-6">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={championSplashUrl(heroChampion)} alt="" className="absolute inset-0 h-full w-full object-cover object-[center_20%] opacity-40" />
        <div className="absolute inset-0 bg-gradient-to-r from-bg via-bg/90 to-bg/40" />
        <div className="absolute inset-0 bg-grid opacity-60 mask-fade-b" />
        <div className="relative grid gap-8 p-6 sm:p-10 lg:grid-cols-[1fr_360px] lg:items-center">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs font-bold text-accent">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent shadow-[0_0_10px_#7657ff]" />
              Patch {patch ?? "…"} · live
            </span>
            <h1 className="display mt-4 max-w-2xl text-[44px] font-extrabold leading-[0.95] sm:text-6xl">
              Get better at <span className="text-accent">your</span> champion.
            </h1>
            <p className="mt-4 max-w-xl text-[15px] leading-7 text-white/65">
              Short tips from real players, builds and matchups, all checked against the current patch. Outdated tricks sink, the ones that still work rise.
            </p>
            <label className="relative mt-6 block max-w-xl">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={() => gridRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
                placeholder="Which champion do you play?"
                className="h-14 w-full rounded-2xl border border-white/[0.1] bg-bg/80 pl-12 pr-4 text-base font-medium shadow-2xl shadow-black/50 outline-none backdrop-blur transition-colors placeholder:text-muted focus:border-accent/70"
              />
            </label>
            <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted">
              <span><b className="tabular text-white">{champions.length || "…"}</b> champions</span>
              <span><b className="tabular text-white">{totalTips}</b> tips</span>
              <span><b className="text-white">AI coach</b> for drafts</span>
            </div>
          </div>

          <Link href="/coach" className="group hidden rounded-2xl border border-white/[0.08] bg-panel/80 p-5 backdrop-blur transition-colors hover:border-accent/50 lg:block">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-accent"><Sparkles className="h-4 w-4" />Draft coach</div>
            <div className="display mt-2 text-2xl font-bold leading-tight">In champ select?<br />Get a build for this exact comp.</div>
            <div className="mt-4 flex gap-2">
              {Array.from({ length: 5 }, (_, i) => (
                <span key={i} className="grid h-11 w-11 place-items-center rounded-xl border border-dashed border-white/15 text-muted"><Plus className="h-4 w-4" /></span>
              ))}
            </div>
            <div className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-white">Open the draft board<ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></div>
          </Link>
        </div>
      </section>

      {!isLoggedIn && (
        <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-white/[0.06] bg-panel p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted"><b className="text-white">Free account:</b> vote on tips, save them, follow creators and use the coach.</p>
          <Link href="/auth?mode=signup" className={buttonClass("primary", "sm")}>Create account</Link>
        </div>
      )}

      {/* ── Rails ────────────────────────────────────── */}
      <div className="mt-10 space-y-10">
        <TipRail title={`Top tips on ${patch ?? "this patch"}`} subtitle="Ranked by votes and whether they still work." href="/explore" tips={topTips} loading={topLoading} />
        <TipRail title="Fresh uploads" href="/explore" tips={newTips} loading={newLoading} />
      </div>

      {/* ── Champion grid ───────────────────────────── */}
      <section ref={gridRef} className="mt-12 scroll-mt-20">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="display text-3xl font-bold">All champions</h2>
            <p className="mt-0.5 text-sm text-muted">Pick one to see its tips, builds and matchups.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <ClassFilter value={cls} onChange={setCls} />
            <Segmented value={sort} onChange={setSort} options={[{ id: "az", label: "A–Z" }, { id: "tips", label: "Most tips" }]} />
          </div>
        </div>
        {query && <p className="mt-3 text-sm text-muted">{list.length} {list.length === 1 ? "match" : "matches"} for “{query}” <button type="button" onClick={() => setQuery("")} className="ml-1 font-semibold text-accent">Clear</button></p>}
        <div className="mt-5 grid grid-cols-4 gap-2 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 xl:grid-cols-12">
          {champsLoading && champions.length === 0
            ? Array.from({ length: 36 }, (_, i) => <div key={i} className="shimmer aspect-square rounded-xl" />)
            : list.map((c) => {
                const n = counts[c.id] ?? 0;
                return (
                  <Link key={c.id} href={`/champions/${c.id}`} className="group flex flex-col items-center gap-1.5 rounded-xl p-1.5 transition-colors hover:bg-white/[0.05]">
                    <div className="relative w-full">
                      <ChampionIcon id={c.id} fluid className={cn("aspect-square h-auto w-full transition group-hover:scale-[1.04]", n > 0 ? "" : "opacity-80 grayscale-[35%] group-hover:grayscale-0 group-hover:opacity-100")} />
                      {n > 0 && <span className="absolute -right-1 -top-1 rounded-md bg-accent px-1.5 text-[10px] font-bold tabular text-white shadow-lg">{n}</span>}
                    </div>
                    <span className="w-full truncate text-center text-xs font-semibold text-muted group-hover:text-white">{c.name}</span>
                  </Link>
                );
              })}
        </div>
      </section>
    </AppShell>
  );
}

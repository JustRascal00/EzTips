"use client";

import { PatchBadge, StillWorksControl, VoteControl } from "@/components/actions";
import { buttonClass, EmptyState, Segmented } from "@/components/ui";
import { deleteBuild, listBuilds, setRecommended, skillPriority, usePatchData, type Build } from "@/lib/builds";
import type { BuildItem, BuildRuneTree, PatchData } from "@/lib/builds-data";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/cn";
import { itemIconUrl, runeIconUrl, spellIconUrl } from "@/lib/ddragon/shared";
import { formatTimeAgo } from "@/lib/format";
import { ROLE_LABEL, ROLES } from "@/lib/league";
import { useApp } from "@/lib/store";
import { createClient } from "@/lib/supabase/client";
import { useSupabaseQuery } from "@/lib/use-tips";
import { ChevronDown, ChevronRight, Crown, Hammer, Pencil, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState, type ReactNode } from "react";

// ── icons ────────────────────────────────────────────────────────

/** Full item info: name, cost, stats, passive/active text. */
export function ItemDetails({ item, version, className }: { item: BuildItem; version: string; className?: string }) {
  return (
    <div className={cn("text-left", className)}>
      <div className="flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={itemIconUrl(version, item.id)} alt="" className="h-12 w-12 shrink-0 rounded-xl border border-white/10" />
        <div className="min-w-0">
          <div className="truncate text-[15px] font-bold text-white">{item.name}</div>
          <div className="text-xs font-semibold text-amber-300">{item.gold} gold</div>
        </div>
      </div>
      {item.stats.length > 0 && (
        <ul className="mt-3 space-y-0.5">
          {item.stats.map((s) => <li key={s} className="text-[13px] font-semibold text-success">+ {s}</li>)}
        </ul>
      )}
      {item.effect && (
        <div className="mt-3 space-y-1.5 text-[13px] leading-5 text-white/75">
          {item.effect.split("\n").map((line, i) => (
            <p key={i}>{line.split("§").map((part, j) => (j % 2 === 1 ? <b key={j} className="text-accent">{part}</b> : part))}</p>
          ))}
        </div>
      )}
      {!item.effect && item.plaintext && <p className="mt-3 text-[13px] text-white/70">{item.plaintext}</p>}
    </div>
  );
}

/** Item icon with a hover card showing what the item does. */
export function ItemIcon({ id, data, size = 36, className, noTooltip }: { id: string; data: PatchData | null; size?: number; className?: string; noTooltip?: boolean }) {
  const item = data?.items.find((i) => i.id === id);
  return (
    <span className={cn("group/item relative inline-block shrink-0", className)} style={{ width: size, height: size }}>
      <span className={cn("block h-full w-full overflow-hidden rounded-lg border border-white/10 bg-card", !item && data && "opacity-40")} title={!item && data ? "Item not in the current patch" : undefined}>
        {data && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={itemIconUrl(data.version, id)} alt={item?.name ?? ""} className="h-full w-full object-cover" loading="lazy" />
        )}
      </span>
      {item && data && !noTooltip && (
        <span className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 hidden w-72 -translate-x-1/2 rounded-2xl border border-white/[0.1] bg-panel p-3.5 shadow-2xl shadow-black/70 group-hover/item:block">
          <ItemDetails item={item} version={data.version} />
        </span>
      )}
    </span>
  );
}

export function RuneIcon({ icon, name, size = 28, className, dim }: { icon: string; name: string; size?: number; className?: string; dim?: boolean }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={runeIconUrl(icon)} alt={name} title={name} width={size} height={size} className={cn("shrink-0", dim && "opacity-30 grayscale", className)} style={{ width: size, height: size }} />
  );
}

export function SpellIcon({ id, data, size = 32 }: { id: string; data: PatchData | null; size?: number }) {
  const spell = data?.spells.find((s) => s.id === id);
  if (!spell || !data) return <span className="inline-block shrink-0 rounded-lg bg-card" style={{ width: size, height: size }} />;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={spellIconUrl(data.version, spell.image)} alt={spell.name} title={spell.name} className="shrink-0 rounded-lg border border-white/10" style={{ width: size, height: size }} />
  );
}

const findRune = (trees: BuildRuneTree[], id: number | null) => {
  for (const t of trees) for (const row of t.slots) for (const r of row) if (r.id === id) return r;
  return null;
};

function Label({ children }: { children: ReactNode }) {
  return <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-muted">{children}</div>;
}

// ── build card ───────────────────────────────────────────────────

export function BuildCard({ build, data, onChanged }: { build: Build; data: PatchData | null; onChanged: () => void }) {
  const { profile } = useAuth();
  const { currentUser, isLoggedIn, toast } = useApp();
  const [open, setOpen] = useState(build.isRecommended);
  const [busy, setBusy] = useState(false);
  const isModerator = profile?.role === "moderator" || profile?.role === "admin";
  const isMine = isLoggedIn && currentUser.id === build.authorId;
  const trees = data?.runeTrees ?? [];
  const primary = trees.find((t) => t.id === build.runes.primary);
  const secondary = trees.find((t) => t.id === build.runes.secondary);
  const keystone = findRune(trees, build.runes.keystone);
  const priority = skillPriority(build.skillOrder);

  async function act(fn: () => Promise<void>, done: string) {
    setBusy(true);
    try { await fn(); toast(done); onChanged(); } catch (e) { toast(e instanceof Error ? e.message : "Failed"); } finally { setBusy(false); }
  }

  return (
    <article className={cn("rounded-2xl border bg-panel", build.isRecommended ? "border-accent/40 shadow-[0_0_0_1px_rgba(118,87,255,0.15),0_20px_60px_-30px_rgba(118,87,255,0.6)]" : "border-white/[0.06]")}>
      <div className="flex flex-wrap items-start gap-3 p-4 sm:p-5">
        <VoteControl target="build" tipId={build.id} ownerId={build.authorId ?? undefined} initial={{ upvotes: build.upvotes, downvotes: build.downvotes, score: build.score }} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            {build.isRecommended && <span className="inline-flex items-center gap-1 rounded-md bg-accent px-1.5 py-0.5 text-[11px] font-bold text-white"><Crown className="h-3 w-3" />Recommended</span>}
            <span className="rounded-md bg-white/[0.06] px-1.5 py-0.5 text-[11px] font-bold text-white/80">{ROLE_LABEL[build.roleId]}</span>
            {build.mapId === "aram" && <span className="rounded-md bg-white/[0.06] px-1.5 py-0.5 text-[11px] font-bold text-white/80">ARAM</span>}
            <PatchBadge patch={build.patch} current={build.patchIsCurrent} outdated={build.outdated} />
            {typeof build.worksPct === "number" && <span className={cn("text-[11px] font-bold", build.worksPct >= 50 ? "text-success" : "text-amber-300")}>{build.worksPct}% works</span>}
          </div>
          <h3 className="mt-1.5 truncate text-lg font-bold">{build.title}</h3>
          <div className="text-xs text-muted">{build.authorUsername ? <>by <Link href={`/u/${build.authorUsername}`} className="hover:text-white">@{build.authorUsername}</Link></> : "EZTips"} · updated {formatTimeAgo(build.updatedAt)}</div>
        </div>

        {/* summary: keystone, spells, core items */}
        <div className="flex w-full items-center gap-3 sm:w-auto">
          {keystone && <RuneIcon icon={keystone.icon} name={keystone.name} size={40} />}
          <div className="flex gap-1">{build.spells.map((s) => <SpellIcon key={s} id={s} data={data} size={28} />)}</div>
          <div className="flex items-center gap-1">{build.items.slice(0, 4).map((id) => <ItemIcon key={id} id={id} data={data} size={32} />)}</div>
          <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} aria-label={open ? "Collapse build" : "Expand build"} className="ml-auto grid h-9 w-9 place-items-center rounded-lg text-muted hover:bg-white/[0.06] hover:text-white">
            <ChevronDown className={cn("h-5 w-5 transition-transform", open && "rotate-180")} />
          </button>
        </div>
      </div>

      {open && (
        <div className="space-y-5 border-t border-white/[0.05] p-4 sm:p-5">
          <div>
            <Label>Items</Label>
            <div className="flex flex-wrap items-center gap-2">
              {build.startingItems.length > 0 && (
                <>
                  <div className="flex gap-1 rounded-xl bg-white/[0.03] p-1.5">{build.startingItems.map((id, i) => <ItemIcon key={`${id}-${i}`} id={id} data={data} size={34} />)}</div>
                  <ChevronRight className="h-4 w-4 text-muted" />
                </>
              )}
              {build.items.map((id, i) => (
                <span key={`${id}-${i}`} className="flex items-center gap-2">
                  <span className="relative"><ItemIcon id={id} data={data} size={44} /><span className="absolute -bottom-1 -right-1 grid h-4 w-4 place-items-center rounded-full bg-panel text-[9px] font-bold text-white/80">{i + 1}</span></span>
                  {i < build.items.length - 1 && <ChevronRight className="h-4 w-4 text-muted" />}
                </span>
              ))}
            </div>
            {build.situationalItems.length > 0 && (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold text-muted">Situational</span>
                {build.situationalItems.map((id, i) => <ItemIcon key={`${id}-${i}`} id={id} data={data} size={34} />)}
              </div>
            )}
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <Label>Runes</Label>
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-1.5">
                  {primary && <RuneIcon icon={primary.icon} name={primary.name} size={22} className="opacity-80" />}
                  {keystone && <RuneIcon icon={keystone.icon} name={keystone.name} size={40} />}
                  {build.runes.primaryRunes.map((id, i) => { const r = findRune(trees, id); return r ? <RuneIcon key={i} icon={r.icon} name={r.name} size={28} /> : null; })}
                </div>
                <div className="flex items-center gap-1.5">
                  {secondary && <RuneIcon icon={secondary.icon} name={secondary.name} size={22} className="opacity-80" />}
                  {build.runes.secondaryRunes.map((id, i) => { const r = findRune(trees, id); return r ? <RuneIcon key={i} icon={r.icon} name={r.name} size={28} /> : null; })}
                </div>
              </div>
            </div>
            <div>
              <Label>Skill order · {priority.join(" > ")}</Label>
              <SkillGrid order={build.skillOrder} />
            </div>
          </div>

          {build.notes && (
            <div>
              <Label>Notes</Label>
              <p className="whitespace-pre-line text-sm leading-6 text-white/80">{build.notes}</p>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.05] pt-4">
            <StillWorksControl compact target="build" tipId={build.id} patch={data?.patch ?? null} initialPct={build.worksPct} initialYes={build.worksYes} initialNo={build.worksNo} />
            <div className="flex flex-wrap gap-1.5">
              {isModerator && (
                <button type="button" disabled={busy} onClick={() => act(async () => { const c = createClient(); if (c) await setRecommended(c, build.id, !build.isRecommended); }, build.isRecommended ? "No longer recommended" : "Set as recommended build")} className={buttonClass(build.isRecommended ? "secondary" : "outline", "sm")}>
                  <Crown className="h-4 w-4" />{build.isRecommended ? "Unrecommend" : "Make recommended"}
                </button>
              )}
              {(isMine || isModerator) && <Link href={`/builds/${build.id}/edit`} className={buttonClass("secondary", "sm")}><Pencil className="h-4 w-4" />Edit</Link>}
              {isMine && (
                <button type="button" disabled={busy} onClick={() => { if (window.confirm("Delete this build?")) void act(async () => { const c = createClient(); if (c) await deleteBuild(c, build.id); }, "Build deleted"); }} className={buttonClass("ghost", "sm", "hover:text-danger")}>
                  <Trash2 className="h-4 w-4" />Delete
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </article>
  );
}

export function SkillGrid({ order, onSet }: { order: string[]; onSet?: (level: number, key: string) => void }) {
  return (
    <div className="no-scrollbar overflow-x-auto">
      <div className="inline-grid gap-[3px]" style={{ gridTemplateColumns: `20px repeat(18, minmax(20px, 1fr))` }}>
        {["Q", "W", "E", "R"].map((key) => (
          <div key={key} className="contents">
            <span className="grid h-5 place-items-center text-[10px] font-bold text-muted">{key}</span>
            {Array.from({ length: 18 }, (_, lvl) => {
              const on = order[lvl] === key;
              const Tag = onSet ? "button" : "span";
              return (
                <Tag
                  key={lvl}
                  {...(onSet ? { type: "button" as const, onClick: () => onSet(lvl, key), "aria-label": `Level ${lvl + 1}: ${key}` } : {})}
                  className={cn("grid h-5 place-items-center rounded text-[9px] font-bold tabular", on ? (key === "R" ? "bg-amber-400 text-black" : "bg-accent text-white") : "bg-white/[0.04] text-transparent", onSet && !on && "hover:bg-white/[0.12] hover:text-white/40")}
                >
                  {lvl + 1}
                </Tag>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── builds tab (champion page) ──────────────────────────────────

export function BuildsTab({ championId, championName, onAskCoach }: { championId: string; championName: string; onAskCoach: () => void }) {
  const [role, setRole] = useState("all");
  const [map, setMap] = useState<"sr" | "aram">("sr");
  const [version, setVersion] = useState(0);
  const { data: patchData } = usePatchData(map);
  const { data: builds, loading } = useSupabaseQuery(
    `builds:${championId}:${role}:${map}:${version}`,
    (c) => listBuilds(c, { championId, roleId: role === "all" ? undefined : role, mapId: map }),
    [] as Build[],
  );
  const newHref = `/builds/new?champion=${encodeURIComponent(championId)}${role !== "all" ? `&role=${role}` : ""}&map=${map}`;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Segmented value={map} onChange={setMap} options={[{ id: "sr", label: "Summoner's Rift" }, { id: "aram", label: "ARAM" }]} />
        <Segmented className="no-scrollbar max-w-full overflow-x-auto" value={role} onChange={setRole} options={[{ id: "all", label: "Any role" }, ...ROLES.map((r) => ({ id: r.id, label: r.label }))]} />
        <Link href={newHref} className={buttonClass("primary", "sm", "ml-auto")}><Plus className="h-4 w-4" />Create build</Link>
      </div>
      {loading ? (
        <div className="space-y-3">{[0, 1, 2].map((i) => <div key={i} className="shimmer h-24 rounded-2xl" />)}</div>
      ) : builds.length === 0 ? (
        <EmptyState
          title={`No ${championName} builds yet`}
          body="Share the build you actually play: items in order, runes, spells and skill order for the current patch."
          action={<div className="flex flex-wrap justify-center gap-2"><Link href={newHref} className={buttonClass("primary", "md")}><Plus className="h-4 w-4" />Create the first build</Link><button type="button" onClick={onAskCoach} className={buttonClass("secondary", "md")}><Hammer className="h-4 w-4" />Ask the coach</button></div>}
        />
      ) : (
        <div className="space-y-3">
          {builds.map((b) => <BuildCard key={b.id} build={b} data={patchData} onChanged={() => setVersion((v) => v + 1)} />)}
        </div>
      )}
    </div>
  );
}

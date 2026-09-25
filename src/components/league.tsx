"use client";

import { PatchBadge } from "@/components/actions";
import { cn } from "@/lib/cn";
import { championIconUrl, championSplashUrl } from "@/lib/ddragon/shared";
import { formatDuration } from "@/lib/format";
import { CLASSES, ROLE_LABEL } from "@/lib/league";
import type { ChampionSummary } from "@/lib/tips";
import type { Tutorial } from "@/lib/types";
import { useChampions, useCurrentPatch } from "@/lib/use-tips";
import { ChevronLeft, ChevronRight, Plus, Search, X } from "lucide-react";
import Link from "next/link";
import { useMemo, useRef, useState, type ReactNode } from "react";
import { Modal, Segmented } from "./ui";

// ── Champion icon ───────────────────────────────────────────────

export function ChampionIcon({ id, size = 40, className, ring, fluid }: { id: string; size?: number; className?: string; ring?: boolean; fluid?: boolean }) {
  const { ddragonVersion } = useCurrentPatch();
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={championIconUrl(ddragonVersion, id)}
      alt=""
      width={size}
      height={size}
      loading="lazy"
      className={cn("shrink-0 rounded-xl bg-card object-cover", ring && "ring-2 ring-accent/70 ring-offset-2 ring-offset-bg", className)}
      style={fluid ? undefined : { width: size, height: size }}
    />
  );
}

// ── Champion picker (modal) ─────────────────────────────────────

const norm = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, "");

export function filterChampions(champions: ChampionSummary[], query: string, cls: string) {
  const q = norm(query);
  return champions.filter((c) => (!q || norm(c.name).includes(q)) && (cls === "all" || c.tags.includes(cls)));
}

export function ClassFilter({ value, onChange, size }: { value: string; onChange: (v: string) => void; size?: "sm" | "md" }) {
  return (
    <Segmented
      size={size}
      className="no-scrollbar max-w-full overflow-x-auto"
      value={value}
      onChange={onChange}
      options={[{ id: "all", label: "All" }, ...CLASSES.map((c) => ({ id: c, label: c }))]}
    />
  );
}

export function ChampionPicker({
  open,
  onClose,
  onPick,
  title = "Pick a champion",
  disabledIds = [],
}: {
  open: boolean;
  onClose: () => void;
  onPick: (champion: ChampionSummary) => void;
  title?: string;
  disabledIds?: string[];
}) {
  const { data: champions } = useChampions();
  const [query, setQuery] = useState("");
  const [cls, setCls] = useState("all");
  const list = useMemo(() => filterChampions(champions, query, cls), [champions, query, cls]);

  return (
    <Modal open={open} onClose={onClose} wide>
      <div className="flex items-center justify-between gap-3">
        <h3 className="display text-2xl font-bold">{title}</h3>
        <button type="button" onClick={onClose} aria-label="Close" className="grid h-9 w-9 place-items-center rounded-lg text-muted hover:bg-white/[0.06] hover:text-white"><X className="h-5 w-5" /></button>
      </div>
      <div className="mt-4 flex flex-col gap-3">
        <label className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && list[0] && !disabledIds.includes(list[0].id)) { onPick(list[0]); setQuery(""); } }}
            placeholder="Search champions…"
            className="h-11 w-full rounded-xl border border-white/[0.08] bg-white/[0.04] pl-10 pr-3 text-sm outline-none focus:border-accent/60"
          />
        </label>
        <ClassFilter value={cls} onChange={setCls} size="sm" />
      </div>
      <div className="mt-4 grid max-h-[52dvh] grid-cols-4 gap-2 overflow-y-auto pr-1 sm:grid-cols-6 md:grid-cols-8">
        {list.map((c) => {
          const disabled = disabledIds.includes(c.id);
          return (
            <button
              key={c.id}
              type="button"
              disabled={disabled}
              onClick={() => { onPick(c); setQuery(""); }}
              className="group flex flex-col items-center gap-1 rounded-xl p-1.5 transition-colors hover:bg-white/[0.06] disabled:opacity-30"
            >
              <ChampionIcon id={c.id} size={52} className="transition-transform group-hover:scale-105" />
              <span className="w-full truncate text-center text-[11px] font-medium text-muted group-hover:text-white">{c.name}</span>
            </button>
          );
        })}
        {list.length === 0 && <p className="col-span-full py-8 text-center text-sm text-muted">No champion matches “{query}”.</p>}
      </div>
    </Modal>
  );
}

// ── Tip card (portrait, Shorts-style) ──────────────────────────

export function TipCard({ tip, className }: { tip: Tutorial; className?: string }) {
  const [hover, setHover] = useState(false);
  const thumb = tip.thumbnail || (tip.championId ? championSplashUrl(tip.championId) : "");
  return (
    <Link
      href={`/t/${tip.slug}`}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className={cn("group relative block aspect-[9/16] overflow-hidden rounded-2xl border border-white/[0.06] bg-card transition-[transform,border-color] duration-200 hover:-translate-y-0.5 hover:border-accent/40", className)}
    >
      {thumb && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={thumb} alt="" loading="lazy" className={cn("absolute inset-0 h-full w-full object-cover transition duration-300 group-hover:scale-[1.04]", hover && tip.videoUrl && "opacity-0")} />
      )}
      {hover && tip.videoUrl && <video src={tip.videoUrl} muted playsInline autoPlay loop className="absolute inset-0 h-full w-full object-cover" />}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/35 to-black/10" />

      <div className="absolute inset-x-2 top-2 flex items-start justify-between gap-1">
        <PatchBadge patch={tip.patch} current={tip.patchIsCurrent} outdated={tip.outdated} />
        <span className="rounded-md bg-black/65 px-1.5 py-0.5 text-[11px] font-semibold tabular text-white/90">{formatDuration(tip.duration)}</span>
      </div>

      <div className="absolute inset-x-0 bottom-0 p-3">
        <h3 className="line-clamp-3 text-[15px] font-bold leading-snug text-white">{tip.title}</h3>
        <div className="mt-2 flex items-center gap-2 text-[11px] font-semibold text-white/70">
          {tip.championId && <ChampionIcon id={tip.championId} size={20} className="rounded-md" />}
          <span className="truncate">{[tip.championName, tip.roleId ? ROLE_LABEL[tip.roleId] : null].filter(Boolean).join(" · ") || tip.topic}</span>
        </div>
        <div className="mt-1.5 flex items-center gap-2 text-[11px] font-semibold tabular">
          <span className={cn((tip.score ?? 0) > 0 ? "text-accent" : (tip.score ?? 0) < 0 ? "text-danger" : "text-white/60")}>▲ {tip.score ?? 0}</span>
          {typeof tip.stillWorksPct === "number" && <span className={tip.stillWorksPct >= 50 ? "text-success" : "text-amber-300"}>{tip.stillWorksPct}% works</span>}
          {tip.creatorUsername && <span className="ml-auto truncate font-medium text-white/50">@{tip.creatorUsername}</span>}
        </div>
      </div>
    </Link>
  );
}

export function TipGrid({ tips, loading, empty, className }: { tips: Tutorial[]; loading?: boolean; empty?: ReactNode; className?: string }) {
  if (loading) {
    return (
      <div className={cn("grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5", className)}>
        {Array.from({ length: 10 }, (_, i) => <div key={i} className="shimmer aspect-[9/16] rounded-2xl" />)}
      </div>
    );
  }
  if (!tips.length) return <>{empty ?? null}</>;
  return (
    <div className={cn("grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5", className)}>
      {tips.map((tip) => <TipCard key={tip.id} tip={tip} />)}
    </div>
  );
}

/** Horizontal scrolling row of tip cards with arrow buttons. */
export function TipRail({ title, subtitle, href, tips, loading }: { title: ReactNode; subtitle?: ReactNode; href?: string; tips: Tutorial[]; loading?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const scroll = (dir: 1 | -1) => ref.current?.scrollBy({ left: dir * ref.current.clientWidth * 0.85, behavior: "smooth" });
  if (!loading && tips.length === 0) return null;
  return (
    <section>
      <div className="mb-3 flex items-end justify-between gap-4">
        <div>
          <h2 className="display text-2xl font-bold">{title}</h2>
          {subtitle && <p className="mt-0.5 text-sm text-muted">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-1">
          {href && <Link href={href} className="mr-2 text-sm font-semibold text-muted hover:text-white">See all</Link>}
          <button type="button" onClick={() => scroll(-1)} aria-label="Scroll left" className="hidden h-8 w-8 place-items-center rounded-lg border border-white/[0.08] text-muted hover:text-white sm:grid"><ChevronLeft className="h-4 w-4" /></button>
          <button type="button" onClick={() => scroll(1)} aria-label="Scroll right" className="hidden h-8 w-8 place-items-center rounded-lg border border-white/[0.08] text-muted hover:text-white sm:grid"><ChevronRight className="h-4 w-4" /></button>
        </div>
      </div>
      <div ref={ref} className="no-scrollbar -mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
        {(loading ? Array.from({ length: 6 }, () => null) : tips).map((tip, i) =>
          tip ? (
            <TipCard key={tip.id} tip={tip} className="w-[42vw] shrink-0 snap-start sm:w-[190px]" />
          ) : (
            <div key={i} className="shimmer aspect-[9/16] w-[42vw] shrink-0 rounded-2xl sm:w-[190px]" />
          ),
        )}
      </div>
    </section>
  );
}

/** Empty champion slot / picked champion slot used by the draft board. */
export function ChampionSlot({ id, name, onClick, onClear, label, size = 64, highlight }: { id?: string | null; name?: string | null; onClick: () => void; onClear?: () => void; label?: string; size?: number; highlight?: boolean }) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative">
        <button
          type="button"
          onClick={onClick}
          className={cn(
            "grid place-items-center overflow-hidden rounded-2xl border transition-colors",
            id ? "border-transparent" : "border-dashed border-white/15 bg-white/[0.03] text-muted hover:border-accent/60 hover:text-accent",
            highlight && id && "ring-2 ring-accent ring-offset-2 ring-offset-bg",
          )}
          style={{ width: size, height: size }}
          aria-label={id ? `Change ${name}` : label ?? "Pick champion"}
        >
          {id ? <ChampionIcon id={id} size={size} className="rounded-2xl" /> : <Plus className="h-5 w-5" />}
        </button>
        {id && onClear && (
          <button type="button" onClick={onClear} aria-label={`Remove ${name}`} className="absolute -right-1.5 -top-1.5 grid h-5 w-5 place-items-center rounded-full border border-white/10 bg-panel text-muted hover:text-white">
            <X className="h-3 w-3" />
          </button>
        )}
      </div>
      <span className="max-w-[80px] truncate text-[11px] font-semibold text-muted">{id ? name : label}</span>
    </div>
  );
}

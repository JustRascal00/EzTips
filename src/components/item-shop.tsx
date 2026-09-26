"use client";

import { cn } from "@/lib/cn";
import type { BuildItem, PatchData } from "@/lib/builds-data";
import { itemIconUrl } from "@/lib/ddragon/shared";
import { Boxes, Check, ChevronLeft, ChevronRight, Coins, Crown, Footprints, FlaskConical, LayoutGrid, Plus, Search, Sprout, X } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";

export type ItemGroup = "starting" | "core" | "situational";

const GROUP_LABEL: Record<ItemGroup, string> = { starting: "Starting", core: "Core", situational: "Situational" };

type Category = "legendary" | "boots" | "starter" | "components" | "consumables" | "all";
const CATEGORIES: { id: Category; label: string; icon: typeof Crown; test: (i: BuildItem) => boolean }[] = [
  { id: "legendary", label: "Legendary", icon: Crown, test: (i) => i.gold >= 2000 && !i.tags.includes("Boots") },
  { id: "boots", label: "Boots", icon: Footprints, test: (i) => i.tags.includes("Boots") },
  { id: "starter", label: "Starter", icon: Sprout, test: (i) => i.gold <= 500 && i.into.length === 0 && !i.tags.includes("Consumable") },
  { id: "components", label: "Components", icon: Boxes, test: (i) => i.into.length > 0 && !i.tags.includes("Boots") },
  { id: "consumables", label: "Potions & wards", icon: FlaskConical, test: (i) => i.tags.includes("Consumable") || i.tags.includes("Trinket") },
  { id: "all", label: "All items", icon: LayoutGrid, test: () => true },
];

// ── drag & drop ──────────────────────────────────────────────────
const DND_TYPE = "application/x-eztips-item";
type DragPayload = { id: string; from?: { group: ItemGroup; index: number } };
function setDrag(e: React.DragEvent, payload: DragPayload) {
  e.dataTransfer.setData(DND_TYPE, JSON.stringify(payload));
  e.dataTransfer.setData("text/plain", payload.id);
  e.dataTransfer.effectAllowed = "move";
}
function readDrag(e: React.DragEvent): DragPayload | null {
  try { return JSON.parse(e.dataTransfer.getData(DND_TYPE)) as DragPayload; } catch { return null; }
}
const isItemDrag = (e: React.DragEvent) => e.dataTransfer.types.includes(DND_TYPE);

/** "AttackSpeed" -> "Attack Speed" */
const tagLabel = (t: string) => t.replace(/([a-z])([A-Z])/g, "$1 $2").replace("Cooldown Reduction", "Ability Haste");

function Icon({ id, version, className }: { id: string; version: string; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={itemIconUrl(version, id)} alt="" loading="lazy" className={cn("block rounded-md border border-black/40 object-cover shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]", className)} />
  );
}

/** Groups "§Name§ (0s)\ntext\ntext" into [{ name, meta, body }] blocks. */
function effectBlocks(effect: string) {
  const blocks: { name: string | null; meta: string; body: string[] }[] = [];
  for (const line of effect.split("\n")) {
    const m = line.match(/^§([^§]+)§\s*(.*)$/);
    if (m) {
      const rest = m[2].replace(/^:\s*/, "");
      const isMeta = /^\(.*\)$/.test(rest) || rest === "";
      blocks.push({ name: m[1], meta: isMeta ? rest : "", body: isMeta ? [] : [rest] });
    } else if (blocks.length) {
      blocks[blocks.length - 1].body.push(line.replace(/§/g, ""));
    } else {
      blocks.push({ name: null, meta: "", body: [line.replace(/§/g, "")] });
    }
  }
  return blocks;
}

// ── Build path (your slots) ─────────────────────────────────────

function Slot({ id, version, index, group, onRemove, onLeft, onRight, active, onDropAt }: {
  id?: string; version?: string; index?: number; group: ItemGroup; onRemove?: () => void; onLeft?: () => void; onRight?: () => void; active?: boolean;
  onDropAt?: (payload: DragPayload, index?: number) => void;
}) {
  const [over, setOver] = useState(false);
  const dropProps = onDropAt ? {
    onDragOver: (e: React.DragEvent) => { if (isItemDrag(e)) { e.preventDefault(); e.stopPropagation(); setOver(true); } },
    onDragLeave: () => setOver(false),
    onDrop: (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setOver(false); const p = readDrag(e); if (p) onDropAt(p, index); },
  } : {};
  if (!id || !version) {
    return (
      <span {...dropProps} className={cn("grid h-16 w-16 shrink-0 place-items-center rounded-xl border-2 border-dashed text-sm font-bold transition-colors", over ? "border-accent bg-accent/20 text-white" : active ? "border-accent/60 text-accent" : "border-white/10 text-white/25")}>
        {index !== undefined ? index + 1 : <Plus className="h-5 w-5" />}
      </span>
    );
  }
  return (
    <span
      {...dropProps}
      draggable
      onDragStart={(e) => setDrag(e, { id, from: index !== undefined ? { group, index } : undefined })}
      className={cn("group/slot relative shrink-0 cursor-grab rounded-xl active:cursor-grabbing", over && "ring-2 ring-accent ring-offset-2 ring-offset-bg")}
    >
      <Icon id={id} version={version} className="h-16 w-16 rounded-xl" />
      {index !== undefined && group === "core" && <span className="absolute -bottom-1.5 -left-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-accent px-1 text-[10px] font-bold text-white ring-2 ring-bg">{index + 1}</span>}
      <span className="absolute inset-0 hidden items-center justify-center gap-0.5 rounded-xl bg-black/70 group-hover/slot:flex">
        {onLeft && <button type="button" onClick={(e) => { e.stopPropagation(); onLeft(); }} aria-label="Move left" className="grid h-6 w-6 place-items-center rounded text-white hover:bg-white/20"><ChevronLeft className="h-4 w-4" /></button>}
        {onRemove && <button type="button" onClick={(e) => { e.stopPropagation(); onRemove(); }} aria-label="Remove" className="grid h-6 w-6 place-items-center rounded text-white hover:bg-danger"><X className="h-4 w-4" /></button>}
        {onRight && <button type="button" onClick={(e) => { e.stopPropagation(); onRight(); }} aria-label="Move right" className="grid h-6 w-6 place-items-center rounded text-white hover:bg-white/20"><ChevronRight className="h-4 w-4" /></button>}
      </span>
    </span>
  );
}

function GroupBox({ group, active, onActivate, children, count, limit, onDropItem }: { group: ItemGroup; active: boolean; onActivate: () => void; children: ReactNode; count: number; limit: number; onDropItem: (payload: DragPayload) => void }) {
  const [over, setOver] = useState(false);
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onActivate}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onActivate(); }}
      onDragOver={(e) => { if (isItemDrag(e)) { e.preventDefault(); setOver(true); } }}
      onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setOver(false); }}
      onDrop={(e) => { e.preventDefault(); setOver(false); const p = readDrag(e); if (p) onDropItem(p); }}
      className={cn(
        "relative min-w-0 cursor-pointer rounded-2xl border-2 p-4 transition-colors",
        over ? "border-accent bg-accent/[0.14]" : active ? "border-accent/60 bg-accent/[0.07] shadow-[0_0_30px_-12px_rgba(118,87,255,0.9)]" : "border-white/[0.06] bg-white/[0.02] hover:border-white/[0.14]",
      )}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className={cn("text-xs font-bold uppercase tracking-[0.14em]", active || over ? "text-accent" : "text-muted")}>{GROUP_LABEL[group]}</span>
        <span className="text-[11px] font-semibold tabular text-muted">{count}/{limit}</span>
      </div>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
      {over && <span className="pointer-events-none absolute inset-x-0 -bottom-3 mx-auto w-fit rounded-full bg-accent px-2.5 py-0.5 text-[10px] font-bold text-white">Drop to add</span>}
    </div>
  );
}

// ── Main section ────────────────────────────────────────────────

export function ItemsSection({
  data,
  loading,
  groups,
  limits,
  activeGroup,
  setActiveGroup,
  onAdd,
  onRemove,
  onMove,
  onPlace,
}: {
  data: PatchData | null;
  loading: boolean;
  groups: Record<ItemGroup, string[]>;
  limits: Record<ItemGroup, number>;
  activeGroup: ItemGroup;
  setActiveGroup: (g: ItemGroup) => void;
  onAdd: (id: string, group: ItemGroup) => void;
  onRemove: (group: ItemGroup, index: number) => void;
  onMove: (group: ItemGroup, index: number, dir: -1 | 1) => void;
  /** add or move an item to a group, optionally at a position */
  onPlace: (id: string, group: ItemGroup, index?: number, from?: { group: ItemGroup; index: number }) => void;
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<Category>("legendary");
  const [selected, setSelected] = useState<string | null>(null);
  const version = data?.version;
  const used = new Set([...groups.starting, ...groups.core, ...groups.situational]);

  const counts = useMemo(() => Object.fromEntries(CATEGORIES.map((c) => [c.id, data?.items.filter(c.test).length ?? 0])) as Record<Category, number>, [data]);
  const list = useMemo(() => {
    if (!data) return [];
    const q = query.trim().toLowerCase();
    const test = CATEGORIES.find((c) => c.id === category)!.test;
    return data.items.filter((i) => (q ? i.name.toLowerCase().includes(q) || i.tags.some((t) => tagLabel(t).toLowerCase().includes(q)) : test(i)));
  }, [data, query, category]);
  const item = data?.items.find((i) => i.id === selected) ?? null;
  const full = groups[activeGroup].length >= limits[activeGroup];

  return (
    <div className="space-y-4">
      {/* build path */}
      <div className="grid gap-3 xl:grid-cols-[minmax(200px,auto)_1fr_minmax(200px,auto)]">
        <GroupBox group="starting" active={activeGroup === "starting"} onActivate={() => setActiveGroup("starting")} count={groups.starting.length} limit={limits.starting} onDropItem={(p) => onPlace(p.id, "starting", undefined, p.from)}>
          {groups.starting.map((id, i) => <Slot key={`${id}-${i}`} group="starting" id={id} version={version} onRemove={() => onRemove("starting", i)} onDropAt={(p) => onPlace(p.id, "starting", i, p.from)} />)}
          {groups.starting.length < limits.starting && <Slot group="starting" active={activeGroup === "starting"} onDropAt={(p) => onPlace(p.id, "starting", undefined, p.from)} />}
        </GroupBox>
        <GroupBox group="core" active={activeGroup === "core"} onActivate={() => setActiveGroup("core")} count={groups.core.length} limit={limits.core} onDropItem={(p) => onPlace(p.id, "core", undefined, p.from)}>
          {Array.from({ length: limits.core }, (_, i) => (
            <span key={i} className="flex items-center gap-2">
              <Slot
                group="core"
                id={groups.core[i]}
                version={version}
                index={i}
                active={activeGroup === "core" && i === groups.core.length}
                onRemove={groups.core[i] ? () => onRemove("core", i) : undefined}
                onLeft={groups.core[i] && i > 0 ? () => onMove("core", i, -1) : undefined}
                onRight={groups.core[i] && i < groups.core.length - 1 ? () => onMove("core", i, 1) : undefined}
                onDropAt={(p, at) => onPlace(p.id, "core", at, p.from)}
              />
              {i < limits.core - 1 && <ChevronRight className="hidden h-4 w-4 text-white/20 sm:block" />}
            </span>
          ))}
        </GroupBox>
        <GroupBox group="situational" active={activeGroup === "situational"} onActivate={() => setActiveGroup("situational")} count={groups.situational.length} limit={limits.situational} onDropItem={(p) => onPlace(p.id, "situational", undefined, p.from)}>
          {groups.situational.map((id, i) => <Slot key={`${id}-${i}`} group="situational" id={id} version={version} onRemove={() => onRemove("situational", i)} onDropAt={(p) => onPlace(p.id, "situational", i, p.from)} />)}
          {groups.situational.length < limits.situational && <Slot group="situational" active={activeGroup === "situational"} onDropAt={(p) => onPlace(p.id, "situational", undefined, p.from)} />}
        </GroupBox>
      </div>
      <p className="-mt-1 text-xs text-muted">Drag items from the shop into a box (or onto a core slot to put it at that spot). Drag items between boxes to move them.</p>

      {/* shop */}
      <div className="overflow-hidden rounded-2xl border border-white/[0.07] bg-[#0a0c11]">
        <div className="flex items-center gap-3 border-b border-white/[0.06] px-3 py-2.5">
          <Coins className="h-4 w-4 shrink-0 text-amber-300" />
          <span className="text-sm font-bold">Shop</span>
          <label className="relative ml-auto w-full max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name or stat…" className="h-9 w-full rounded-lg border border-white/[0.08] bg-white/[0.04] pl-9 pr-3 text-sm outline-none focus:border-accent/60" />
          </label>
        </div>

        <div className="grid md:grid-cols-[200px_1fr] lg:grid-cols-[200px_1fr_360px]">
          {/* categories */}
          <nav className="no-scrollbar flex gap-1 overflow-x-auto border-b border-white/[0.06] p-2 md:flex-col md:border-b-0 md:border-r">
            {CATEGORIES.map((c) => {
              const on = !query && category === c.id;
              const I = c.icon;
              return (
                <button key={c.id} type="button" onClick={() => { setCategory(c.id); setQuery(""); }} className={cn("flex shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition-colors", on ? "bg-accent/15 text-white" : "text-muted hover:bg-white/[0.04] hover:text-white")}>
                  <I className={cn("h-4 w-4 shrink-0", on && "text-accent")} />
                  <span className="flex-1 whitespace-nowrap">{c.label}</span>
                  <span className="hidden text-[10px] tabular text-muted md:inline">{counts[c.id]}</span>
                </button>
              );
            })}
          </nav>

          {/* grid */}
          <div className="max-h-[560px] min-h-[420px] overflow-y-auto p-4">
            {loading && !data ? (
              <div className="grid grid-cols-[repeat(auto-fill,minmax(68px,1fr))] gap-3">{Array.from({ length: 30 }, (_, i) => <div key={i} className="shimmer aspect-square rounded-md" />)}</div>
            ) : list.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted">No item matches “{query}”.</p>
            ) : (
              <div className="grid grid-cols-[repeat(auto-fill,minmax(68px,1fr))] gap-x-3 gap-y-4">
                {list.map((i) => {
                  const inBuild = used.has(i.id);
                  const isSel = selected === i.id;
                  return (
                    <button
                      key={i.id}
                      type="button"
                      onClick={() => setSelected(i.id)}
                      onDoubleClick={() => onAdd(i.id, activeGroup)}
                      draggable
                      onDragStart={(e) => { setSelected(i.id); setDrag(e, { id: i.id }); }}
                      title={`${i.name} · click for details, double-click to add`}
                      className="group/it flex cursor-grab flex-col items-center gap-1.5 outline-none active:cursor-grabbing"
                    >
                      <span className={cn("relative block w-full rounded-lg transition", isSel ? "ring-2 ring-accent ring-offset-2 ring-offset-[#0a0c11]" : "group-hover/it:ring-2 group-hover/it:ring-white/30 group-hover/it:ring-offset-2 group-hover/it:ring-offset-[#0a0c11]")}>
                        {version && <Icon id={i.id} version={version} className={cn("pointer-events-none aspect-square h-auto w-full rounded-lg", inBuild && "opacity-35")} />}
                        {inBuild && <span className="absolute inset-0 grid place-items-center"><Check className="h-5 w-5 text-success drop-shadow" /></span>}
                      </span>
                      <span className="text-[11px] font-bold tabular text-amber-300/90">{i.gold}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* inspector */}
          <aside className="border-t border-white/[0.06] p-5 lg:border-l lg:border-t-0">
            {item && version ? (
              <div className="flex h-full flex-col">
                <div className="flex items-start gap-3">
                  <Icon id={item.id} version={version} className="h-16 w-16 rounded-xl" />
                  <div className="min-w-0">
                    <div className="display text-2xl font-bold leading-tight text-white">{item.name}</div>
                    <div className="mt-1 inline-flex items-center gap-1 text-sm font-bold text-amber-300"><Coins className="h-3.5 w-3.5" />{item.gold}</div>
                  </div>
                </div>

                {item.stats.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {item.stats.map((s) => {
                      const m = s.match(/^([\d.,%+]+)\s+(.*)$/);
                      return (
                        <span key={s} className="rounded-lg border border-success/20 bg-success/[0.08] px-2.5 py-1.5 text-[13px]">
                          {m ? <><b className="text-success">+{m[1]}</b> <span className="text-white/80">{m[2]}</span></> : <span className="text-white/80">{s}</span>}
                        </span>
                      );
                    })}
                  </div>
                )}

                {item.effect && (
                  <div className="mt-4 space-y-2">
                    {effectBlocks(item.effect).map((b, i) => (
                      <div key={i} className="rounded-xl border border-white/[0.06] bg-white/[0.025] p-3">
                        {b.name && <div className="mb-1 text-sm font-bold text-accent">{b.name}{b.meta && <span className="ml-1 font-semibold text-muted">{b.meta}</span>}</div>}
                        {b.body.map((line, j) => <p key={j} className="text-[13.5px] leading-6 text-white/80">{line}</p>)}
                      </div>
                    ))}
                  </div>
                )}
                {!item.effect && !item.stats.length && item.plaintext && <p className="mt-4 text-sm text-white/70">{item.plaintext}</p>}
                <div className="min-h-4 flex-1" />

                <button
                  type="button"
                  disabled={full || (activeGroup === "core" && groups.core.includes(item.id))}
                  onClick={() => onAdd(item.id, activeGroup)}
                  className="mt-auto inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-accent text-sm font-semibold text-white shadow-[0_6px_20px_-8px_rgba(118,87,255,0.8)] transition hover:bg-accent-hover disabled:opacity-40"
                >
                  <Plus className="h-4 w-4" />
                  {full ? `${GROUP_LABEL[activeGroup]} is full` : activeGroup === "core" && groups.core.includes(item.id) ? "Already in core" : `Add to ${GROUP_LABEL[activeGroup]}`}
                </button>
              </div>
            ) : (
              <div className="grid h-full min-h-40 place-items-center text-center">
                <div>
                  <Crown className="mx-auto h-6 w-6 text-white/20" />
                  <p className="mt-2 text-sm text-muted">Click an item to see what it does.<br /><span className="text-xs">Double-click, or drag it into your build.</span></p>
                </div>
              </div>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}

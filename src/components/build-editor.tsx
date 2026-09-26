"use client";

import { ItemDetails, ItemIcon, RuneIcon, SkillGrid, SpellIcon } from "@/components/builds";
import { ChampionIcon, ChampionPicker, ChampionSlot } from "@/components/league";
import { buttonClass, Segmented } from "@/components/ui";
import { standardSkillOrder, usePatchData, type Build } from "@/lib/builds";
import { emptyRunes, MAP_SPELL_MODE, type BuildItem, type BuildRunes } from "@/lib/builds-data";
import { cn } from "@/lib/cn";
import { ROLES } from "@/lib/league";
import { useApp } from "@/lib/store";
import { useChampions } from "@/lib/use-tips";
import { AlertCircle, ArrowLeft, ArrowRight, CheckCircle2, LoaderCircle, Search, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, type ReactNode } from "react";

type Group = "starting" | "core" | "situational";
const LIMITS: Record<Group, number> = { starting: 4, core: 6, situational: 6 };
const inputCls = "w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-3.5 text-sm outline-none transition-colors hover:border-white/[0.14] focus:border-accent/60";

type ItemFilter = "legendary" | "boots" | "starter" | "components" | "consumables" | "all";
const itemFilters: Record<ItemFilter, (i: BuildItem) => boolean> = {
  // Finished items: 2000g+ and not boots. Includes items that still upgrade later (e.g. Manamune → Muramana).
  legendary: (i) => i.gold >= 2000 && !i.tags.includes("Boots"),
  boots: (i) => i.tags.includes("Boots"),
  starter: (i) => i.gold <= 500 && i.into.length === 0 && !i.tags.includes("Consumable"),
  components: (i) => i.into.length > 0 && !i.tags.includes("Boots"),
  consumables: (i) => i.tags.includes("Consumable") || i.tags.includes("Trinket"),
  all: () => true,
};

export function BuildEditor({ initial, championId: initialChampion, roleId: initialRole, mapId: initialMap }: { initial?: Build; championId?: string; roleId?: string; mapId?: string }) {
  const router = useRouter();
  const { toast, isLoggedIn } = useApp();
  const { data: champions } = useChampions();
  const [championId, setChampionId] = useState(initial?.championId ?? initialChampion ?? "");
  const [picking, setPicking] = useState(false);
  const [roleId, setRoleId] = useState(initial?.roleId ?? initialRole ?? "mid");
  const [mapId, setMapId] = useState<"sr" | "aram">((initial?.mapId ?? initialMap) === "aram" ? "aram" : "sr");
  const [title, setTitle] = useState(initial?.title ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [groups, setGroups] = useState<Record<Group, string[]>>({
    starting: initial?.startingItems ?? [],
    core: initial?.items ?? [],
    situational: initial?.situationalItems ?? [],
  });
  const [activeGroup, setActiveGroup] = useState<Group>(initial ? "core" : "starting");
  const [runes, setRunes] = useState<BuildRunes>(initial?.runes ?? emptyRunes());
  const [spells, setSpells] = useState<string[]>(initial?.spells ?? []);
  const [skillOrder, setSkillOrder] = useState<string[]>(initial?.skillOrder?.length ? initial.skillOrder : Array(18).fill(""));
  const [itemQuery, setItemQuery] = useState("");
  const [itemFilter, setItemFilter] = useState<ItemFilter>("legendary");
  const [inspect, setInspect] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const { data, error: dataError, loading } = usePatchData(mapId, championId || undefined);
  const champion = champions.find((c) => c.id === championId);

  const items = useMemo(() => {
    if (!data) return [];
    const q = itemQuery.trim().toLowerCase();
    return data.items.filter((i) => (q ? i.name.toLowerCase().includes(q) : itemFilters[itemFilter](i)));
  }, [data, itemQuery, itemFilter]);

  const spellOptions = useMemo(() => data?.spells.filter((s) => s.modes.includes(MAP_SPELL_MODE[mapId])) ?? [], [data, mapId]);
  const trees = data?.runeTrees ?? [];
  const primary = trees.find((t) => t.id === runes.primary);
  const secondary = trees.find((t) => t.id === runes.secondary);

  function addItem(id: string) {
    setGroups((g) => {
      const list = g[activeGroup];
      if (list.length >= LIMITS[activeGroup]) { toast(`Max ${LIMITS[activeGroup]} ${activeGroup} items`); return g; }
      if (activeGroup === "core" && list.includes(id)) return g;
      const next = { ...g, [activeGroup]: [...list, id] };
      if (activeGroup === "starting" && next.starting.length >= 2 && next.core.length === 0) setActiveGroup("core");
      return next;
    });
  }
  const removeItem = (group: Group, index: number) => setGroups((g) => ({ ...g, [group]: g[group].filter((_, i) => i !== index) }));
  const moveItem = (group: Group, index: number, dir: -1 | 1) => setGroups((g) => {
    const list = [...g[group]];
    const j = index + dir;
    if (j < 0 || j >= list.length) return g;
    [list[index], list[j]] = [list[j], list[index]];
    return { ...g, [group]: list };
  });

  function pickSecondaryRune(slot: number, id: number) {
    setRunes((r) => {
      const slotOf = (rid: number) => secondary?.slots.findIndex((row) => row.some((x) => x.id === rid)) ?? -1;
      const kept = r.secondaryRunes.filter((rid) => slotOf(rid) !== slot);
      const next = [...kept, id].slice(-2);
      return { ...r, secondaryRunes: next };
    });
  }

  const problems = [
    !championId && "Pick a champion",
    title.trim().length < 3 && "Name the build",
    groups.core.length < 3 && "Add at least 3 core items",
    (!runes.primary || !runes.keystone || runes.primaryRunes.some((x) => !x)) && "Finish the primary runes",
    (!runes.secondary || runes.secondaryRunes.length !== 2) && "Pick 2 secondary runes",
    spells.length !== 2 && "Pick 2 summoner spells",
  ].filter(Boolean) as string[];

  async function save() {
    if (problems.length) { setError(problems[0]); return; }
    if (!isLoggedIn) { router.push("/auth?next=" + encodeURIComponent(window.location.pathname + window.location.search)); return; }
    setSaving(true); setError("");
    const res = await fetch("/api/builds", {
      method: initial ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: initial?.id,
        championId, roleId, mapId, title, notes,
        startingItems: groups.starting, items: groups.core, situationalItems: groups.situational,
        runes, spells, skillOrder: skillOrder.filter(Boolean).length ? skillOrder.map((s) => s || "Q") : [],
      }),
    });
    const body = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) { setError(body.error ?? "Couldn't save the build"); return; }
    toast(initial ? "Build updated" : "Build published");
    router.push(`/champions/${championId}#builds`);
  }

  return (
    <div className="mx-auto max-w-6xl pb-28 pt-6">
      <Link href={championId ? `/champions/${championId}#builds` : "/"} className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-white"><ArrowLeft className="h-4 w-4" />{champion ? `${champion.name} builds` : "Back"}</Link>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
        <h1 className="display text-4xl font-extrabold">{initial ? "Edit build" : "Create a build"}</h1>
        {data && <span className="rounded-lg border border-accent/30 bg-accent/10 px-2.5 py-1 text-xs font-bold text-accent">Patch {data.patch} data</span>}
      </div>
      {dataError && <div className="mt-4 rounded-xl border border-danger/30 bg-danger/10 p-3 text-sm text-red-200">{dataError}</div>}

      <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_380px]">
        <div className="space-y-5">
          <Card title="Basics">
            <div className="flex flex-wrap items-start gap-5">
              <ChampionSlot id={championId || null} name={champion?.name} size={72} highlight label="Champion" onClick={() => !initial && setPicking(true)} />
              <div className="min-w-0 flex-1 space-y-3">
                <input maxLength={100} value={title} onChange={(e) => setTitle(e.target.value)} placeholder={champion ? `e.g. ${champion.name} burst into squishies` : "Build name"} className={cn(inputCls, "h-11")} />
                <Segmented size="sm" className="no-scrollbar max-w-full overflow-x-auto" value={roleId} onChange={setRoleId} options={ROLES.map((r) => ({ id: r.id, label: r.label }))} />
                <Segmented size="sm" value={mapId} onChange={(v) => { setMapId(v); setSpells([]); }} options={[{ id: "sr", label: "Summoner's Rift" }, { id: "aram", label: "ARAM" }]} />
              </div>
            </div>
          </Card>

          <Card title="Items">
            <div className="space-y-3">
              {(["starting", "core", "situational"] as Group[]).map((g) => (
                <button key={g} type="button" onClick={() => setActiveGroup(g)} className={cn("flex w-full flex-wrap items-center gap-2 rounded-xl border p-2.5 text-left transition-colors", activeGroup === g ? "border-accent/60 bg-accent/[0.07]" : "border-white/[0.06] hover:border-white/[0.14]")}>
                  <span className="w-24 shrink-0 text-xs font-bold uppercase tracking-wider text-muted">{g}{g === "core" && <span className="block normal-case tracking-normal text-[10px]">in buy order</span>}</span>
                  {groups[g].map((id, i) => (
                    <span key={`${id}-${i}`} className="group relative">
                      <ItemIcon id={id} data={data} size={40} />
                      <span className="absolute -right-1.5 -top-1.5 hidden gap-0.5 group-hover:flex">
                        {g === "core" && i > 0 && <span role="button" tabIndex={0} onClick={(e) => { e.stopPropagation(); moveItem(g, i, -1); }} className="grid h-4 w-4 place-items-center rounded-full bg-panel text-white"><ArrowLeft className="h-2.5 w-2.5" /></span>}
                        {g === "core" && i < groups[g].length - 1 && <span role="button" tabIndex={0} onClick={(e) => { e.stopPropagation(); moveItem(g, i, 1); }} className="grid h-4 w-4 place-items-center rounded-full bg-panel text-white"><ArrowRight className="h-2.5 w-2.5" /></span>}
                        <span role="button" tabIndex={0} onClick={(e) => { e.stopPropagation(); removeItem(g, i); }} className="grid h-4 w-4 place-items-center rounded-full bg-danger text-white"><X className="h-2.5 w-2.5" /></span>
                      </span>
                    </span>
                  ))}
                  {groups[g].length < LIMITS[g] && <span className="grid h-10 w-10 place-items-center rounded-lg border border-dashed border-white/15 text-xs text-muted">+</span>}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <label className="relative min-w-0 flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                <input value={itemQuery} onChange={(e) => setItemQuery(e.target.value)} placeholder="Search items…" className={cn(inputCls, "h-9 pl-9")} />
              </label>
              {!itemQuery && <Segmented size="sm" value={itemFilter} onChange={setItemFilter} className="no-scrollbar max-w-full overflow-x-auto" options={[{ id: "legendary", label: "Legendary" }, { id: "boots", label: "Boots" }, { id: "starter", label: "Starter" }, { id: "components", label: "Components" }, { id: "consumables", label: "Potions & wards" }, { id: "all", label: `All (${data?.items.length ?? 0})` }]} />}
            </div>
            <div className="grid gap-3 md:grid-cols-[1fr_260px]">
              <div className="grid max-h-80 grid-cols-6 content-start gap-1.5 overflow-y-auto pr-1 sm:grid-cols-8 md:grid-cols-7 xl:grid-cols-8">
                {loading && !data ? Array.from({ length: 24 }, (_, i) => <div key={i} className="shimmer aspect-square rounded-lg" />) : items.map((i) => (
                  <button
                    key={i.id}
                    type="button"
                    onClick={() => { addItem(i.id); setInspect(i.id); }}
                    onMouseEnter={() => setInspect(i.id)}
                    onFocus={() => setInspect(i.id)}
                    aria-label={`Add ${i.name}`}
                    className={cn("aspect-square rounded-lg transition hover:scale-105 hover:ring-2 hover:ring-accent/70", inspect === i.id && "ring-2 ring-accent/70")}
                  >
                    <ItemIcon id={i.id} data={data} size={44} noTooltip className="!h-full !w-full" />
                  </button>
                ))}
              </div>
              {/* item inspector */}
              <div className="min-h-40 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3.5 md:sticky md:top-0">
                {(() => {
                  const item = data?.items.find((x) => x.id === inspect);
                  return item && data
                    ? <ItemDetails item={item} version={data.version} />
                    : <p className="text-sm text-muted">Hover or tap an item to see what it does.</p>;
                })()}
              </div>
            </div>
            <p className="text-xs text-muted">Click an item to add it to <b className="text-white">{activeGroup}</b>. Hover an added item to reorder or remove it.</p>
          </Card>

          <Card title="Skill order">
            <div className="flex flex-wrap gap-1.5">
              {[["Q", "W", "E"], ["Q", "E", "W"], ["W", "Q", "E"], ["W", "E", "Q"], ["E", "Q", "W"], ["E", "W", "Q"]].map((p) => (
                <button key={p.join("")} type="button" onClick={() => setSkillOrder(standardSkillOrder(p))} className={buttonClass("secondary", "sm")}>Max {p.join(" > ")}</button>
              ))}
            </div>
            <SkillGrid order={skillOrder} onSet={(lvl, key) => setSkillOrder((o) => o.map((s, i) => (i === lvl ? key : s)))} />
            {data?.champion && (
              <div className="flex flex-wrap gap-3 text-xs text-muted">
                {data.champion.spells.map((s) => <span key={s.key} className="inline-flex items-center gap-1.5"><b className="text-white">{s.key}</b>{s.name}</span>)}
              </div>
            )}
          </Card>

          <Card title="Notes (optional)">
            <textarea maxLength={2000} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="When to go situational items, matchups this is good in, how to play the power spikes…" className={cn(inputCls, "min-h-28 resize-y py-3")} />
          </Card>
        </div>

        {/* right column: runes + spells */}
        <div className="space-y-5 lg:sticky lg:top-20 lg:self-start">
          <Card title="Runes">
            <div className="flex gap-2">
              {trees.map((t) => (
                <button key={t.id} type="button" onClick={() => setRunes((r) => ({ ...emptyRunes(), primary: t.id, secondary: r.secondary === t.id ? null : r.secondary, secondaryRunes: r.secondary === t.id ? [] : r.secondaryRunes }))} className={cn("rounded-full p-1 transition", runes.primary === t.id ? "bg-accent/25 ring-2 ring-accent" : "opacity-60 hover:opacity-100")} title={t.name}>
                  <RuneIcon icon={t.icon} name={t.name} size={28} />
                </button>
              ))}
            </div>
            {primary && (
              <div className="space-y-2.5">
                {primary.slots.map((row, slot) => (
                  <div key={slot} className="flex items-center gap-2">
                    {row.map((r) => {
                      const on = slot === 0 ? runes.keystone === r.id : runes.primaryRunes[slot - 1] === r.id;
                      return (
                        <button key={r.id} type="button" title={`${r.name}: ${r.shortDesc}`} onClick={() => setRunes((x) => slot === 0 ? { ...x, keystone: r.id } : { ...x, primaryRunes: x.primaryRunes.map((v, i) => (i === slot - 1 ? r.id : v)) })} className={cn("rounded-full", on && "ring-2 ring-accent")}>
                          <RuneIcon icon={r.icon} name={r.name} size={slot === 0 ? 40 : 30} dim={!on} />
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
            )}
            {primary && (
              <>
                <div className="h-px bg-white/[0.06]" />
                <div className="flex gap-2">
                  {trees.filter((t) => t.id !== runes.primary).map((t) => (
                    <button key={t.id} type="button" onClick={() => setRunes((r) => ({ ...r, secondary: t.id, secondaryRunes: [] }))} className={cn("rounded-full p-1 transition", runes.secondary === t.id ? "bg-accent/25 ring-2 ring-accent" : "opacity-60 hover:opacity-100")} title={t.name}>
                      <RuneIcon icon={t.icon} name={t.name} size={24} />
                    </button>
                  ))}
                </div>
                {secondary && (
                  <div className="space-y-2">
                    {secondary.slots.slice(1).map((row, i) => (
                      <div key={i} className="flex items-center gap-2">
                        {row.map((r) => {
                          const on = runes.secondaryRunes.includes(r.id);
                          return (
                            <button key={r.id} type="button" title={`${r.name}: ${r.shortDesc}`} onClick={() => pickSecondaryRune(i + 1, r.id)} className={cn("rounded-full", on && "ring-2 ring-accent")}>
                              <RuneIcon icon={r.icon} name={r.name} size={28} dim={!on} />
                            </button>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
            {!primary && <p className="text-xs text-muted">Pick a primary rune tree.</p>}
          </Card>

          <Card title="Summoner spells">
            <div className="flex flex-wrap gap-2">
              {spellOptions.map((s) => {
                const on = spells.includes(s.id);
                return (
                  <button key={s.id} type="button" onClick={() => setSpells((cur) => (on ? cur.filter((x) => x !== s.id) : [...cur, s.id].slice(-2)))} className={cn("rounded-lg transition", on ? "ring-2 ring-accent" : "opacity-50 hover:opacity-100")} title={s.name}>
                    <SpellIcon id={s.id} data={data} size={40} />
                  </button>
                );
              })}
            </div>
          </Card>
        </div>
      </div>

      {/* sticky save bar */}
      <div className="fixed inset-x-0 bottom-16 z-40 px-4 md:bottom-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 rounded-2xl border border-white/[0.08] bg-panel/95 p-3 shadow-2xl shadow-black/60 backdrop-blur">
          <div className="flex min-w-0 items-center gap-2 text-sm">
            {champion && <ChampionIcon id={champion.id} size={28} className="rounded-lg" />}
            {error ? <><AlertCircle className="h-4 w-4 shrink-0 text-danger" /><span className="truncate text-red-200">{error}</span></>
              : problems.length ? <span className="truncate text-muted">{problems[0]}</span>
              : <><CheckCircle2 className="h-4 w-4 shrink-0 text-success" /><span className="truncate">Ready. Checked against patch {data?.patch}.</span></>}
          </div>
          <button type="button" disabled={saving || problems.length > 0} onClick={save} className={buttonClass("primary", "md")}>
            {saving && <LoaderCircle className="h-4 w-4 animate-spin" />}{initial ? "Save build" : "Publish build"}
          </button>
        </div>
      </div>

      <ChampionPicker open={picking} onClose={() => setPicking(false)} title="Which champion?" onPick={(c) => { setChampionId(c.id); setPicking(false); }} />
    </div>
  );
}

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-4 rounded-2xl border border-white/[0.06] bg-panel p-5">
      <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-muted">{title}</h2>
      {children}
    </section>
  );
}

"use client";

import { RuneIcon, SkillGrid, SpellIcon } from "@/components/builds";
import { ItemsSection } from "@/components/item-shop";
import { ChampionIcon, ChampionPicker, ChampionSlot } from "@/components/league";
import { buttonClass, Segmented } from "@/components/ui";
import { standardSkillOrder, usePatchData, type Build } from "@/lib/builds";
import { emptyRunes, MAP_SPELL_MODE, type BuildRunes } from "@/lib/builds-data";
import { cn } from "@/lib/cn";
import { ROLES } from "@/lib/league";
import { useApp } from "@/lib/store";
import { useChampions } from "@/lib/use-tips";
import { AlertCircle, ArrowLeft, CheckCircle2, LoaderCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, type ReactNode } from "react";

type Group = "starting" | "core" | "situational";
const LIMITS: Record<Group, number> = { starting: 4, core: 6, situational: 6 };
const inputCls = "w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-3.5 text-sm outline-none transition-colors hover:border-white/[0.14] focus:border-accent/60";

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
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const { data, error: dataError, loading } = usePatchData(mapId, championId || undefined);
  const champion = champions.find((c) => c.id === championId);

  const spellOptions = useMemo(() => data?.spells.filter((s) => s.modes.includes(MAP_SPELL_MODE[mapId])) ?? [], [data, mapId]);
  const trees = data?.runeTrees ?? [];
  const primary = trees.find((t) => t.id === runes.primary);
  const secondary = trees.find((t) => t.id === runes.secondary);

  function addItem(id: string, group: Group) {
    setGroups((g) => {
      const list = g[group];
      if (list.length >= LIMITS[group]) { toast(`Max ${LIMITS[group]} ${group} items`); return g; }
      if (group === "core" && list.includes(id)) return g;
      const next = { ...g, [group]: [...list, id] };
      if (group === "core" && next.core.length === LIMITS.core) setActiveGroup("situational");
      return next;
    });
  }
  /** Put an item into a group (optionally at a position), moving it if it came from another slot. */
  function placeItem(id: string, group: Group, index?: number, from?: { group: Group; index: number }) {
    setGroups((g) => {
      const next: Record<Group, string[]> = { starting: [...g.starting], core: [...g.core], situational: [...g.situational] };
      if (from) next[from.group].splice(from.index, 1);
      const list = next[group];
      if (list.length >= LIMITS[group]) { toast(`${group[0].toUpperCase()}${group.slice(1)} is full (${LIMITS[group]} items)`); return g; }
      if (group === "core" && list.includes(id)) { toast("Already in your core items"); return g; }
      // moving right within the same box: the removal above shifted everything one slot left
      const target = index !== undefined && from && from.group === group && from.index < index ? index - 1 : index;
      const at = target === undefined ? list.length : Math.min(target, list.length);
      list.splice(at, 0, id);
      return next;
    });
    setActiveGroup(group);
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
    <div className="mx-auto max-w-7xl pb-28 pt-6">
      <Link href={championId ? `/champions/${championId}#builds` : "/"} className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-white"><ArrowLeft className="h-4 w-4" />{champion ? `${champion.name} builds` : "Back"}</Link>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
        <h1 className="display text-4xl font-extrabold">{initial ? "Edit build" : "Create a build"}</h1>
        {data && <span className="rounded-lg border border-accent/30 bg-accent/10 px-2.5 py-1 text-xs font-bold text-accent">Patch {data.patch} data</span>}
      </div>
      {dataError && <div className="mt-4 rounded-xl border border-danger/30 bg-danger/10 p-3 text-sm text-red-200">{dataError}</div>}

      <div className="mt-6 space-y-5">
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
            <ItemsSection
              data={data}
              loading={loading}
              groups={groups}
              limits={LIMITS}
              activeGroup={activeGroup}
              setActiveGroup={setActiveGroup}
              onAdd={addItem}
              onRemove={removeItem}
              onMove={moveItem}
              onPlace={placeItem}
            />
          </Card>

        <div className="grid gap-5 lg:grid-cols-[1fr_400px]">
          <div className="space-y-5">
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
          <div className="space-y-5">
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
      </div>

      {/* sticky save bar */}
      <div className="fixed inset-x-0 bottom-16 z-40 px-4 md:bottom-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 rounded-2xl border border-white/[0.08] bg-panel/95 p-3 shadow-2xl shadow-black/60 backdrop-blur">
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

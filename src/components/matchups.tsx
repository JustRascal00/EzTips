"use client";

import { CoachChat } from "@/components/coach/CoachChat";
import { ChampionIcon, ChampionPicker, TipGrid } from "@/components/league";
import { buttonClass, EmptyState, Segmented } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/cn";
import { championSplashUrl } from "@/lib/ddragon/shared";
import { ROLE_LABEL, ROLES } from "@/lib/league";
import { deleteMatchup, DIFFICULTY_COLOR, DIFFICULTY_LABEL, getMatchups, listMatchups, saveMatchup, type Matchup } from "@/lib/matchups";
import { useApp } from "@/lib/store";
import { createClient } from "@/lib/supabase/client";
import { getTipsByIds, listTips, searchTips } from "@/lib/tips";
import type { Tutorial } from "@/lib/types";
import { useChampions, useCurrentPatch, useSupabaseQuery } from "@/lib/use-tips";
import { Check, ExternalLink, Flame, Hammer, LoaderCircle, Pencil, Sparkles, Swords, Trash2, TrendingUp, X } from "lucide-react";
import Link from "next/link";
import { useState, type ReactNode } from "react";

type Champ = { id: string; name: string };

function Difficulty({ value, size = "md" }: { value: number | null; size?: "sm" | "md" }) {
  if (!value) return null;
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((n) => (
          <span key={n} className={cn("rounded-sm", size === "sm" ? "h-2.5 w-1.5" : "h-3.5 w-2", n <= value ? (value >= 4 ? "bg-danger" : value === 3 ? "bg-white/80" : "bg-success") : "bg-white/10")} />
        ))}
      </span>
      <span className={cn("font-bold", size === "sm" ? "text-[11px]" : "text-sm", DIFFICULTY_COLOR[value])}>{DIFFICULTY_LABEL[value]}</span>
    </span>
  );
}

/** Renders free text as bullets: one point per line ("- " optional). */
function Points({ text }: { text: string }) {
  const lines = text.split("\n").map((l) => l.replace(/^\s*[-•*]\s*/, "").trim()).filter(Boolean);
  if (lines.length <= 1) return <p className="text-[15px] leading-7 text-white/80">{lines[0]}</p>;
  return (
    <ul className="space-y-2">
      {lines.map((l, i) => (
        <li key={i} className="flex gap-2.5 text-[15px] leading-6 text-white/80"><span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />{l}</li>
      ))}
    </ul>
  );
}

function Section({ icon: Icon, title, children }: { icon: typeof Flame; title: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-white/[0.06] bg-panel p-5">
      <h3 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-muted"><Icon className="h-4 w-4 text-accent" />{title}</h3>
      {children}
    </section>
  );
}

// ── Versus banner ───────────────────────────────────────────────

function Versus({ me, vs, right }: { me: Champ; vs: Champ; right?: ReactNode }) {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/[0.06]">
      <div className="grid h-44 grid-cols-2 sm:h-52">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={championSplashUrl(me.id)} alt="" className="h-full w-full object-cover object-[center_20%]" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={championSplashUrl(vs.id)} alt="" className="h-full w-full object-cover object-[center_20%]" />
      </div>
      <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/60 to-bg/10" />
      <div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-gradient-to-b from-transparent via-white/30 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-4 sm:p-6">
        <div className="flex items-center gap-3">
          <ChampionIcon id={me.id} size={56} className="rounded-2xl border-2 border-accent/60" />
          <span className="display text-2xl font-extrabold sm:text-4xl">{me.name}</span>
        </div>
        <span className="display absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/15 bg-bg/80 px-3 py-1 text-lg font-extrabold text-white backdrop-blur sm:text-2xl">VS</span>
        <div className="flex items-center gap-3">
          <span className="display text-right text-2xl font-extrabold sm:text-4xl">{vs.name}</span>
          <ChampionIcon id={vs.id} size={56} className="rounded-2xl border-2 border-danger/60" />
        </div>
      </div>
      {right && <div className="absolute right-3 top-3 flex gap-2">{right}</div>}
    </div>
  );
}

// ── One matchup ─────────────────────────────────────────────────

export function MatchupView({ me, vs, showPageLink }: { me: Champ; vs: Champ; showPageLink?: boolean }) {
  const { profile } = useAuth();
  const isModerator = profile?.role === "moderator" || profile?.role === "admin";
  const { patch: currentPatch } = useCurrentPatch();
  const [version, setVersion] = useState(0);
  const [editing, setEditing] = useState(false);
  const [roleId, setRoleId] = useState<string | null>(null);
  const [inject, setInject] = useState<{ id: number; text: string } | null>(null);

  const { data: matchups, loading } = useSupabaseQuery(`matchup:${me.id}:${vs.id}:${version}`, (c) => getMatchups(c, me.id, vs.id), [] as Matchup[]);
  const visible = matchups.filter((m) => m.status === "published" || isModerator);
  const current = visible.find((m) => m.roleId === roleId) ?? visible[0] ?? null;
  const { data: linked } = useSupabaseQuery(`matchup-tips:${current?.tipIds.join(",") ?? ""}`, (c) => getTipsByIds(c, current?.tipIds ?? []), [] as Tutorial[]);
  const { data: mentioned, loading: mentionedLoading } = useSupabaseQuery(`matchup-mentions:${me.id}:${vs.id}`, (c) => searchTips(c, vs.name, { championId: me.id, limit: 24 }), [] as Tutorial[]);
  const more = mentioned.filter((t) => !linked.some((l) => l.id === t.id));

  const askCoach = () => {
    setInject({ id: Date.now(), text: `I'm playing ${me.name}${current ? ` ${ROLE_LABEL[current.roleId]}` : ""} into ${vs.name}. How do I play this lane? Give lane tips, both champions' power spikes, and what to change in my build.` });
    window.setTimeout(() => document.getElementById("matchup-coach")?.scrollIntoView({ behavior: "smooth", block: "start" }), 60);
  };

  if (editing && isModerator) {
    return <MatchupEditor me={me} vs={vs} existing={current} onDone={() => { setEditing(false); setVersion((v) => v + 1); }} />;
  }

  return (
    <div className="space-y-5">
      <Versus
        me={me}
        vs={vs}
        right={showPageLink ? <Link href={`/matchups/${me.id}/${vs.id}`} className={buttonClass("secondary", "sm", "bg-bg/70 backdrop-blur")}><ExternalLink className="h-4 w-4" />Open page</Link> : undefined}
      />

      <div className="flex flex-wrap items-center gap-3">
        {current && <Difficulty value={current.difficulty} />}
        {current && visible.length > 1 && <Segmented size="sm" value={current.roleId} onChange={setRoleId} options={visible.map((m) => ({ id: m.roleId, label: ROLE_LABEL[m.roleId] }))} />}
        {current && visible.length === 1 && <span className="rounded-md bg-white/[0.06] px-2 py-0.5 text-xs font-bold">{ROLE_LABEL[current.roleId]}</span>}
        {current?.patch && (
          <span className={cn("rounded-md px-2 py-0.5 text-xs font-bold", current.patchIsCurrent ? "bg-accent/15 text-accent" : "bg-amber-400/15 text-amber-300")}>
            {current.patchIsCurrent ? `Checked on patch ${current.patch}` : `Last checked on ${current.patch}, may be outdated on ${currentPatch ?? "this patch"}`}
          </span>
        )}
        {current?.status === "draft" && <span className="rounded-md bg-white/[0.06] px-2 py-0.5 text-xs font-bold text-muted">Draft</span>}
        <div className="ml-auto flex gap-2">
          <button type="button" onClick={askCoach} className={buttonClass("primary", "sm")}><Sparkles className="h-4 w-4" />Ask the coach</button>
          {isModerator && <button type="button" onClick={() => setEditing(true)} className={buttonClass("secondary", "sm")}><Pencil className="h-4 w-4" />{current ? "Edit notes" : "Write notes"}</button>}
        </div>
      </div>

      {loading ? (
        <div className="shimmer h-40 rounded-2xl" />
      ) : current ? (
        <>
          {current.summary && <p className="display text-2xl font-semibold leading-snug text-white/90">{current.summary}</p>}
          <div className="grid gap-4 lg:grid-cols-2">
            {current.laneTips && <div className="lg:col-span-2"><Section icon={Swords} title="How to lane"><Points text={current.laneTips} /></Section></div>}
            {current.powerSpikes && <Section icon={TrendingUp} title="Power spikes"><Points text={current.powerSpikes} /></Section>}
            {current.buildChanges && <Section icon={Hammer} title="Build changes"><Points text={current.buildChanges} /></Section>}
          </div>
        </>
      ) : (
        <EmptyState
          title={`No ${me.name} vs ${vs.name} notes yet`}
          body={isModerator ? "Write the lane tips, power spikes and build changes for this matchup." : "Moderators haven't written this one yet. The coach can help in the meantime."}
          action={<div className="flex flex-wrap justify-center gap-2"><button type="button" onClick={askCoach} className={buttonClass("primary", "md")}><Sparkles className="h-4 w-4" />Ask the coach</button>{isModerator && <button type="button" onClick={() => setEditing(true)} className={buttonClass("secondary", "md")}><Pencil className="h-4 w-4" />Write notes</button>}</div>}
        />
      )}

      {linked.length > 0 && (
        <section>
          <h3 className="display mb-3 text-2xl font-bold">Tips for this matchup</h3>
          <TipGrid tips={linked} />
        </section>
      )}
      {(mentionedLoading || more.length > 0) && (
        <section>
          <h3 className="display mb-3 text-2xl font-bold">{linked.length ? "More" : ""} {me.name} tips mentioning {vs.name}</h3>
          <TipGrid tips={more} loading={mentionedLoading} />
        </section>
      )}

      <section id="matchup-coach" className="scroll-mt-20">
        <h3 className="display mb-3 text-2xl font-bold">Coach</h3>
        <CoachChat
          inject={inject}
          suggestions={[
            `How do I play ${me.name} into ${vs.name} in lane?`,
            `When is ${vs.name} strongest, and when can ${me.name} fight?`,
            `What should ${me.name} build differently against ${vs.name}?`,
          ]}
        />
      </section>
    </div>
  );
}

// ── Editor (moderators) ─────────────────────────────────────────

const inputCls = "w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-3.5 py-3 text-sm outline-none transition-colors hover:border-white/[0.14] focus:border-accent/60";

function MatchupEditor({ me, vs, existing, onDone }: { me: Champ; vs: Champ; existing: Matchup | null; onDone: () => void }) {
  const { profile } = useAuth();
  const { toast } = useApp();
  const [roleId, setRoleId] = useState(existing?.roleId ?? "mid");
  const [difficulty, setDifficulty] = useState(existing?.difficulty ?? 3);
  const [summary, setSummary] = useState(existing?.summary ?? "");
  const [laneTips, setLaneTips] = useState(existing?.laneTips ?? "");
  const [powerSpikes, setPowerSpikes] = useState(existing?.powerSpikes ?? "");
  const [buildChanges, setBuildChanges] = useState(existing?.buildChanges ?? "");
  const [tipIds, setTipIds] = useState<string[]>(existing?.tipIds ?? []);
  const [status, setStatus] = useState<"published" | "draft">(existing?.status === "draft" ? "draft" : "published");
  const [saving, setSaving] = useState(false);
  const { data: tips } = useSupabaseQuery(`matchup-editor-tips:${me.id}`, (c) => listTips(c, { championId: me.id, sort: "top", limit: 60 }), [] as Tutorial[]);

  async function save() {
    const c = createClient();
    if (!c || !profile) return;
    if (!summary.trim() && !laneTips.trim()) { toast("Add at least a summary or lane tips"); return; }
    setSaving(true);
    try {
      await saveMatchup(c, profile.id, { championId: me.id, vsChampionId: vs.id, roleId, difficulty, summary, laneTips, powerSpikes, buildChanges, tipIds, status });
      toast("Matchup saved");
      onDone();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Couldn't save");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    const c = createClient();
    if (!c || !existing || !window.confirm("Delete these matchup notes?")) return;
    try { await deleteMatchup(c, existing.id); toast("Matchup deleted"); onDone(); } catch (e) { toast(e instanceof Error ? e.message : "Couldn't delete"); }
  }

  return (
    <div className="space-y-5">
      <Versus me={me} vs={vs} />
      <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
        <div className="space-y-4 rounded-2xl border border-white/[0.06] bg-panel p-5">
          <div className="flex flex-wrap items-center gap-3">
            <Segmented size="sm" value={roleId} onChange={setRoleId} options={ROLES.map((r) => ({ id: r.id, label: r.label }))} />
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} type="button" onClick={() => setDifficulty(n)} className={cn("h-8 rounded-lg px-2.5 text-xs font-bold transition-colors", difficulty === n ? "bg-accent text-white" : "bg-white/[0.04] text-muted hover:text-white")}>{DIFFICULTY_LABEL[n]}</button>
              ))}
            </div>
          </div>
          <Field label={`Summary (for ${me.name})`}><textarea maxLength={500} value={summary} onChange={(e) => setSummary(e.target.value)} placeholder={`e.g. Skill matchup. Punish ${vs.name} when their main ability is down, respect their level 6.`} className={cn(inputCls, "min-h-20")} /></Field>
          <Field label="How to lane (one point per line)"><textarea maxLength={3000} value={laneTips} onChange={(e) => setLaneTips(e.target.value)} placeholder={"Take Doran's Ring and play for short trades\nStand behind minions to block their skillshot\nShove and roam when they back"} className={cn(inputCls, "min-h-36")} /></Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Power spikes"><textarea maxLength={2000} value={powerSpikes} onChange={(e) => setPowerSpikes(e.target.value)} placeholder={"Level 3: you win short trades\nLevel 6: they can all-in you"} className={cn(inputCls, "min-h-28")} /></Field>
            <Field label="Build changes"><textarea maxLength={2000} value={buildChanges} onChange={(e) => setBuildChanges(e.target.value)} placeholder={"Rush Zhonya's if they're ahead\nTake Second Wind"} className={cn(inputCls, "min-h-28")} /></Field>
          </div>
        </div>

        <div className="space-y-3 rounded-2xl border border-white/[0.06] bg-panel p-5">
          <h3 className="text-xs font-bold uppercase tracking-[0.14em] text-muted">Linked tips ({tipIds.length}/12)</h3>
          <p className="text-xs text-muted">Pick {me.name} tips that help in this matchup.</p>
          <div className="grid max-h-[420px] grid-cols-3 gap-2 overflow-y-auto pr-1">
            {tips.map((t) => {
              const on = tipIds.includes(t.id);
              return (
                <button key={t.id} type="button" onClick={() => setTipIds((cur) => (on ? cur.filter((x) => x !== t.id) : [...cur, t.id].slice(0, 12)))} className={cn("relative aspect-[9/16] overflow-hidden rounded-xl border-2 text-left", on ? "border-accent" : "border-transparent opacity-70 hover:opacity-100")} title={t.title}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={t.thumbnail} alt="" className="h-full w-full object-cover" />
                  <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black p-1.5 text-[10px] font-semibold leading-tight">{t.title}</span>
                  {on && <span className="absolute right-1 top-1 grid h-5 w-5 place-items-center rounded-full bg-accent"><Check className="h-3 w-3" /></span>}
                </button>
              );
            })}
            {tips.length === 0 && <p className="col-span-3 text-sm text-muted">No {me.name} tips yet.</p>}
          </div>
        </div>
      </div>

      <div className="sticky bottom-20 z-20 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-white/[0.08] bg-panel/95 p-3 backdrop-blur md:bottom-4">
        <Segmented size="sm" value={status} onChange={setStatus} options={[{ id: "published", label: "Published" }, { id: "draft", label: "Draft" }]} />
        <div className="flex gap-2">
          {existing && <button type="button" onClick={remove} className={buttonClass("ghost", "md", "hover:text-danger")}><Trash2 className="h-4 w-4" />Delete</button>}
          <button type="button" onClick={onDone} className={buttonClass("ghost", "md")}><X className="h-4 w-4" />Cancel</button>
          <button type="button" disabled={saving} onClick={save} className={buttonClass("primary", "md")}>{saving && <LoaderCircle className="h-4 w-4 animate-spin" />}Save matchup</button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="block"><span className="mb-2 block text-sm font-medium">{label}</span>{children}</label>;
}

// ── Tab on the champion page ────────────────────────────────────

export function MatchupsTab({ champion }: { champion: Champ }) {
  const [opponent, setOpponent] = useState<Champ | null>(null);
  const [picking, setPicking] = useState(false);
  const { data: champions } = useChampions();
  const { data: matchups, loading } = useSupabaseQuery(`matchups:${champion.id}`, (c) => listMatchups(c, champion.id), [] as Matchup[]);
  const name = (id: string) => champions.find((c) => c.id === id)?.name ?? id;

  if (opponent) {
    return (
      <div className="space-y-4">
        <button type="button" onClick={() => setOpponent(null)} className="text-sm font-semibold text-muted hover:text-white">← All {champion.name} matchups</button>
        <MatchupView me={champion} vs={opponent} showPageLink />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/[0.06] bg-panel p-4">
        <div className="flex items-center gap-3">
          <ChampionIcon id={champion.id} size={48} />
          <Swords className="h-5 w-5 text-muted" />
          <span className="grid h-12 w-12 place-items-center rounded-xl border-2 border-dashed border-white/15 text-muted">?</span>
          <div className="ml-1">
            <div className="font-semibold">Who are you laning against?</div>
            <div className="text-xs text-muted">Lane tips, power spikes and build changes.</div>
          </div>
        </div>
        <button type="button" onClick={() => setPicking(true)} className={buttonClass("primary", "md")}>Pick the enemy</button>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{[0, 1, 2, 3].map((i) => <div key={i} className="shimmer h-20 rounded-2xl" />)}</div>
      ) : matchups.length > 0 ? (
        <div>
          <h3 className="mb-3 text-xs font-bold uppercase tracking-[0.14em] text-muted">Written matchups</h3>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {matchups.map((m) => (
              <button key={m.id} type="button" onClick={() => setOpponent({ id: m.vsChampionId, name: name(m.vsChampionId) })} className="flex items-center gap-3 rounded-2xl border border-white/[0.06] bg-panel p-3 text-left transition-colors hover:border-accent/40">
                <ChampionIcon id={m.vsChampionId} size={44} />
                <div className="min-w-0">
                  <div className="truncate font-semibold">vs {name(m.vsChampionId)}</div>
                  <div className="mt-0.5 flex items-center gap-2"><Difficulty value={m.difficulty} size="sm" /><span className="text-[11px] text-muted">{ROLE_LABEL[m.roleId]}</span></div>
                </div>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted">No written matchups for {champion.name} yet. Pick an enemy to see related tips and ask the coach.</p>
      )}

      <ChampionPicker open={picking} onClose={() => setPicking(false)} disabledIds={[champion.id]} title="Enemy laner" onPick={(c) => { setOpponent({ id: c.id, name: c.name }); setPicking(false); }} />
    </div>
  );
}

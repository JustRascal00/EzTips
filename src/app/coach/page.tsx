"use client";

import { CoachChat } from "@/components/coach/CoachChat";
import { AppShell } from "@/components/layout/AppShell";
import { ChampionPicker, ChampionSlot } from "@/components/league";
import { buttonClass } from "@/components/ui";
import { ROLE_LABEL, ROLES } from "@/lib/league";
import { useCurrentPatch } from "@/lib/use-tips";
import { Crown, Hammer, RotateCcw, Sparkles } from "lucide-react";
import { useState } from "react";

type Pick = { id: string; name: string } | null;
type Target = { kind: "me" } | { kind: "enemy"; index: number } | null;

export default function CoachPage() {
  const { patch } = useCurrentPatch();
  const [me, setMe] = useState<Pick>(null);
  const [role, setRole] = useState<string>("mid");
  const [enemies, setEnemies] = useState<Pick[]>([null, null, null, null, null]);
  const [target, setTarget] = useState<Target>(null);
  const [inject, setInject] = useState<{ id: number; text: string; label: string } | null>(null);

  const picked = enemies.filter((e): e is NonNullable<Pick> => Boolean(e));
  const taken = [me?.id, ...picked.map((e) => e.id)].filter(Boolean) as string[];
  const enemyList = picked.map((e) => e.name).join(", ");

  function ask(kind: "build" | "counter") {
    if (kind === "build" && me) {
      setInject({
        id: Date.now(),
        label: `Build for ${me.name} ${ROLE_LABEL[role]} vs ${enemyList}`,
        text: `Draft: I'm playing ${me.name} ${ROLE_LABEL[role]}. Enemy team: ${enemyList}. Suggest my items (starting item, core items in buy order, and 1-2 situational items), my runes and summoner spells against this exact comp. Give a short reason for each choice.`,
      });
    }
    if (kind === "counter") {
      setInject({
        id: Date.now(),
        label: `Best ${ROLE_LABEL[role]} picks vs ${enemyList}`,
        text: `Draft: I'm ${ROLE_LABEL[role]}. Enemy team: ${enemyList}. Suggest the 3 best champions for my role against this comp, best first, with a short reason for each (put them in "champions").`,
      });
    }
    window.setTimeout(() => document.getElementById("coach-chat")?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  }

  return (
    <AppShell publicPage>
      <div className="mx-auto max-w-4xl pt-6 sm:pt-10">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-accent"><Sparkles className="h-4 w-4" />AI coach</span>
            <h1 className="display mt-1 text-4xl font-extrabold sm:text-5xl">Draft board</h1>
            <p className="mt-1 text-sm text-muted">Fill in the enemy team. Get a build for this exact comp, or the best picks for your role.</p>
          </div>
          <span className="rounded-lg border border-accent/30 bg-accent/10 px-2.5 py-1 text-xs font-bold text-accent">Patch {patch ?? "…"}</span>
        </div>

        {/* ── Board ─────────────────────────────── */}
        <section className="relative mt-6 overflow-hidden rounded-3xl border border-white/[0.07] bg-panel">
          <div className="absolute inset-0 bg-grid opacity-50" />
          <div className="relative grid gap-6 p-5 sm:p-7 md:grid-cols-[220px_1fr]">
            <div className="rounded-2xl border border-accent/25 bg-accent/[0.06] p-4">
              <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-accent"><Crown className="h-3.5 w-3.5" />You</div>
              <div className="mt-3 flex justify-center">
                <ChampionSlot id={me?.id} name={me?.name} size={84} highlight label="Your champion" onClick={() => setTarget({ kind: "me" })} onClear={() => setMe(null)} />
              </div>
              <div className="mt-4 text-[11px] font-bold uppercase tracking-[0.14em] text-muted">Role</div>
              <div className="mt-2 grid grid-cols-3 gap-1">
                {ROLES.map((r) => (
                  <button key={r.id} type="button" onClick={() => setRole(r.id)} className={`h-8 rounded-lg text-xs font-bold transition-colors ${role === r.id ? "bg-accent text-white" : "bg-white/[0.04] text-muted hover:text-white"}`}>{r.label}</button>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-danger">Enemy team</div>
                {picked.length > 0 && <button type="button" onClick={() => setEnemies([null, null, null, null, null])} className="inline-flex items-center gap-1 text-xs font-semibold text-muted hover:text-white"><RotateCcw className="h-3 w-3" />Reset</button>}
              </div>
              <div className="mt-4 grid grid-cols-5 gap-2 sm:gap-4">
                {enemies.map((e, i) => (
                  <ChampionSlot key={i} id={e?.id} name={e?.name} size={64} label={`Enemy ${i + 1}`} onClick={() => setTarget({ kind: "enemy", index: i })} onClear={() => setEnemies((cur) => cur.map((x, n) => (n === i ? null : x)))} />
                ))}
              </div>
              <div className="mt-6 flex flex-col gap-2 sm:flex-row">
                <button type="button" disabled={!me || picked.length === 0} onClick={() => ask("build")} className={buttonClass("primary", "lg", "flex-1")}>
                  <Hammer className="h-4 w-4" />{me ? `Build ${me.name} vs this comp` : "Pick your champion first"}
                </button>
                <button type="button" disabled={picked.length === 0} onClick={() => ask("counter")} className={buttonClass("secondary", "lg", "flex-1")}>
                  <Sparkles className="h-4 w-4" />Best {ROLE_LABEL[role]} picks
                </button>
              </div>
              {picked.length === 0 && <p className="mt-3 text-xs text-muted">Add at least one enemy champion to get suggestions.</p>}
            </div>
          </div>
        </section>

        {/* ── Chat ──────────────────────────────── */}
        <section id="coach-chat" className="mt-8 scroll-mt-20">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="display text-2xl font-bold">Ask anything</h2>
            <span className="text-xs text-muted">Uses current patch data, never invents items</span>
          </div>
          <CoachChat
            inject={inject}
            suggestions={[
              "I'm playing Ahri mid into Zed. What should I build first?",
              "Enemy has 2 tanks and a Vayne. What should Jinx build?",
              "Best runes for Lee Sin jungle this patch?",
            ]}
          />
        </section>

        <ChampionPicker
          open={target !== null}
          onClose={() => setTarget(null)}
          title={target?.kind === "me" ? "Your champion" : "Enemy champion"}
          disabledIds={taken}
          onPick={(c) => {
            const pick = { id: c.id, name: c.name };
            if (target?.kind === "me") setMe(pick);
            if (target?.kind === "enemy") setEnemies((cur) => cur.map((x, n) => (n === target.index ? pick : x)));
            setTarget(null);
          }}
        />
      </div>
    </AppShell>
  );
}

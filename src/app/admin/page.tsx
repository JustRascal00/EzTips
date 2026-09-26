"use client";

import { AppShell } from "@/components/layout/AppShell";
import { PatchBadge } from "@/components/actions";
import { buttonClass, EmptyState, Tabs } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { formatTimeAgo } from "@/lib/format";
import { dismissReports, hideTip, listHiddenTips, listOpenReports, REASON_LABEL, unhideTip, type HiddenTip, type ReportRow, type ReportTarget } from "@/lib/moderation";
import { useApp } from "@/lib/store";
import { createClient } from "@/lib/supabase/client";
import { avatarFor, getProfilesByIds, getTipsByIds, listTips, type CreatorSummary } from "@/lib/tips";
import type { Tutorial } from "@/lib/types";
import { useSupabaseQuery } from "@/lib/use-tips";
import { Eye, EyeOff, LoaderCircle, ShieldCheck, X } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

type Group = { key: string; type: ReportTarget; id: string; reports: ReportRow[] };

export default function AdminPage() {
  const { profile, loading: authLoading } = useAuth();
  const isModerator = profile?.role === "moderator" || profile?.role === "admin";
  const { toast } = useApp();
  const [tab, setTab] = useState("reports");
  const [version, setVersion] = useState(0); // bump to reload
  const [busy, setBusy] = useState<string | null>(null);

  const { data: reports, loading } = useSupabaseQuery(`admin-reports:${version}:${isModerator}`, (c) => (isModerator ? listOpenReports(c) : Promise.resolve([])), [] as ReportRow[]);
  const { data: hidden } = useSupabaseQuery(`admin-hidden:${version}:${isModerator}`, (c) => (isModerator ? listHiddenTips(c) : Promise.resolve([])), [] as HiddenTip[]);
  const { data: latest } = useSupabaseQuery(`admin-latest:${version}:${isModerator}`, (c) => (isModerator ? listTips(c, { sort: "new", limit: 40 }) : Promise.resolve([])), [] as Tutorial[]);

  const groups = useMemo(() => {
    const map = new Map<string, Group>();
    for (const r of reports) {
      const key = `${r.target_type}:${r.target_id}`;
      const g = map.get(key) ?? { key, type: r.target_type, id: r.target_id, reports: [] };
      g.reports.push(r);
      map.set(key, g);
    }
    return [...map.values()].sort((a, b) => b.reports.length - a.reports.length);
  }, [reports]);

  const tipIds = groups.filter((g) => g.type === "tip").map((g) => g.id);
  const profileIds = [...new Set([...groups.filter((g) => g.type === "profile").map((g) => g.id), ...reports.map((r) => r.reporter_id).filter((x): x is string => Boolean(x))])];
  const { data: tips } = useSupabaseQuery(`admin-tips:${tipIds.join(",")}`, (c) => getTipsByIds(c, tipIds), [] as Tutorial[]);
  const { data: people } = useSupabaseQuery(`admin-people:${profileIds.join(",")}`, (c) => getProfilesByIds(c, profileIds), [] as CreatorSummary[]);
  const tipById = new Map(tips.map((t) => [t.id, t]));
  const personById = new Map(people.map((p) => [p.id, p]));

  async function run(key: string, action: (client: NonNullable<ReturnType<typeof createClient>>, me: string) => Promise<void>, done: string) {
    const client = createClient();
    if (!client || !profile) return;
    setBusy(key);
    try {
      await action(client, profile.id);
      toast(done);
      setVersion((v) => v + 1);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Action failed");
    } finally {
      setBusy(null);
    }
  }

  if (!authLoading && !isModerator) {
    return (
      <AppShell>
        <div className="py-16"><EmptyState title="Moderators only" body="You need the moderator or admin role to see this page." /></div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="py-8">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-accent/15 text-accent"><ShieldCheck className="h-6 w-6" /></span>
          <div>
            <h1 className="display text-4xl font-extrabold leading-none">Moderation</h1>
            <p className="mt-1 text-sm text-muted">Review reports, hide tips that break the rules, bring back ones hidden by mistake.</p>
          </div>
        </div>

        <Tabs className="mt-6" value={tab} onChange={setTab} tabs={[
          { id: "reports", label: "Open reports", count: groups.length },
          { id: "hidden", label: "Hidden tips", count: hidden.length },
          { id: "latest", label: "Latest uploads" },
        ]} />

        <div className="mt-6">
          {tab === "reports" && (
            loading ? <div className="flex items-center gap-2 text-sm text-muted"><LoaderCircle className="h-4 w-4 animate-spin" />Loading reports…</div>
            : groups.length === 0 ? <EmptyState title="Nothing to review" body="No open reports. Nice." />
            : <div className="space-y-3">
                {groups.map((g) => {
                  const tip = g.type === "tip" ? tipById.get(g.id) : undefined;
                  const person = g.type === "profile" ? personById.get(g.id) : undefined;
                  const reasons = new Map<string, number>();
                  g.reports.forEach((r) => reasons.set(r.reason, (reasons.get(r.reason) ?? 0) + 1));
                  const topReason = [...reasons.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "other";
                  return (
                    <ReportCard
                      key={g.key}
                      busy={busy === g.key}
                      title={tip?.title ?? (person ? `${person.display_name} (@${person.username})` : `${g.type} ${g.id.slice(0, 8)}`)}
                      subtitle={tip ? `${tip.championName ?? "No champion"} · by @${tip.creatorUsername ?? "unknown"}${tip.status === "hidden" ? " · already hidden" : ""}` : g.type === "profile" ? "Profile" : g.type}
                      image={tip?.thumbnail ?? (person ? avatarFor(person) : undefined)}
                      href={tip ? `/t/${tip.slug}` : person ? `/u/${person.username}` : undefined}
                      patch={tip ? <PatchBadge patch={tip.patch} current={tip.patchIsCurrent} outdated={tip.outdated} /> : null}
                      reasons={[...reasons.entries()]}
                      reports={g.reports.map((r) => ({ ...r, reporter: r.reporter_id ? personById.get(r.reporter_id)?.username : undefined }))}
                      onHide={g.type === "tip" && tip?.status !== "hidden" ? (reason) => run(g.key, (c, me) => hideTip(c, me, g.id, reason), "Tip hidden, reports resolved") : undefined}
                      defaultReason={REASON_LABEL[topReason] ?? "Breaks the rules"}
                      onDismiss={() => run(g.key, (c, me) => dismissReports(c, me, g.type, g.id), "Reports dismissed")}
                    />
                  );
                })}
              </div>
          )}

          {tab === "hidden" && (
            hidden.length === 0 ? <EmptyState title="No hidden tips" body="Tips you hide show up here so you can undo it." />
            : <div className="divide-y divide-white/[0.05] overflow-hidden rounded-2xl border border-white/[0.06] bg-panel">
                {hidden.map((h) => (
                  <div key={h.id} className="flex items-center gap-3 p-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {h.thumbnail_url ? <img src={h.thumbnail_url} alt="" className="h-14 w-10 shrink-0 rounded-lg object-cover" /> : <div className="h-14 w-10 shrink-0 rounded-lg bg-card" />}
                    <div className="min-w-0 flex-1">
                      <Link href={`/t/${h.slug}`} className="block truncate font-semibold hover:text-accent">{h.title}</Link>
                      <div className="truncate text-xs text-muted">{h.hidden_reason ?? "Hidden"}{h.moderated_at ? ` · ${formatTimeAgo(h.moderated_at)}` : ""}</div>
                    </div>
                    <button type="button" disabled={busy === h.id} onClick={() => run(h.id, (c, me) => unhideTip(c, me, h.id), "Tip is visible again")} className={buttonClass("secondary", "sm")}><Eye className="h-4 w-4" />Unhide</button>
                  </div>
                ))}
              </div>
          )}

          {tab === "latest" && (
            <div className="divide-y divide-white/[0.05] overflow-hidden rounded-2xl border border-white/[0.06] bg-panel">
              {latest.map((t) => (
                <div key={t.id} className="flex items-center gap-3 p-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={t.thumbnail} alt="" className="h-14 w-10 shrink-0 rounded-lg bg-card object-cover" />
                  <div className="min-w-0 flex-1">
                    <Link href={`/t/${t.slug}`} className="block truncate font-semibold hover:text-accent">{t.title}</Link>
                    <div className="truncate text-xs text-muted">{t.championName ?? "No champion"} · @{t.creatorUsername} · {formatTimeAgo(t.createdAt)} · ▲ {t.score ?? 0}</div>
                  </div>
                  <HideInline busy={busy === t.id} onHide={(reason) => run(t.id, (c, me) => hideTip(c, me, t.id, reason), "Tip hidden")} />
                </div>
              ))}
              {latest.length === 0 && <p className="p-6 text-sm text-muted">No public tips yet.</p>}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}

function ReportCard(props: {
  title: string; subtitle: string; image?: string; href?: string; patch: React.ReactNode; busy: boolean;
  reasons: [string, number][]; reports: (ReportRow & { reporter?: string })[]; defaultReason: string;
  onHide?: (reason: string) => void; onDismiss: () => void;
}) {
  return (
    <article className="rounded-2xl border border-white/[0.06] bg-panel p-4">
      <div className="flex gap-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {props.image ? <img src={props.image} alt="" className="h-24 w-[54px] shrink-0 rounded-xl bg-card object-cover" /> : <div className="h-24 w-[54px] shrink-0 rounded-xl bg-card" />}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md bg-danger/15 px-1.5 py-0.5 text-[11px] font-bold text-danger">{props.reports.length} {props.reports.length === 1 ? "report" : "reports"}</span>
            {props.patch}
          </div>
          {props.href ? <Link href={props.href} target="_blank" className="mt-1.5 block truncate font-semibold hover:text-accent">{props.title}</Link> : <div className="mt-1.5 truncate font-semibold">{props.title}</div>}
          <div className="truncate text-xs text-muted">{props.subtitle}</div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {props.reasons.map(([reason, n]) => <span key={reason} className="rounded-full border border-white/[0.07] bg-white/[0.03] px-2 py-0.5 text-[11px] font-semibold text-white/80">{REASON_LABEL[reason] ?? reason}{n > 1 ? ` ×${n}` : ""}</span>)}
          </div>
        </div>
      </div>
      <ul className="mt-3 space-y-1.5 border-t border-white/[0.05] pt-3">
        {props.reports.slice(0, 5).map((r) => (
          <li key={r.id} className="text-xs text-muted">
            <span className="font-semibold text-white/80">@{r.reporter ?? "deleted"}</span> · {REASON_LABEL[r.reason] ?? r.reason} · {formatTimeAgo(r.created_at)}
            {r.details && <span className="mt-0.5 block text-white/70">“{r.details}”</span>}
          </li>
        ))}
        {props.reports.length > 5 && <li className="text-xs text-muted">+{props.reports.length - 5} more</li>}
      </ul>
      <div className="mt-3 flex flex-wrap justify-end gap-2">
        <button type="button" disabled={props.busy} onClick={props.onDismiss} className={buttonClass("ghost", "sm")}><X className="h-4 w-4" />Dismiss</button>
        {props.onHide && <HideInline busy={props.busy} onHide={props.onHide} defaultReason={props.defaultReason} />}
      </div>
    </article>
  );
}

function HideInline({ onHide, busy, defaultReason = "" }: { onHide: (reason: string) => void; busy: boolean; defaultReason?: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState(defaultReason);
  if (!open) return <button type="button" disabled={busy} onClick={() => setOpen(true)} className={buttonClass("danger", "sm")}><EyeOff className="h-4 w-4" />Hide tip</button>;
  return (
    <form onSubmit={(e) => { e.preventDefault(); onHide(reason.trim() || "Breaks the rules"); setOpen(false); }} className="flex w-full items-center gap-2 sm:w-auto">
      <input autoFocus value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} placeholder="Reason shown to the creator" className="h-8 min-w-0 flex-1 rounded-lg border border-white/[0.08] bg-white/[0.04] px-2.5 text-xs outline-none focus:border-accent/60 sm:w-64" />
      <button type="submit" disabled={busy} className={buttonClass("danger", "sm")}>{busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : "Hide"}</button>
      <button type="button" onClick={() => setOpen(false)} className={buttonClass("ghost", "sm")}>Cancel</button>
    </form>
  );
}

"use client";

import { buttonClass, Modal } from "@/components/ui";
import { cn } from "@/lib/cn";
import { REPORT_REASONS, submitReport, type ReportReason, type ReportTarget } from "@/lib/moderation";
import { useApp } from "@/lib/store";
import { createClient } from "@/lib/supabase/client";
import { Flag, LoaderCircle, X } from "lucide-react";
import { useState } from "react";

export function ReportButton({ target, targetId, label, compact }: { target: ReportTarget; targetId: string; label?: string; compact?: boolean }) {
  const { isLoggedIn, currentUser, toast } = useApp();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [details, setDetails] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const what = target === "tip" ? "tip" : target === "profile" ? "profile" : "content";

  async function send() {
    const supabase = createClient();
    if (!supabase || !currentUser.id || !reason) return;
    if (reason === "other" && !details.trim()) { setError("Tell us what's wrong."); return; }
    setSending(true); setError("");
    try {
      await submitReport(supabase, currentUser.id, target, targetId, reason, details);
      setOpen(false); setReason(null); setDetails("");
      toast("Thanks, report sent to moderators");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't send the report");
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => (isLoggedIn ? setOpen(true) : toast("Sign in to report"))}
        className={compact ? buttonClass("ghost", "icon") : buttonClass("ghost", "sm")}
        aria-label={`Report this ${what}`}
        title={`Report this ${what}`}
      >
        <Flag className="h-4 w-4" />{!compact && (label ?? "Report")}
      </button>
      <Modal open={open} onClose={() => setOpen(false)}>
        <div className="flex items-center justify-between">
          <h3 className="display text-2xl font-bold">Report this {what}</h3>
          <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="grid h-9 w-9 place-items-center rounded-lg text-muted hover:bg-white/[0.06] hover:text-white"><X className="h-5 w-5" /></button>
        </div>
        <p className="mt-1 text-sm text-muted">Moderators review every report. The creator won&apos;t see who reported.</p>
        <div className="mt-4 space-y-1.5">
          {REPORT_REASONS.filter((r) => target === "tip" || !["outdated", "not_lol", "copyright"].includes(r.id)).map((r) => (
            <button key={r.id} type="button" onClick={() => setReason(r.id)} className={cn("flex w-full items-start gap-3 rounded-xl border p-3 text-left transition-colors", reason === r.id ? "border-accent/60 bg-accent/10" : "border-white/[0.06] hover:bg-white/[0.04]")}>
              <span className={cn("mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full border", reason === r.id ? "border-accent" : "border-white/25")}>{reason === r.id && <span className="h-2 w-2 rounded-full bg-accent" />}</span>
              <span><span className="block text-sm font-semibold">{r.label}</span><span className="block text-xs text-muted">{r.hint}</span></span>
            </button>
          ))}
        </div>
        <textarea value={details} onChange={(e) => setDetails(e.target.value)} maxLength={1000} placeholder="Details (optional)" className="mt-3 min-h-20 w-full resize-y rounded-xl border border-white/[0.08] bg-white/[0.04] px-3.5 py-3 text-sm outline-none focus:border-accent/60" />
        {error && <p className="mt-2 text-sm text-danger">{error}</p>}
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={() => setOpen(false)} className={buttonClass("ghost", "md")}>Cancel</button>
          <button type="button" disabled={!reason || sending} onClick={send} className={buttonClass("primary", "md")}>{sending && <LoaderCircle className="h-4 w-4 animate-spin" />}Send report</button>
        </div>
      </Modal>
    </>
  );
}

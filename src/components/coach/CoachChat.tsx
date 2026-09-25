"use client";

import { ChampionIcon } from "@/components/league";
import { buttonClass } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/cn";
import { itemIconUrl } from "@/lib/ddragon/shared";
import { AlertTriangle, LoaderCircle, SendHorizontal, Sparkles } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type Ref = { id: string; name: string };
type CoachReply = {
  answer: string;
  items: Ref[];
  champions: Ref[];
  runes: string[];
  unverified: string[];
  patch: string;
  version: string;
  model: string;
  usedFallback: boolean;
  remaining?: number;
};
type Message =
  | { role: "user"; text: string; label?: string }
  | { role: "model"; text: string; reply: CoachReply }
  | { role: "error"; text: string };

/**
 * Chat with the coach (/api/coach). `inject` lets a parent (the draft board) send a prepared question:
 * change its `id` to send `text` (shown to the user as `label` if given).
 */
export function CoachChat({
  suggestions = [],
  inject,
  className,
  placeholder = "Ask a follow-up… e.g. what if they have 2 tanks?",
}: {
  suggestions?: string[];
  inject?: { id: number; text: string; label?: string } | null;
  className?: string;
  placeholder?: string;
}) {
  const { configured, loading, user } = useAuth();
  const pathname = usePathname();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const lastInject = useRef<number | null>(null);
  const messagesRef = useRef(messages);
  useEffect(() => { messagesRef.current = messages; }, [messages]);

  useEffect(() => {
    if (messages.length) bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages, sending]);

  async function send(text: string, label?: string) {
    const message = text.trim();
    if (!message || sending) return;
    const history = messagesRef.current
      .filter((m): m is Extract<Message, { role: "user" | "model" }> => m.role === "user" || m.role === "model")
      .map((m) => ({ role: m.role, text: m.role === "model" ? JSON.stringify({ answer: m.text }) : m.text }));
    setMessages((cur) => [...cur, { role: "user", text: message, label }]);
    setInput("");
    setSending(true);
    try {
      const res = await fetch("/api/coach", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message, history }) });
      const data = await res.json().catch(() => ({ error: `Request failed (${res.status})` }));
      if (!res.ok) throw new Error(data.error ?? `Request failed (${res.status})`);
      setMessages((cur) => [...cur, { role: "model", text: data.answer, reply: data as CoachReply }]);
    } catch (error) {
      setMessages((cur) => [...cur, { role: "error", text: error instanceof Error ? error.message : "Something went wrong." }]);
    } finally {
      setSending(false);
    }
  }

  useEffect(() => {
    if (!inject || inject.id === lastInject.current) return;
    lastInject.current = inject.id;
    queueMicrotask(() => { void send(inject.text, inject.label); });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- send only when a new inject arrives
  }, [inject]);

  if (configured && !loading && !user) {
    return (
      <div className={cn("rounded-2xl border border-white/[0.06] bg-panel p-6 text-center", className)}>
        <Sparkles className="mx-auto h-6 w-6 text-accent" />
        <p className="mt-3 font-semibold">Sign in to ask the coach</p>
        <p className="mt-1 text-sm text-muted">Free accounts get 20 questions a day.</p>
        <Link href={`/auth?next=${encodeURIComponent(pathname)}`} className={buttonClass("primary", "md", "mt-4")}>Sign in</Link>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col", className)}>
      <div className="space-y-3">
        {messages.length === 0 && suggestions.length > 0 && (
          <div className="grid gap-2 sm:grid-cols-3">
            {suggestions.map((s) => (
              <button key={s} type="button" onClick={() => send(s)} className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-3 text-left text-[13px] leading-snug text-muted transition-colors hover:border-accent/40 hover:bg-accent/[0.06] hover:text-white">{s}</button>
            ))}
          </div>
        )}

        {messages.map((m, i) => {
          if (m.role === "user") {
            return <div key={i} className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-md bg-accent px-4 py-2.5 text-sm text-white">{m.label ?? m.text}</div>;
          }
          if (m.role === "error") {
            return <div key={i} className="flex w-fit max-w-[85%] items-start gap-2 rounded-2xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-red-200"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />{m.text}</div>;
          }
          const r = m.reply;
          return (
            <div key={i} className="max-w-[94%] rounded-2xl rounded-bl-md border border-white/[0.07] bg-panel p-4">
              <div className="mb-2 flex items-center gap-2 text-xs font-bold text-accent"><Sparkles className="h-3.5 w-3.5" />Coach</div>
              <p className="whitespace-pre-wrap text-sm leading-6 text-white/90">{r.answer}</p>
              {r.items.length > 0 && (
                <div className="mt-4">
                  <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-muted">Items</div>
                  <div className="flex flex-wrap gap-2">
                    {r.items.map((item, n) => (
                      <span key={item.id} className="inline-flex items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.03] py-1 pl-1 pr-2.5 text-xs font-semibold">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={itemIconUrl(r.version, item.id)} alt="" className="h-7 w-7 rounded-lg" />
                        <span className="text-muted tabular">{n + 1}.</span>{item.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {r.runes.length > 0 && (
                <div className="mt-3">
                  <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-muted">Runes</div>
                  <div className="flex flex-wrap gap-1.5">{r.runes.map((rune) => <span key={rune} className="rounded-lg bg-white/[0.05] px-2 py-1 text-xs font-semibold">{rune}</span>)}</div>
                </div>
              )}
              {r.champions.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {r.champions.map((c) => (
                    <Link key={c.id} href={`/champions/${c.id}`} className="inline-flex items-center gap-1.5 rounded-xl bg-white/[0.04] py-1 pl-1 pr-2.5 text-xs font-semibold hover:bg-white/[0.08]">
                      <ChampionIcon id={c.id} size={24} className="rounded-lg" />{c.name}
                    </Link>
                  ))}
                </div>
              )}
              {r.unverified.length > 0 && <p className="mt-3 text-xs text-amber-300/80">Not in this patch&apos;s data, ignore: {r.unverified.join(", ")}</p>}
              <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-white/[0.05] pt-3 text-[11px] text-muted">
                <span className="rounded-md bg-accent/15 px-1.5 py-0.5 font-bold text-accent">Based on patch {r.patch}</span>
                <span>{r.model}{r.usedFallback ? " (fallback)" : ""}</span>
                {typeof r.remaining === "number" && <span>· {r.remaining} questions left today</span>}
              </div>
            </div>
          );
        })}
        {sending && <div className="inline-flex items-center gap-2 rounded-2xl border border-white/[0.06] bg-panel px-4 py-3 text-sm text-muted"><LoaderCircle className="h-4 w-4 animate-spin text-accent" />Thinking about patch data…</div>}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={(e) => { e.preventDefault(); void send(input); }} className="sticky bottom-20 mt-4 flex gap-2 rounded-2xl border border-white/[0.08] bg-panel/95 p-1.5 shadow-2xl shadow-black/50 backdrop-blur md:bottom-4">
        <input value={input} onChange={(e) => setInput(e.target.value)} maxLength={1000} placeholder={placeholder} className="h-11 min-w-0 flex-1 bg-transparent px-3 text-sm outline-none placeholder:text-muted/70" />
        <button type="submit" disabled={sending || !input.trim()} aria-label="Send" className={buttonClass("primary", "icon")}><SendHorizontal className="h-4 w-4" /></button>
      </form>
    </div>
  );
}

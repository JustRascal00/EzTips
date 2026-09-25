"use client";

import { AppShell } from "@/components/layout/AppShell";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/cn";
import { championIconUrl, itemIconUrl } from "@/lib/ddragon/shared";
import { AlertTriangle, LoaderCircle, SendHorizontal, Sparkles } from "lucide-react";
import Link from "next/link";
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
  | { role: "user"; text: string }
  | { role: "model"; text: string; reply: CoachReply }
  | { role: "error"; text: string };

const suggestions = [
  "I'm playing Ahri mid into Zed. What should I build first?",
  "Enemy has 2 tanks and a Vayne. What should Jinx build?",
  "Best runes for Lee Sin jungle this patch?",
];

export default function CoachPage() {
  const { configured, loading, user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, sending]);

  async function send(text: string) {
    const message = text.trim();
    if (!message || sending) return;
    const history = messages
      .filter((m): m is Extract<Message, { role: "user" | "model" }> => m.role === "user" || m.role === "model")
      .map((m) => ({ role: m.role, text: m.role === "model" ? JSON.stringify({ answer: m.text }) : m.text }));
    setMessages((current) => [...current, { role: "user", text: message }]);
    setInput("");
    setSending(true);
    try {
      const res = await fetch("/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, history }),
      });
      const data = await res.json().catch(() => ({ error: `Request failed (${res.status})` }));
      if (!res.ok) throw new Error(data.error ?? `Request failed (${res.status})`);
      setMessages((current) => [...current, { role: "model", text: data.answer, reply: data as CoachReply }]);
    } catch (error) {
      setMessages((current) => [...current, { role: "error", text: error instanceof Error ? error.message : "Something went wrong." }]);
    } finally {
      setSending(false);
    }
  }

  const signedOut = configured && !loading && !user;

  return (
    <AppShell hideRight>
      <div className="mx-auto flex min-h-[calc(100dvh-4rem)] w-full max-w-3xl flex-col px-4 pb-24 pt-6 md:pb-8">
        <header className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-accent/15 text-accent"><Sparkles className="h-5 w-5" /></span>
          <div>
            <h1 className="text-xl font-bold">Ask the coach</h1>
            <p className="text-sm text-muted">Builds, runes and matchups, grounded in the current patch.</p>
          </div>
        </header>

        {signedOut ? (
          <div className="mt-10 rounded-2xl border border-border bg-card p-6 text-center">
            <p className="font-semibold">Sign in to use the coach</p>
            <Link href="/auth?next=/coach" className="mt-4 inline-flex h-10 items-center rounded-xl bg-accent px-4 text-sm font-semibold text-white hover:bg-accent-hover">Sign in</Link>
          </div>
        ) : (
          <>
            <div className="mt-6 flex-1 space-y-4">
              {messages.length === 0 && (
                <div className="grid gap-2">
                  {suggestions.map((s) => (
                    <button key={s} type="button" onClick={() => send(s)} className="rounded-xl border border-border bg-card px-4 py-3 text-left text-sm text-muted transition-colors hover:bg-hover hover:text-text">{s}</button>
                  ))}
                </div>
              )}

              {messages.map((m, i) => {
                if (m.role === "user") {
                  return <div key={i} className="ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-accent px-4 py-2.5 text-sm text-white">{m.text}</div>;
                }
                if (m.role === "error") {
                  return <div key={i} className="flex max-w-[85%] items-start gap-2 rounded-2xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-red-200"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />{m.text}</div>;
                }
                const r = m.reply;
                return (
                  <div key={i} className="max-w-[92%] rounded-2xl rounded-bl-md border border-border bg-card p-4">
                    <p className="whitespace-pre-wrap text-sm leading-6">{r.answer}</p>
                    {r.champions.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {r.champions.map((c) => (
                          <span key={c.id} className="inline-flex items-center gap-1.5 rounded-lg bg-elevated py-1 pl-1 pr-2 text-xs">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={championIconUrl(r.version, c.id)} alt="" className="h-5 w-5 rounded" />{c.name}
                          </span>
                        ))}
                      </div>
                    )}
                    {r.items.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {r.items.map((item) => (
                          <span key={item.id} className="inline-flex items-center gap-1.5 rounded-lg bg-elevated py-1 pl-1 pr-2 text-xs">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={itemIconUrl(r.version, item.id)} alt="" className="h-5 w-5 rounded" />{item.name}
                          </span>
                        ))}
                      </div>
                    )}
                    {r.runes.length > 0 && <p className="mt-3 text-xs text-muted">Runes: {r.runes.join(" · ")}</p>}
                    {r.unverified.length > 0 && <p className="mt-2 text-xs text-amber-300/80">Not found in this patch&apos;s data (ignore): {r.unverified.join(", ")}</p>}
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-muted">
                      <span className="rounded-md bg-accent/15 px-1.5 py-0.5 font-semibold text-accent">Based on patch {r.patch}</span>
                      <span>{r.model}{r.usedFallback ? " (fallback)" : ""}</span>
                      {typeof r.remaining === "number" && <span>· {r.remaining} questions left today</span>}
                    </div>
                  </div>
                );
              })}

              {sending && <div className="inline-flex items-center gap-2 rounded-2xl border border-border bg-card px-4 py-3 text-sm text-muted"><LoaderCircle className="h-4 w-4 animate-spin" />Thinking…</div>}
              <div ref={bottomRef} />
            </div>

            <form
              onSubmit={(e) => { e.preventDefault(); void send(input); }}
              className="sticky bottom-20 mt-6 flex gap-2 rounded-2xl border border-border bg-elevated p-2 md:bottom-4"
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                maxLength={1000}
                placeholder="What if they have 2 tanks?"
                className="h-11 min-w-0 flex-1 bg-transparent px-3 text-sm outline-none placeholder:text-muted/70"
              />
              <button type="submit" disabled={sending || !input.trim()} aria-label="Send" className={cn("grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-accent text-white transition-opacity hover:bg-accent-hover", (sending || !input.trim()) && "opacity-40")}>
                <SendHorizontal className="h-4 w-4" />
              </button>
            </form>
          </>
        )}
      </div>
    </AppShell>
  );
}

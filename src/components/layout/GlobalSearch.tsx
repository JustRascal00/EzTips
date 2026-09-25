"use client";

import { ChampionIcon } from "@/components/league";
import { cn } from "@/lib/cn";
import { useApp } from "@/lib/store";
import { searchCreators, searchTips, type CreatorSummary } from "@/lib/tips";
import type { Tutorial } from "@/lib/types";
import { useChampions, useSupabaseQuery } from "@/lib/use-tips";
import { CornerDownLeft, Search } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

function useDebounced<T>(value: T, ms: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => { const t = window.setTimeout(() => setDebounced(value), ms); return () => window.clearTimeout(t); }, [value, ms]);
  return debounced;
}

const norm = (v: string) => v.toLowerCase().replace(/[^a-z0-9]/g, "");

/** Champion-first search used in the top nav (and full-screen on phones). */
export function GlobalSearch({ className, autoFocus, onNavigate, placeholder = "Search a champion, tip or creator" }: { className?: string; autoFocus?: boolean; onNavigate?: () => void; placeholder?: string }) {
  const router = useRouter();
  const { recordSearch } = useApp();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(Boolean(autoFocus));
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const q = query.trim();
  const debounced = useDebounced(q, 220);
  const { data: champions } = useChampions();
  const champs = useMemo(() => {
    const n = norm(q);
    if (!n) return [];
    return champions.filter((c) => norm(c.name).startsWith(n)).concat(champions.filter((c) => !norm(c.name).startsWith(n) && norm(c.name).includes(n))).slice(0, 5);
  }, [champions, q]);
  const { data: tips } = useSupabaseQuery(`gs-tips:${debounced}`, (client) => (debounced.length >= 2 ? searchTips(client, debounced, { limit: 4 }) : Promise.resolve([])), [] as Tutorial[]);
  const { data: creators } = useSupabaseQuery(`gs-creators:${debounced}`, (client) => searchCreators(client, debounced, 3), [] as CreatorSummary[]);
  const fresh = debounced === q;

  type Item = { href: string; key: string };
  const items: Item[] = [
    ...champs.map((c) => ({ href: `/champions/${c.id}`, key: `c-${c.id}` })),
    ...(fresh ? tips : []).map((t) => ({ href: `/t/${t.slug}`, key: `t-${t.id}` })),
    ...(fresh ? creators : []).map((c) => ({ href: `/u/${c.username}`, key: `u-${c.id}` })),
  ];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (e.key === "/" && !["INPUT", "TEXTAREA", "SELECT"].includes(tag)) { e.preventDefault(); inputRef.current?.focus(); setOpen(true); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function go(href: string) {
    setOpen(false); setQuery(""); inputRef.current?.blur(); onNavigate?.();
    router.push(href);
  }
  function submit() {
    const item = items[active];
    if (item && q) return go(item.href);
    if (!q) return;
    recordSearch(q);
    go(`/search?q=${encodeURIComponent(q)}`);
  }

  const tipOffset = champs.length;
  const creatorOffset = champs.length + (fresh ? tips.length : 0);
  const row = (key: string, href: string, i: number, content: React.ReactNode) => {
    return (
      <Link key={key} href={href} onClick={() => { setOpen(false); setQuery(""); onNavigate?.(); }} onMouseEnter={() => setActive(i)}
        className={cn("flex items-center gap-3 rounded-xl px-2.5 py-2", active === i ? "bg-white/[0.07]" : "hover:bg-white/[0.04]")}>
        {content}
      </Link>
    );
  };

  return (
    <div className={cn("relative", className)}>
      <form onSubmit={(e) => { e.preventDefault(); submit(); }} className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <input
          ref={inputRef}
          value={query}
          autoFocus={autoFocus}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); setActive(0); }}
          onFocus={() => setOpen(true)}
          onBlur={() => window.setTimeout(() => setOpen(false), 120)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(items.length - 1, a + 1)); }
            if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(0, a - 1)); }
            if (e.key === "Escape") { setOpen(false); inputRef.current?.blur(); }
          }}
          placeholder={placeholder}
          className="h-10 w-full rounded-xl border border-white/[0.07] bg-white/[0.04] pl-10 pr-10 text-sm outline-none transition-colors placeholder:text-muted/80 hover:border-white/[0.12] focus:border-accent/60 focus:bg-panel"
        />
        <kbd className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded-md border border-white/10 px-1.5 text-[10px] text-muted md:block">/</kbd>
      </form>
      {open && q && (
        <div className="absolute inset-x-0 top-12 z-50 overflow-hidden rounded-2xl border border-white/[0.08] bg-panel p-1.5 shadow-2xl shadow-black/70 pop-in">
          {champs.length > 0 && <div className="px-2.5 pb-1 pt-2 text-[10px] font-bold uppercase tracking-[0.14em] text-muted">Champions</div>}
          {champs.map((c, i) => row(`c-${c.id}`, `/champions/${c.id}`, i, <><ChampionIcon id={c.id} size={32} className="rounded-lg" /><div className="min-w-0"><div className="text-sm font-semibold">{c.name}</div><div className="truncate text-xs text-muted">{c.title}</div></div></>))}
          {fresh && tips.length > 0 && <div className="px-2.5 pb-1 pt-3 text-[10px] font-bold uppercase tracking-[0.14em] text-muted">Tips</div>}
          {fresh && tips.map((t, i) => row(`t-${t.id}`, `/t/${t.slug}`, tipOffset + i, <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={t.thumbnail} alt="" className="h-11 w-8 rounded-md object-cover" />
            <div className="min-w-0"><div className="truncate text-sm font-semibold">{t.title}</div><div className="truncate text-xs text-muted">{[t.championName, t.patch ? `Patch ${t.patch}` : null].filter(Boolean).join(" · ")}</div></div></>))}
          {fresh && creators.length > 0 && <div className="px-2.5 pb-1 pt-3 text-[10px] font-bold uppercase tracking-[0.14em] text-muted">Creators</div>}
          {fresh && creators.map((c, i) => row(`u-${c.id}`, `/u/${c.username}`, creatorOffset + i, <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={c.avatar_url || `https://api.dicebear.com/9.x/adventurer/svg?seed=${encodeURIComponent(c.username)}`} alt="" className="h-8 w-8 rounded-full" />
            <div><div className="text-sm font-semibold">{c.display_name}</div><div className="text-xs text-muted">@{c.username}</div></div></>))}
          <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => { recordSearch(q); go(`/search?q=${encodeURIComponent(q)}`); }} className="mt-1 flex w-full items-center gap-2 rounded-xl px-2.5 py-2.5 text-left text-sm text-muted hover:bg-white/[0.04] hover:text-white">
            <Search className="h-4 w-4 text-accent" />Search all tips for “{q}”<CornerDownLeft className="ml-auto h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

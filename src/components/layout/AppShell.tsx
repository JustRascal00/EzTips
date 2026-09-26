"use client";

import { useApp } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/cn";
import { Bookmark, Clapperboard, LayoutGrid, LogOut, PlaySquare, Search, Settings, ShieldCheck, Sparkles, Upload, UserRound, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Logo } from "../Logo";
import { ToastHost } from "../ToastHost";
import { Avatar, buttonClass, Skeleton } from "../ui";
import { GlobalSearch } from "./GlobalSearch";
import { useSupabaseQuery } from "@/lib/use-tips";

/** Admin / moderator shortcut with the number of open reports. Renders nothing for normal users. */
function AdminButton() {
  const { profile } = useAuth();
  const pathname = usePathname();
  const isModerator = profile?.role === "moderator" || profile?.role === "admin";
  // refetch when you navigate, so the badge updates after handling reports
  const { data: open } = useSupabaseQuery(`open-reports:${isModerator}:${pathname}`, async (client) => {
    if (!isModerator) return 0;
    const { count } = await client.from("reports").select("id", { count: "exact", head: true }).eq("status", "open");
    return count ?? 0;
  }, 0);
  if (!isModerator) return null;
  const active = pathname.startsWith("/admin");
  return (
    <Link
      href="/admin"
      title={open ? `${open} open reports` : "Admin dashboard"}
      className={buttonClass(active ? "outline" : "secondary", "sm", cn("relative", active && "border-accent/60 text-accent"))}
    >
      <ShieldCheck className="h-4 w-4 text-accent" />
      <span className="hidden sm:inline">Admin</span>
      {open > 0 && (
        <span className="absolute -right-1.5 -top-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-danger px-1 text-[10px] font-bold text-white shadow-lg">
          {open > 99 ? "99+" : open}
        </span>
      )}
    </Link>
  );
}

const NAV = [
  { href: "/", label: "Champions", icon: LayoutGrid, match: (p: string) => p === "/" || p.startsWith("/champions") },
  { href: "/home", label: "Feed", icon: PlaySquare, match: (p: string) => p.startsWith("/home") },
  { href: "/coach", label: "Coach", icon: Sparkles, match: (p: string) => p.startsWith("/coach") },
  { href: "/library", label: "Saved", icon: Bookmark, match: (p: string) => p.startsWith("/library") || p.startsWith("/following") },
];

function UserMenu() {
  const { currentUser, logout } = useApp();
  const { profile } = useAuth();
  const isModerator = profile?.role === "moderator" || profile?.role === "admin";
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();
  useEffect(() => {
    const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);
  const item = "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-muted hover:bg-white/[0.06] hover:text-white";
  return (
    <div className="relative" ref={ref}>
      <button type="button" onClick={() => setOpen((v) => !v)} className="flex items-center rounded-full ring-accent/60 transition hover:ring-2" aria-label="Account menu">
        <Avatar src={currentUser.avatar} alt="" size={34} />
      </button>
      {open && (
        <div className="absolute right-0 top-12 z-50 w-60 rounded-2xl border border-white/[0.08] bg-panel p-1.5 shadow-2xl shadow-black/60 pop-in" onClick={() => setOpen(false)}>
          <div className="px-2.5 py-2">
            <div className="truncate text-sm font-semibold">{currentUser.displayName}</div>
            <div className="truncate text-xs text-muted">@{currentUser.username}</div>
          </div>
          <div className="my-1 h-px bg-white/[0.06]" />
          <Link href={`/u/${currentUser.username}`} className={item}><UserRound className="h-4 w-4" />Profile</Link>
          <Link href="/studio" className={item}><Clapperboard className="h-4 w-4" />Creator Studio</Link>
          <Link href="/following" className={item}><Bookmark className="h-4 w-4" />Following</Link>
          <Link href="/settings" className={item}><Settings className="h-4 w-4" />Settings</Link>
          {isModerator && <Link href="/admin" className={item}><ShieldCheck className="h-4 w-4 text-accent" />Admin dashboard</Link>}
          <div className="my-1 h-px bg-white/[0.06]" />
          <button type="button" onClick={async () => { await logout(); router.push("/"); }} className={item}><LogOut className="h-4 w-4" />Sign out</button>
        </div>
      )}
    </div>
  );
}

function TopNav() {
  const pathname = usePathname();
  const { isLoggedIn, currentUser } = useApp();
  const [mobileSearch, setMobileSearch] = useState(false);
  return (
    <>
      <header className="sticky top-0 z-40 h-14 border-b border-white/[0.06] bg-bg/85 backdrop-blur-xl">
        <div className="mx-auto flex h-full max-w-[1400px] items-center gap-3 px-4 sm:px-6">
          <Link href="/" className="flex shrink-0 items-center"><Logo /></Link>
          <nav className="ml-4 hidden h-full items-center gap-1 md:flex">
            {NAV.map((item) => {
              const active = item.match(pathname);
              return (
                <Link key={item.href} href={item.href} className={cn("relative flex h-full items-center px-3 text-sm font-semibold transition-colors", active ? "text-white" : "text-muted hover:text-white")}>
                  {item.label}
                  {active && <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-accent shadow-[0_0_12px_#7657ff]" />}
                </Link>
              );
            })}
          </nav>
          <div className="ml-auto hidden w-full max-w-[380px] md:block lg:max-w-[440px]">
            <GlobalSearch />
          </div>
          <div className="ml-auto flex items-center gap-2 md:ml-2">
            <button type="button" onClick={() => setMobileSearch(true)} aria-label="Search" className="grid h-9 w-9 place-items-center rounded-lg text-muted hover:text-white md:hidden"><Search className="h-5 w-5" /></button>
            {isLoggedIn ? (
              <>
                <AdminButton />
                <Link href="/studio/upload" className={buttonClass("secondary", "sm", "hidden sm:inline-flex")}><Upload className="h-4 w-4" />Upload</Link>
                <UserMenu />
              </>
            ) : (
              <>
                <Link href={`/auth?next=${encodeURIComponent(pathname)}`} className={buttonClass("ghost", "sm")}>Sign in</Link>
                <Link href="/auth?mode=signup" className={buttonClass("primary", "sm", "hidden sm:inline-flex")}>Join free</Link>
              </>
            )}
          </div>
        </div>
      </header>
      {mobileSearch && (
        <div className="fixed inset-0 z-[90] bg-bg/95 p-4 backdrop-blur md:hidden">
          <div className="flex items-center gap-2">
            <GlobalSearch className="flex-1" autoFocus onNavigate={() => setMobileSearch(false)} />
            <button type="button" onClick={() => setMobileSearch(false)} aria-label="Close search" className="grid h-10 w-10 place-items-center rounded-xl text-muted"><X className="h-5 w-5" /></button>
          </div>
        </div>
      )}
      {/* phones: bottom tab bar */}
      <nav className="fixed inset-x-0 bottom-0 z-50 flex h-16 border-t border-white/[0.06] bg-bg/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden">
        {[...NAV, { href: isLoggedIn ? `/u/${currentUser.username}` : "/auth", label: isLoggedIn ? "Profile" : "Sign in", icon: UserRound, match: (p: string) => p.startsWith("/u/") || p.startsWith("/auth") }].map((item) => {
          const active = item.match(pathname);
          const Icon = item.icon;
          return (
            <Link key={item.label} href={item.href} className={cn("flex flex-1 flex-col items-center justify-center gap-1 text-[10px] font-semibold", active ? "text-white" : "text-muted")}>
              <Icon className={cn("h-5 w-5", active && "text-accent")} />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}

export function AppShell({
  children,
  right,
  hideRight,
  fullBleed,
  publicPage,
}: {
  children: ReactNode;
  right?: ReactNode;
  /** @deprecated kept for older pages; ignored */
  collapseSidebar?: boolean;
  hideRight?: boolean;
  fullBleed?: boolean;
  publicPage?: boolean;
  /** @deprecated kept for older pages; ignored */
  hideHeader?: boolean;
}) {
  const { hydrated, isLoggedIn } = useApp();
  const { configured } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (hydrated && !isLoggedIn && !publicPage) {
      router.replace(configured ? `/auth?next=${encodeURIComponent(pathname)}` : "/");
    }
  }, [configured, hydrated, isLoggedIn, pathname, router, publicPage]);

  const blocked = !hydrated || (!isLoggedIn && !publicPage);

  return (
    <div className="min-h-dvh bg-bg">
      <TopNav />
      {blocked ? (
        <div className="mx-auto max-w-[1400px] p-6"><Skeleton className="h-[60vh]" /></div>
      ) : fullBleed ? (
        <main className="h-[calc(100dvh-3.5rem-4rem)] md:h-[calc(100dvh-3.5rem)]">{children}</main>
      ) : (
        <div className="mx-auto flex w-full max-w-[1400px] gap-8 px-4 pb-24 sm:px-6 md:pb-12">
          <main className="min-w-0 flex-1">{children}</main>
          {!hideRight && right && <div className="hidden w-[300px] shrink-0 xl:block">{right}</div>}
        </div>
      )}
      <ToastHost />
    </div>
  );
}

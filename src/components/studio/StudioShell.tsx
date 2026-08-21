"use client";

import { Logo } from "@/components/Logo";
import { ToastHost } from "@/components/ToastHost";
import { Skeleton } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/cn";
import { useApp } from "@/lib/store";
import {
  BarChart3,
  Clapperboard,
  Compass,
  FileClock,
  FolderOpen,
  LayoutDashboard,
  MessageSquareText,
  Plus,
  Settings,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

const links = [
  { href: "/studio", label: "Dashboard", icon: LayoutDashboard },
  { href: "/studio/content", label: "Content", icon: Clapperboard },
  { href: "/studio/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/studio/comments", label: "Comments", icon: MessageSquareText },
  { href: "/studio/collections", label: "Collections / Series", icon: FolderOpen },
  { href: "/studio/drafts", label: "Drafts", icon: FileClock },
  { href: "/studio/profile", label: "Creator Profile", icon: UserRound },
  { href: "/studio/settings", label: "Settings", icon: Settings },
];

export function StudioShell({ children }: { children: ReactNode }) {
  const { hydrated, isLoggedIn, currentUser } = useApp();
  const { configured } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (hydrated && !isLoggedIn) {
      router.replace(configured ? `/auth?next=${encodeURIComponent(pathname)}` : "/");
    }
  }, [configured, hydrated, isLoggedIn, pathname, router]);

  if (!hydrated || !isLoggedIn) {
    return <div className="min-h-screen bg-bg p-6"><Skeleton className="h-[calc(100vh-3rem)]" /></div>;
  }

  return (
    <div className="min-h-screen bg-bg text-text lg:flex">
      <aside className="hidden lg:flex fixed inset-y-0 left-0 z-40 w-64 flex-col border-r border-border bg-sidebar">
        <div className="flex h-20 items-center border-b border-border px-6"><Logo /></div>
        <div className="px-5 pt-6 pb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-accent">Creator Studio</div>
        <nav className="flex-1 space-y-1 px-3">
          {links.map((item) => {
            const active = item.href === "/studio" ? pathname === item.href : pathname.startsWith(item.href);
            return (
              <Link key={item.href} href={item.href} className={cn("flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors", active ? "bg-accent/15 text-white" : "text-muted hover:bg-hover hover:text-text")}>
                <item.icon className={cn("h-[18px] w-[18px]", active && "text-accent")} />{item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-border p-3">
          <Link href="/home" className="flex items-center gap-3 rounded-xl p-3 text-sm text-muted hover:bg-hover hover:text-text"><Compass className="h-5 w-5" />Back to EZTips</Link>
          <div className="mt-1 flex items-center gap-3 rounded-xl p-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={currentUser.avatar} alt="" className="h-8 w-8 rounded-full object-cover" />
            <div className="min-w-0"><div className="truncate text-sm font-semibold">{currentUser.displayName}</div><div className="truncate text-xs text-muted">@{currentUser.username}</div></div>
          </div>
        </div>
      </aside>

      <div className="min-w-0 flex-1 lg:pl-64">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-bg/90 px-4 backdrop-blur sm:px-6 lg:h-20 lg:px-8">
          <div><div className="text-[11px] font-bold uppercase tracking-[0.16em] text-accent lg:hidden">EZTips</div><div className="font-semibold lg:text-lg">Creator Studio</div></div>
          <Link href="/studio/upload" className="inline-flex h-10 items-center gap-2 rounded-xl bg-accent px-4 text-sm font-semibold text-white transition-colors hover:bg-accent-hover"><Plus className="h-4 w-4" />Upload Tip</Link>
        </header>
        <nav className="no-scrollbar flex gap-1 overflow-x-auto border-b border-border bg-sidebar/60 px-3 py-2 lg:hidden">
          {links.map((item) => {
            const active = item.href === "/studio" ? pathname === item.href : pathname.startsWith(item.href);
            return <Link key={item.href} href={item.href} className={cn("shrink-0 rounded-lg px-3 py-2 text-xs font-medium", active ? "bg-accent/15 text-white" : "text-muted")}>{item.label}</Link>;
          })}
        </nav>
        <main className="mx-auto w-full max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
      </div>
      <ToastHost />
    </div>
  );
}

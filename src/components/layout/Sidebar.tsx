"use client";

import { creators } from "@/data/creators";
import { games } from "@/data/games";
import { cn } from "@/lib/cn";
import { useApp } from "@/lib/store";
import {
  Bell,
  BookOpen,
  Compass,
  GraduationCap,
  Home,
  Library,
  Settings,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "../Logo";
import { Avatar } from "../ui";

const nav = (loggedIn: boolean) => [
  { href: loggedIn ? "/home" : "/", label: "Home", icon: Home },
  { href: "/explore", label: "Explore", icon: Compass },
  { href: "/learn", label: "Learn", icon: GraduationCap },
  { href: "/library", label: "Library", icon: Library },
  { href: "/following", label: "Following", icon: Users },
];

export function Sidebar({
  collapsed,
  onOpenNotifs,
}: {
  collapsed?: boolean;
  onOpenNotifs?: () => void;
}) {
  const pathname = usePathname();
  const { currentUser, followedCreators, notifications, isLoggedIn } = useApp();
  const unread = notifications.filter((n) => !n.read).length;
  const followed = creators.filter((c) => followedCreators.includes(c.id)).slice(0, 6);

  return (
    <aside
      className={cn(
        "hidden md:flex h-screen sticky top-0 flex-col border-r border-border bg-sidebar",
        collapsed ? "w-[72px] px-2" : "w-[232px] px-3",
      )}
    >
      <Link href={isLoggedIn ? "/home" : "/"} className="flex items-center h-16 px-1">
        <Logo compact={collapsed} />
      </Link>
      <nav className="flex flex-col gap-0.5">
        {nav(isLoggedIn).map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-xl h-10 px-3 text-sm font-medium transition-colors duration-200",
                collapsed && "justify-center px-0",
                active ? "bg-accent/15 text-text" : "text-muted hover:bg-hover hover:text-text",
              )}
            >
              <Icon className={cn("h-[18px] w-[18px]", active && "text-accent")} />
              {!collapsed && item.label}
            </Link>
          );
        })}
      </nav>
      {!collapsed && (
        <div className="mt-6">
          <div className="px-3 text-[11px] font-semibold uppercase tracking-wider text-muted mb-2">
            Creators
          </div>
          <div className="flex flex-col gap-0.5">
            {followed.map((c) => (
              <Link
                key={c.id}
                href={`/c/${c.username}`}
                className="flex items-center gap-2.5 rounded-xl px-2 py-1.5 hover:bg-hover transition-colors duration-150"
              >
                <Avatar src={c.avatar} alt="" size={28} />
                <span className="text-sm truncate">{c.displayName}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
      <div className="mt-auto pb-4 space-y-1">
        <button
          onClick={onOpenNotifs}
          className={cn(
            "w-full flex items-center gap-3 rounded-xl h-10 px-3 text-sm text-muted hover:bg-hover hover:text-text",
            collapsed && "justify-center px-0",
          )}
        >
          <span className="relative">
            <Bell className="h-[18px] w-[18px]" />
            {unread > 0 && (
              <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-accent" />
            )}
          </span>
          {!collapsed && "Notifications"}
        </button>
        <Link
          href="/settings"
          className={cn(
            "flex items-center gap-3 rounded-xl h-10 px-3 text-sm text-muted hover:bg-hover hover:text-text",
            collapsed && "justify-center px-0",
          )}
        >
          <Settings className="h-[18px] w-[18px]" />
          {!collapsed && "Settings"}
        </Link>
        <Link
          href={`/u/${currentUser.username}`}
          className={cn(
            "flex items-center gap-3 rounded-xl h-11 px-2 hover:bg-hover",
            collapsed && "justify-center",
          )}
        >
          <Avatar src={currentUser.avatar} alt="" size={32} />
          {!collapsed && (
            <div className="min-w-0">
              <div className="text-sm font-medium truncate">{currentUser.displayName}</div>
              <div className="text-[11px] text-muted">Level {currentUser.level}</div>
            </div>
          )}
        </Link>
      </div>
    </aside>
  );
}

export function MobileNav() {
  const pathname = usePathname();
  const { currentUser } = useApp();
  const items = [
    { href: "/home", label: "Home", icon: Home },
    { href: "/explore", label: "Explore", icon: Compass },
    { href: "/upload", label: "Create", icon: BookOpen },
    { href: "/learn", label: "Learn", icon: GraduationCap },
    { href: `/u/${currentUser.username}`, label: "Profile", icon: Users },
  ];
  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 h-16 border-t border-border bg-sidebar/95 backdrop-blur flex">
      {items.map((item) => {
        const active = pathname === item.href || pathname.startsWith(item.href + "/");
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex-1 flex flex-col items-center justify-center gap-0.5 text-[11px]",
              active ? "text-text" : "text-muted",
            )}
          >
            <Icon className={cn("h-5 w-5", active && "text-accent")} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function RightRail({ children }: { children?: React.ReactNode }) {
  return (
    <aside className="hidden xl:block w-[300px] shrink-0 h-screen sticky top-0 border-l border-border bg-sidebar overflow-y-auto p-4">
      {children}
    </aside>
  );
}

export function RailSection({
  title,
  children,
  href,
}: {
  title: string;
  children: React.ReactNode;
  href?: string;
}) {
  return (
    <section className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">{title}</h3>
        {href && (
          <Link href={href} className="text-xs text-muted hover:text-text">
            See all
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}

export function YourGamesRail() {
  const { selectedGames, followedGames } = useApp();
  const ids = selectedGames.length ? selectedGames : followedGames;
  const list = games.filter((g) => ids.includes(g.id)).slice(0, 5);
  if (!list.length) return null;
  return (
    <RailSection title="Your Games" href="/explore">
      <div className="space-y-2">
        {list.map((g) => (
          <Link
            key={g.id}
            href={`/g/${g.slug}`}
            className="flex items-center gap-2.5 rounded-xl px-2 py-1.5 hover:bg-hover"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={g.icon} alt="" className="h-8 w-8 rounded-lg object-cover" />
            <span className="text-sm font-medium truncate">{g.name}</span>
          </Link>
        ))}
      </div>
    </RailSection>
  );
}

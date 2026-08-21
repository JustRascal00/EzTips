"use client";

import { useApp } from "@/lib/store";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { SearchBar } from "../SearchBar";
import { ToastHost } from "../ToastHost";
import { Skeleton } from "../ui";
import { MobileNav, Sidebar } from "./Sidebar";
import { NotificationPanel } from "./Notifications";
import Link from "next/link";
import { Plus } from "lucide-react";

export function AppShell({
  children,
  right,
  collapseSidebar,
  hideRight,
  fullBleed,
  publicPage,
}: {
  children: ReactNode;
  right?: ReactNode;
  collapseSidebar?: boolean;
  hideRight?: boolean;
  fullBleed?: boolean;
  publicPage?: boolean;
}) {
  const { hydrated, isLoggedIn } = useApp();
  const router = useRouter();
  const [notifs, setNotifs] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1100px)");
    const apply = () => setCollapsed(mq.matches || !!collapseSidebar);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [collapseSidebar]);

  useEffect(() => {
    if (hydrated && !isLoggedIn && !publicPage) router.replace("/");
  }, [hydrated, isLoggedIn, router, publicPage]);

  if (!hydrated || (!isLoggedIn && !publicPage)) {
    return (
      <div className="min-h-screen bg-bg p-6">
        <Skeleton className="h-screen rounded-none" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg flex">
      <Sidebar collapsed={collapsed} onOpenNotifs={() => setNotifs(true)} />
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="hidden md:flex h-16 items-center gap-4 px-6 border-b border-border bg-bg/80 backdrop-blur sticky top-0 z-30">
          <SearchBar className="max-w-xl flex-1" />
          {isLoggedIn ? (
            <Link
              href="/upload"
              className="ml-auto inline-flex items-center gap-2 h-10 px-3 rounded-xl bg-card border border-border text-sm hover:bg-hover transition-colors duration-200"
            >
              <Plus className="h-4 w-4" />
              Upload
            </Link>
          ) : (
            <Link
              href="/onboarding"
              className="ml-auto inline-flex items-center h-10 px-4 rounded-xl bg-accent text-sm font-medium hover:bg-accent-hover"
            >
              Build my feed
            </Link>
          )}
        </header>
        <div className="flex flex-1 min-h-0">
          <main
            className={
              fullBleed
                ? "flex-1 min-w-0"
                : "flex-1 min-w-0 overflow-y-auto pb-20 md:pb-8"
            }
          >
            {children}
          </main>
          {!hideRight && right}
        </div>
      </div>
      <MobileNav />
      <NotificationPanel open={notifs} onClose={() => setNotifs(false)} />
      <ToastHost />
    </div>
  );
}

"use client";

import { useApp } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { SearchBar } from "../SearchBar";
import { ToastHost } from "../ToastHost";
import { Skeleton } from "../ui";
import { MobileNav, Sidebar } from "./Sidebar";
import { NotificationPanel } from "./Notifications";

export function AppShell({
  children,
  right,
  collapseSidebar,
  hideRight,
  fullBleed,
  publicPage,
  hideHeader,
}: {
  children: ReactNode;
  right?: ReactNode;
  collapseSidebar?: boolean;
  hideRight?: boolean;
  fullBleed?: boolean;
  publicPage?: boolean;
  hideHeader?: boolean;
}) {
  const { hydrated, isLoggedIn } = useApp();
  const { configured } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
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
    if (hydrated && !isLoggedIn && !publicPage) {
      router.replace(configured ? `/auth?next=${encodeURIComponent(pathname)}` : "/");
    }
  }, [configured, hydrated, isLoggedIn, pathname, router, publicPage]);

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
        {!hideHeader && (
          <header className="hidden md:flex h-16 items-center gap-4 px-6 border-b border-border bg-bg/80 backdrop-blur sticky top-0 z-30">
            <SearchBar className="max-w-xl flex-1" />
          </header>
        )}
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

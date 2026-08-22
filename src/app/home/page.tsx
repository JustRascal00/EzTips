"use client";

import { HomeFeed } from "@/components/feed/HomeFeed";
import { AppShell } from "@/components/layout/AppShell";

export default function HomePage() {
  return (
    <AppShell hideRight fullBleed hideHeader>
      <HomeFeed />
    </AppShell>
  );
}

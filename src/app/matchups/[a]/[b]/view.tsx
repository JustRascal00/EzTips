"use client";

import { AppShell } from "@/components/layout/AppShell";
import { MatchupView } from "@/components/matchups";
import { ChevronRight } from "lucide-react";
import Link from "next/link";

export function MatchupPage({ me, vs }: { me: { id: string; name: string }; vs: { id: string; name: string } }) {
  return (
    <AppShell publicPage>
      <nav className="flex items-center gap-1.5 pt-5 text-sm text-muted">
        <Link href="/" className="hover:text-white">Champions</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <Link href={`/champions/${me.id}#matchups`} className="hover:text-white">{me.name}</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-white/80">vs {vs.name}</span>
      </nav>
      <div className="mt-4 pb-10">
        <MatchupView me={me} vs={vs} />
      </div>
    </AppShell>
  );
}

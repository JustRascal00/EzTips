"use client";

import { TipGrid } from "@/components/league";
import { AppShell } from "@/components/layout/AppShell";
import { Button, EmptyState, Tabs } from "@/components/ui";
import { useApp } from "@/lib/store";
import { getTipsByIds } from "@/lib/tips";
import type { Tutorial } from "@/lib/types";
import { useSupabaseQuery } from "@/lib/use-tips";
import Link from "next/link";
import { useState } from "react";

export default function LibraryPage() {
  const { saved, liked, history } = useApp();
  const [tab, setTab] = useState("saved");

  const ids = [...saved, ...liked, ...history];
  const { data: found } = useSupabaseQuery(`library:${ids.join(",")}`, (client) => getTipsByIds(client, ids), [] as Tutorial[]);
  const byId = new Map(found.map((tip) => [tip.id, tip]));
  const byIds = (list: string[]) => list.map((id) => byId.get(id)).filter(Boolean);

  const savedList = byIds(saved);
  const likedList = byIds(liked);
  const histList = byIds(history);

  return (
    <AppShell>
      <div className="py-8">
        <h1 className="display text-4xl font-extrabold">Your library</h1>
        <p className="text-muted mt-1">Tips you saved, upvoted or watched.</p>
        <Tabs
          className="mt-6"
          tabs={[
            { id: "saved", label: "Saved", count: savedList.length },
            { id: "liked", label: "Upvoted", count: likedList.length },
            { id: "history", label: "History" },
          ]}
          value={tab}
          onChange={setTab}
        />

        {tab === "saved" && (
          <div className="mt-6">
            {savedList.length === 0 ? (
              <EmptyState
                title="Your library is empty"
                body="Save useful clips and they’ll appear here."
                action={
                  <Link href="/explore">
                    <Button>Explore clips</Button>
                  </Link>
                }
              />
            ) : (
              <TipGrid tips={savedList as Tutorial[]} />
            )}
          </div>
        )}

        {tab === "liked" && (
          <div className="mt-6"><TipGrid tips={likedList as Tutorial[]} empty={<EmptyState title="No upvoted tips yet" body="Upvote a tip and it lands here." />} /></div>
        )}

        {tab === "history" && (
          <div className="mt-6"><TipGrid tips={histList as Tutorial[]} empty={<EmptyState title="Nothing watched yet" body="Tips you open show up here." />} /></div>
        )}
      </div>
    </AppShell>
  );
}

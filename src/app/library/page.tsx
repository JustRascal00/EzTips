"use client";

import { TutorialCard } from "@/components/cards";
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
      <div className="px-6 py-8 max-w-5xl">
        <h1 className="text-3xl font-bold">Saved</h1>
        <p className="text-muted mt-1">Keep useful clips organized for your next queue.</p>
        <Tabs
          className="mt-6"
          tabs={[
            { id: "saved", label: "Saved Clips" },
            { id: "liked", label: "Liked" },
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
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {savedList.map((t) => t && <TutorialCard key={t.id} tutorial={t} />)}
              </div>
            )}
          </div>
        )}

        {tab === "liked" && (
          <div className="mt-6 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {likedList.length === 0 ? (
              <div className="col-span-full">
                <EmptyState title="No liked clips" body="Like a clip and it will land here." />
              </div>
            ) : (
              likedList.map((t) => t && <TutorialCard key={t.id} tutorial={t} />)
            )}
          </div>
        )}

        {tab === "history" && (
          <div className="mt-6 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {histList.map((t) => t && <TutorialCard key={t.id} tutorial={t} />)}
          </div>
        )}
      </div>
    </AppShell>
  );
}

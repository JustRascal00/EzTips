"use client";

import { TutorialCard } from "@/components/cards";
import { AppShell } from "@/components/layout/AppShell";
import { Button, EmptyState, Tabs } from "@/components/ui";
import { tutorials } from "@/data/tutorials";
import { useApp } from "@/lib/store";
import Link from "next/link";
import { useState } from "react";

export default function LibraryPage() {
  const { saved, liked, history, collections } = useApp();
  const [tab, setTab] = useState("continue");

  const byIds = (ids: string[]) =>
    ids.map((id) => tutorials.find((t) => t.id === id)).filter(Boolean);

  const continueList = byIds(history).slice(0, 8);
  const savedList = byIds(saved);
  const likedList = byIds(liked);
  const histList = byIds(history);

  return (
    <AppShell>
      <div className="px-6 py-8 max-w-5xl">
        <h1 className="text-3xl font-bold">Library</h1>
        <p className="text-muted mt-1">Your knowledge base — saved clips, collections, history.</p>
        <Tabs
          className="mt-6"
          tabs={[
            { id: "continue", label: "Continue Learning" },
            { id: "saved", label: "Saved Tutorials" },
            { id: "collections", label: "Collections" },
            { id: "liked", label: "Liked" },
            { id: "history", label: "History" },
          ]}
          value={tab}
          onChange={setTab}
        />

        {tab === "continue" && (
          <div className="mt-6">
            {continueList.length === 0 ? (
              <EmptyState
                title="Nothing to continue yet"
                body="Watch a tutorial and it’ll show up here so you can pick up where you left off."
                action={
                  <Link href="/explore">
                    <Button>Explore tutorials</Button>
                  </Link>
                }
              />
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {continueList.map((t) => t && <TutorialCard key={t.id} tutorial={t} />)}
              </div>
            )}
          </div>
        )}

        {tab === "saved" && (
          <div className="mt-6">
            {savedList.length === 0 ? (
              <EmptyState
                title="Your library is empty"
                body="Save useful tutorials and they’ll appear here."
                action={
                  <Link href="/explore">
                    <Button>Explore tutorials</Button>
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

        {tab === "collections" && (
          <div className="mt-6">
            <h2 className="text-lg font-semibold mb-3">My Collections</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              {collections.map((c) => (
                <div key={c.id} className="rounded-2xl border border-border bg-card p-5">
                  <h3 className="font-semibold">{c.name}</h3>
                  <p className="text-sm text-muted mt-1">
                    {c.tutorialIds.length} tutorials {c.public ? "· Public" : "· Private"}
                  </p>
                </div>
              ))}
            </div>
            {collections.map((c) => {
              const list = byIds(c.tutorialIds);
              if (!list.length) return null;
              return (
                <div key={c.id + "-g"} className="mt-8">
                  <h3 className="font-semibold mb-3">{c.name}</h3>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {list.map((t) => t && <TutorialCard key={t.id} tutorial={t} />)}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {tab === "liked" && (
          <div className="mt-6 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {likedList.length === 0 ? (
              <div className="col-span-full">
                <EmptyState title="No liked tutorials" body="Like a clip and it will land here." />
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

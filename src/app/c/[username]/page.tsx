"use client";

import { FollowButton } from "@/components/actions";
import { PathCard, TutorialCard } from "@/components/cards";
import { AppShell } from "@/components/layout/AppShell";
import { Button, RankBadge, Tabs, VerifiedMark } from "@/components/ui";
import { getCreator } from "@/data/creators";
import { getGame } from "@/data/games";
import { pathsByGame } from "@/data/paths";
import { tutorialsByCreator } from "@/data/tutorials";
import { formatCount } from "@/lib/format";
import { useApp } from "@/lib/store";
import { notFound, useParams } from "next/navigation";
import { useState } from "react";

export default function CreatorPage() {
  const { username } = useParams<{ username: string }>();
  const creator = getCreator(username);
  const { toast } = useApp();
  const [tab, setTab] = useState("tutorials");
  if (!creator) return notFound();
  const game = getGame(creator.gameId);
  const tuts = tutorialsByCreator(creator.id);
  const paths = pathsByGame(creator.gameId).slice(0, 3);

  return (
    <AppShell publicPage>
      <div className="px-6 py-8 max-w-5xl">
        <div className="flex flex-col sm:flex-row gap-6 items-start">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={creator.avatar} alt="" className="h-24 w-24 rounded-full border border-border" />
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-3xl font-bold">{creator.displayName}</h1>
              {creator.verified && <VerifiedMark className="h-5 w-5" />}
              <RankBadge label={creator.credential.label} type={creator.credential.type} />
            </div>
            <div className="text-muted mt-1">@{creator.username}</div>
            <p className="mt-3 text-sm leading-relaxed max-w-xl">{creator.bio}</p>
            <div className="flex gap-6 mt-4 text-sm">
              <div>
                <span className="font-semibold">{formatCount(creator.followers)}</span>{" "}
                <span className="text-muted">Followers</span>
              </div>
              <div>
                <span className="font-semibold">{formatCount(creator.likes)}</span>{" "}
                <span className="text-muted">Likes</span>
              </div>
              <div>
                <span className="font-semibold">{formatCount(creator.helpfulVotes)}</span>{" "}
                <span className="text-muted">Helpful votes</span>
              </div>
            </div>
            <div className="text-sm text-muted mt-2">
              {game?.name} · {creator.mainFocus}
            </div>
          </div>
          <div className="flex gap-2">
            <FollowButton creatorId={creator.id} />
            <Button variant="secondary" onClick={() => toast("Messaging isn’t enabled in this demo")}>
              Message
            </Button>
          </div>
        </div>
        <Tabs
          className="mt-8"
          tabs={[
            { id: "tutorials", label: "Tutorials" },
            { id: "guides", label: "Guides" },
            { id: "paths", label: "Learning Paths" },
            { id: "about", label: "About" },
          ]}
          value={tab}
          onChange={setTab}
        />
        {tab === "tutorials" && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
            {tuts.map((t) => (
              <TutorialCard key={t.id} tutorial={t} />
            ))}
          </div>
        )}
        {tab === "guides" && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
            {tuts.filter((t) => t.duration > 45).map((t) => (
              <TutorialCard key={t.id} tutorial={t} />
            ))}
          </div>
        )}
        {tab === "paths" && (
          <div className="grid md:grid-cols-3 gap-4 mt-6">
            {paths.map((p) => (
              <PathCard key={p.id} path={p} />
            ))}
          </div>
        )}
        {tab === "about" && (
          <div className="mt-6 max-w-xl text-sm leading-relaxed text-muted space-y-3">
            <p>{creator.bio}</p>
            <p>
              Credential: {creator.credential.label}. Main game {game?.name}. Focused on{" "}
              {creator.mainFocus}.
            </p>
          </div>
        )}
      </div>
    </AppShell>
  );
}

"use client";

import { FollowButton, HelpfulButton, SaveControl } from "@/components/actions";
import { CommentThread } from "@/components/Comments";
import { TutorialCard } from "@/components/cards";
import { AppShell } from "@/components/layout/AppShell";
import { RightRail, RailSection } from "@/components/layout/Sidebar";
import { VideoPlayer } from "@/components/VideoPlayer";
import { Chip, RankBadge, VerifiedMark } from "@/components/ui";
import { getCreator } from "@/data/creators";
import { getGame } from "@/data/games";
import { getTutorial, tutorials } from "@/data/tutorials";
import { formatDuration, formatCount, skillLabel } from "@/lib/format";
import { useApp } from "@/lib/store";
import { Heart, Share2 } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { useEffect } from "react";

export function TutorialView({ slug }: { slug: string }) {
  const tutorial = getTutorial(slug);
  const { liked, toggleLike, addHistory, toast } = useApp();

  useEffect(() => {
    if (!tutorial) return;
    addHistory(tutorial.id);
  }, [tutorial?.id, addHistory]);

  if (!tutorial) return notFound();
  const game = getGame(tutorial.gameId);
  const creator = getCreator(tutorial.creatorId);
  const related = tutorials
    .filter(
      (t) =>
        t.id !== tutorial.id &&
        (t.gameId === tutorial.gameId || t.category === tutorial.category),
    )
    .slice(0, 6);
  const likeOn = liked.includes(tutorial.id);

  return (
    <AppShell
      publicPage
      right={
        <RightRail>
          <RailSection title="Related">
            <div className="space-y-3">
              {related.slice(0, 4).map((t) => (
                <Link key={t.id} href={`/t/${t.slug}`} className="block text-sm text-muted hover:text-text">
                  {t.title}
                </Link>
              ))}
            </div>
          </RailSection>
        </RightRail>
      }
    >
      <article className="max-w-3xl px-6 py-8">
        <div className="aspect-video w-full">
          <VideoPlayer
            src={tutorial.videoUrl}
            poster={tutorial.thumbnail}
            active
            captions={tutorial.learn}
            className="h-full w-full"
          />
        </div>
        <div className="text-sm text-muted mt-5">
          <Link href={`/g/${game?.slug}`} className="hover:text-text">
            {game?.name}
          </Link>
          {" > "}
          {tutorial.category}
          {" > "}
          {tutorial.topic}
        </div>
        <h1 className="text-3xl font-bold mt-2 tracking-tight">{tutorial.title}</h1>
        {creator && (
          <div className="flex items-center justify-between gap-3 mt-4 flex-wrap">
            <Link href={`/c/${creator.username}`} className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={creator.avatar} alt="" className="h-11 w-11 rounded-full border border-border" />
              <div>
                <div className="flex items-center gap-1 font-semibold">
                  @{creator.username}
                  {creator.verified && <VerifiedMark />}
                </div>
                <div className="text-xs text-muted">{creator.credential.label}</div>
              </div>
            </Link>
            <FollowButton creatorId={creator.id} />
          </div>
        )}
        <div className="flex items-center gap-2 mt-3 text-sm text-muted">
          <RankBadge label={skillLabel(tutorial.skillLevel)} type="level" />
          <span>{formatDuration(tutorial.duration)}</span>
          <span>·</span>
          <span>{formatCount(tutorial.views)} views</span>
        </div>
        <div className="flex flex-wrap items-center gap-2 mt-4">
          <button
            onClick={() => toggleLike(tutorial.id)}
            className="h-10 px-3 rounded-xl border border-border bg-card text-sm inline-flex items-center gap-2 hover:bg-hover"
          >
            <Heart className={`h-4 w-4 ${likeOn ? "fill-current text-danger" : ""}`} />
            Like
          </button>
          <HelpfulButton
            tutorialId={tutorial.id}
            countLabel={`${tutorial.helpfulPercent}% found this helpful`}
          />
          <SaveControl tutorialId={tutorial.id} />
          <button
            onClick={() => {
              navigator.clipboard?.writeText(window.location.href);
              toast("Link copied");
            }}
            className="h-10 w-10 rounded-xl border border-border bg-card grid place-items-center hover:bg-hover"
            aria-label="Share"
          >
            <Share2 className="h-4 w-4" />
          </button>
        </div>
        <div className="flex flex-wrap gap-1.5 mt-4">
          {tutorial.tags.map((tag) => (
            <Link key={tag} href={`/search?q=${encodeURIComponent(tag)}`}>
              <Chip>#{tag}</Chip>
            </Link>
          ))}
        </div>

        <section className="mt-10">
          <h2 className="text-lg font-semibold">About this clip</h2>
          <p className="text-muted mt-2 leading-relaxed">{tutorial.learn}</p>
        </section>
        <section className="mt-8">
          <h2 className="text-lg font-semibold">Key points</h2>
          <ol className="mt-3 space-y-2">
            {tutorial.takeaways.map((k, i) => (
              <li key={k} className="flex gap-3 text-sm leading-relaxed">
                <span className="text-muted w-5">{String(i + 1).padStart(2, "0")}</span>
                {k}
              </li>
            ))}
          </ol>
        </section>
        <section className="mt-10">
          <h2 className="text-lg font-semibold mb-4">Related clips</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {related.map((t) => (
              <TutorialCard key={t.id} tutorial={t} />
            ))}
          </div>
        </section>
        <div id="comments" className="mt-12">
          <CommentThread tutorialId={tutorial.id} />
        </div>
      </article>
    </AppShell>
  );
}

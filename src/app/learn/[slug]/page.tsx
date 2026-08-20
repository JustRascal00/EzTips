"use client";

import { AppShell } from "@/components/layout/AppShell";
import { Button, Progress } from "@/components/ui";
import { VideoPlayer } from "@/components/VideoPlayer";
import { getGame } from "@/data/games";
import { getPath, pathDuration } from "@/data/paths";
import { getTutorial } from "@/data/tutorials";
import { formatDuration, skillLabel } from "@/lib/format";
import { useApp } from "@/lib/store";
import { cn } from "@/lib/cn";
import { Check, Circle, Play } from "lucide-react";
import { notFound, useParams } from "next/navigation";
import { useState } from "react";

export default function PathPage() {
  const { slug } = useParams<{ slug: string }>();
  const path = getPath(slug);
  const { pathProgress, completeLesson } = useApp();
  const [active, setActive] = useState<string | null>(null);

  if (!path) return notFound();
  const game = getGame(path.gameId);
  const done = pathProgress[path.id] ?? [];
  const pct = Math.round((done.length / path.lessons.length) * 100);
  const current =
    path.lessons.find((l) => l.id === active) ??
    path.lessons.find((l) => !done.includes(l.id)) ??
    path.lessons[0];
  const tutorial = current.tutorialId ? getTutorial(current.tutorialId) : undefined;
  const src = tutorial?.videoUrl ?? getTutorial("t1")!.videoUrl;

  return (
    <AppShell hideRight publicPage>
      <div className="max-w-5xl mx-auto px-6 py-8 grid lg:grid-cols-[1fr_320px] gap-8">
        <div>
          <div className="text-sm text-muted">
            {game?.name} · {path.category} · {skillLabel(path.skillLevel)}
          </div>
          <h1 className="text-3xl font-bold mt-1">{path.title}</h1>
          <p className="text-muted mt-2 max-w-xl">{path.description}</p>
          <div className="flex gap-3 text-sm text-muted mt-3">
            <span>{path.lessons.length} lessons</span>
            <span>{formatDuration(pathDuration(path))}</span>
          </div>
          <div className="mt-4 max-w-md">
            <Progress value={pct} className="h-2" />
            <div className="text-sm text-muted mt-1">{pct}%</div>
          </div>
          <div className="mt-6 aspect-video">
            <VideoPlayer
              src={src}
              poster={tutorial?.thumbnail ?? path.thumbnail}
              active
              captions={tutorial?.learn ?? current.title}
              className="h-full w-full"
            />
          </div>
          <div className="mt-4 flex items-center justify-between">
            <div>
              <div className="text-xs text-muted">Now playing</div>
              <h2 className="font-semibold text-lg">{current.title}</h2>
            </div>
            <Button
              onClick={() => completeLesson(path.id, current.id)}
              variant={done.includes(current.id) ? "success" : "primary"}
            >
              {done.includes(current.id) ? "Completed" : "Mark complete"}
            </Button>
          </div>
        </div>
        <aside>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted mb-3">Lessons</h3>
          <ol className="space-y-1">
            {path.lessons.map((l, i) => {
              const isDone = done.includes(l.id);
              const isCur = current.id === l.id;
              return (
                <li key={l.id}>
                  <button
                    onClick={() => setActive(l.id)}
                    className={cn(
                      "w-full text-left rounded-xl px-3 py-2.5 flex items-center gap-3 text-sm transition-colors duration-150",
                      isCur ? "bg-accent/15" : "hover:bg-hover",
                    )}
                  >
                    <span className="w-6 text-muted text-xs">{String(i + 1).padStart(2, "0")}</span>
                    {isDone ? (
                      <Check className="h-4 w-4 text-success" />
                    ) : isCur ? (
                      <Play className="h-4 w-4 text-accent" />
                    ) : (
                      <Circle className="h-4 w-4 text-muted" />
                    )}
                    <span className="flex-1 truncate">{l.title}</span>
                    <span className="text-xs text-muted">{l.duration}s</span>
                  </button>
                </li>
              );
            })}
          </ol>
        </aside>
      </div>
    </AppShell>
  );
}

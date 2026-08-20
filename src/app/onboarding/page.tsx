"use client";

import { Logo } from "@/components/Logo";
import { GameCard } from "@/components/cards";
import { Button, Chip } from "@/components/ui";
import { games } from "@/data/games";
import { cn } from "@/lib/cn";
import { useApp } from "@/lib/store";
import type { SkillLevel } from "@/lib/types";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

const levels: { id: SkillLevel; title: string; body: string }[] = [
  {
    id: "beginner",
    title: "Beginner",
    body: "Still learning the rules, roles, and default habits.",
  },
  {
    id: "intermediate",
    title: "Intermediate",
    body: "You know the game. You want cleaner decisions.",
  },
  {
    id: "advanced",
    title: "Advanced",
    body: "High rank or high hours. You want specifics.",
  },
  {
    id: "competitive",
    title: "Competitive",
    body: "Playing to climb or coach. Optimize every round.",
  },
];

export default function OnboardingPage() {
  const { completeOnboarding } = useApp();
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [picked, setPicked] = useState<string[]>(["lol", "valorant"]);
  const [goals, setGoals] = useState<Record<string, string[]>>({
    lol: ["mid"],
    valorant: ["aim"],
  });
  const [skill, setSkill] = useState<SkillLevel>("intermediate");

  const selectedGames = useMemo(
    () => games.filter((g) => picked.includes(g.id)),
    [picked],
  );

  const toggleGame = (id: string) => {
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  };

  const toggleGoal = (gameId: string, goalId: string) => {
    setGoals((g) => {
      const cur = g[gameId] ?? [];
      return {
        ...g,
        [gameId]: cur.includes(goalId) ? cur.filter((x) => x !== goalId) : [...cur, goalId],
      };
    });
  };

  return (
    <div className="min-h-screen bg-bg">
      <header className="h-16 px-6 flex items-center justify-between border-b border-border">
        <Logo />
        <div className="text-sm text-muted">Step {step} of 3</div>
      </header>
      <div className="max-w-4xl mx-auto px-5 py-10">
        <div className="h-1 rounded-full bg-border mb-10 overflow-hidden">
          <div className="h-full bg-accent transition-all duration-200" style={{ width: `${(step / 3) * 100}%` }} />
        </div>

        {step === 1 && (
          <div className="fade-up">
            <h1 className="text-3xl font-bold">What games do you play?</h1>
            <p className="text-muted mt-2">Select as many as you want. This shapes your feed and hubs.</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-8">
              {games.map((g) => (
                <GameCard
                  key={g.id}
                  game={g}
                  selected={picked.includes(g.id)}
                  onSelect={() => toggleGame(g.id)}
                />
              ))}
            </div>
            <div className="flex justify-end mt-8">
              <Button size="lg" disabled={picked.length === 0} onClick={() => setStep(2)}>
                Continue
              </Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="fade-up">
            <h1 className="text-3xl font-bold">What do you want to improve?</h1>
            <p className="text-muted mt-2">
              Options change with the games you picked. Be specific — it&apos;s how we rank tutorials.
            </p>
            <div className="space-y-8 mt-8">
              {selectedGames.map((g) => (
                <div key={g.id}>
                  <h2 className="font-semibold mb-3">{g.name}</h2>
                  <div className="flex flex-wrap gap-2">
                    {g.goals.map((goal) => {
                      const on = (goals[g.id] ?? []).includes(goal.id);
                      return (
                        <button
                          key={goal.id}
                          onClick={() => toggleGoal(g.id, goal.id)}
                          className={cn(
                            "h-10 px-4 rounded-xl border text-sm font-medium transition-colors duration-150",
                            on
                              ? "border-accent bg-accent/15 text-text"
                              : "border-border bg-card text-muted hover:text-text hover:bg-hover",
                          )}
                        >
                          {goal.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-between mt-8">
              <Button variant="ghost" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button size="lg" onClick={() => setStep(3)}>
                Continue
              </Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="fade-up">
            <h1 className="text-3xl font-bold">What&apos;s your skill level?</h1>
            <p className="text-muted mt-2">
              We use this to personalize tutorials — beginner clips won&apos;t bury matchup-specific
              ones if you&apos;re already climbing.
            </p>
            <div className="grid sm:grid-cols-2 gap-3 mt-8">
              {levels.map((lv) => (
                <button
                  key={lv.id}
                  onClick={() => setSkill(lv.id)}
                  className={cn(
                    "text-left rounded-2xl border p-4 transition-colors duration-150",
                    skill === lv.id
                      ? "border-accent bg-accent/10"
                      : "border-border bg-card hover:bg-hover",
                  )}
                >
                  <div className="font-semibold">{lv.title}</div>
                  <div className="text-sm text-muted mt-1">{lv.body}</div>
                </button>
              ))}
            </div>
            <div className="mt-6 flex flex-wrap gap-2">
              {selectedGames.map((g) => (
                <Chip key={g.id} active>
                  {g.name}
                </Chip>
              ))}
              <Chip>{levels.find((l) => l.id === skill)?.title}</Chip>
            </div>
            <div className="flex justify-between mt-8">
              <Button variant="ghost" onClick={() => setStep(2)}>
                Back
              </Button>
              <Button
                size="lg"
                onClick={() => {
                  completeOnboarding(picked, goals, skill);
                  router.push("/home");
                }}
              >
                Build my feed
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

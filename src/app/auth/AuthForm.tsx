"use client";

import { GameLogo } from "@/components/GameLogo";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui";
import { games } from "@/data/games";
import { tutorials } from "@/data/tutorials";
import { useAuth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/client";
import {
  ArrowLeft,
  ArrowRight,
  AtSign,
  Bookmark,
  Check,
  CheckCircle2,
  Eye,
  EyeOff,
  Heart,
  LoaderCircle,
  LockKeyhole,
  Mail,
  Play,
  Sparkles,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";

const inputClass =
  "h-12 w-full rounded-2xl border border-border bg-elevated/75 pl-11 pr-4 text-[15px] text-white outline-none transition placeholder:text-muted/60 hover:border-white/15 focus:border-accent focus:bg-elevated focus:ring-4 focus:ring-accent/10";

export function AuthForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { configured, loading, user } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">(
    searchParams.get("mode") === "signup" ? "signup" : "signin",
  );
  const [pending, setPending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const next = searchParams.get("next") || (mode === "signup" ? "/onboarding" : "/home");

  useEffect(() => {
    if (!loading && user) router.replace(next);
  }, [loading, next, router, user]);

  const changeMode = (nextMode: "signin" | "signup") => {
    setMode(nextMode);
    setError("");
    setMessage("");
  };

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    setMessage("");
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") || "").trim();
    const password = String(form.get("password") || "");
    const displayName = String(form.get("displayName") || "").trim();
    const username = String(form.get("username") || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, "");
    const supabase = createClient();
    if (!supabase) {
      setError("Supabase is not configured yet. Add the two environment variables from .env.example.");
      setPending(false);
      return;
    }

    if (mode === "signup") {
      if (password.length < 8) {
        setError("Use at least 8 characters for your password.");
        setPending(false);
        return;
      }
      const { data, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { display_name: displayName, username },
          emailRedirectTo: `${window.location.origin}/auth/callback?next=/onboarding`,
        },
      });
      if (authError) setError(authError.message);
      else if (data.session) router.replace("/onboarding");
      else setMessage("Account created. Check your email to confirm it, then come back and sign in.");
    } else {
      const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (authError) setError(authError.message);
      else router.replace(next);
    }
    setPending(false);
  }

  return (
    <main className="min-h-dvh bg-bg lg:grid lg:grid-cols-[minmax(0,1.08fr)_minmax(480px,0.92fr)]">
      <AuthShowcase />

      <section className="relative flex min-h-dvh flex-col bg-[#0b0d12]">
        <header className="flex h-20 items-center justify-between px-5 sm:px-8 lg:px-10">
          <Link href="/" className="lg:hidden"><Logo /></Link>
          <Link href="/" className="ml-auto inline-flex items-center gap-2 text-sm font-medium text-muted transition hover:text-white">
            <ArrowLeft className="h-4 w-4" />
            Back to EZTips
          </Link>
        </header>

        <div className="flex flex-1 items-center justify-center px-5 pb-12 sm:px-8 lg:px-12">
          <div className="w-full max-w-[430px] fade-up">
            <div className="mb-8 inline-flex items-center gap-1 border-b border-border">
              {(["signin", "signup"] as const).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => changeMode(item)}
                  className={`relative px-1 pb-3 pt-1 text-sm font-semibold transition ${
                    item === "signup" ? "ml-7" : ""
                  } ${mode === item ? "text-white" : "text-muted hover:text-white"}`}
                >
                  {item === "signin" ? "Sign in" : "Create account"}
                  {mode === item && <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-accent" />}
                </button>
              ))}
            </div>

            <div className="mb-7">
              <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-[#9d89ff]">
                <Sparkles className="h-3.5 w-3.5" />
                {mode === "signin" ? "Your feed is waiting" : "One account. Every game."}
              </div>
              <h1 className="text-[32px] font-bold leading-[1.08] tracking-[-0.035em] sm:text-4xl">
                {mode === "signin" ? "Good to see you again." : "Start finding better clips."}
              </h1>
              <p className="mt-3 max-w-sm text-[15px] leading-6 text-muted">
                {mode === "signin"
                  ? "Sign in to continue where you left off—your games, saves, and creators are ready."
                  : "Choose your games after signup. Your feed learns the rest from what you actually watch."}
              </p>
            </div>

            {!configured && (
              <div className="mb-5 rounded-2xl border border-amber-400/25 bg-amber-400/[0.08] p-4 text-sm leading-5 text-amber-100">
                Backend setup is ready, but this local copy still needs your Supabase URL and publishable key.
              </div>
            )}

            <form onSubmit={submit} className="space-y-4">
              {mode === "signup" && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Display name" icon={<UserRound className="h-[18px] w-[18px]" />}>
                    <input name="displayName" required maxLength={50} autoComplete="name" className={inputClass} placeholder="Alex" />
                  </Field>
                  <Field label="Username" icon={<AtSign className="h-[18px] w-[18px]" />}>
                    <input name="username" required minLength={3} maxLength={24} pattern="[A-Za-z0-9_]+" autoComplete="username" className={inputClass} placeholder="alexplays" />
                  </Field>
                </div>
              )}
              <Field label="Email address" icon={<Mail className="h-[18px] w-[18px]" />}>
                <input name="email" required type="email" autoComplete="email" className={inputClass} placeholder="you@example.com" />
              </Field>
              <Field label="Password" icon={<LockKeyhole className="h-[18px] w-[18px]" />}>
                <input
                  name="password"
                  required
                  type={showPassword ? "text" : "password"}
                  minLength={8}
                  autoComplete={mode === "signup" ? "new-password" : "current-password"}
                  className={`${inputClass} pr-12`}
                  placeholder={mode === "signup" ? "At least 8 characters" : "Your password"}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  className="absolute bottom-0 right-0 grid h-12 w-12 place-items-center text-muted transition hover:text-white"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
                </button>
              </Field>

              {mode === "signup" && (
                <div className="flex flex-wrap gap-x-4 gap-y-2 pt-1 text-xs text-muted">
                  <Requirement>8+ characters</Requirement>
                  <Requirement>Unique username</Requirement>
                  <Requirement>Confirm by email</Requirement>
                </div>
              )}

              {error && (
                <p role="alert" className="rounded-2xl border border-danger/25 bg-danger/[0.08] p-4 text-sm text-red-200">
                  {error}
                </p>
              )}
              {message && (
                <p className="flex gap-2.5 rounded-2xl border border-emerald-400/25 bg-emerald-400/[0.08] p-4 text-sm leading-5 text-emerald-100">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                  {message}
                </p>
              )}

              <Button type="submit" size="lg" className="group mt-2 w-full rounded-2xl shadow-lg shadow-accent/15" disabled={pending || !configured}>
                {pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
                {mode === "signin" ? "Enter my feed" : "Create my account"}
                {!pending && <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />}
              </Button>
            </form>

            <p className="mt-6 text-center text-xs leading-5 text-muted/80">
              {mode === "signin" ? "New to EZTips? " : "Already have an account? "}
              <button type="button" onClick={() => changeMode(mode === "signin" ? "signup" : "signin")} className="font-semibold text-white hover:text-[#a996ff]">
                {mode === "signin" ? "Create your account" : "Sign in instead"}
              </button>
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}

function AuthShowcase() {
  const clip = tutorials[0];
  const game = games.find((item) => item.id === clip.gameId) ?? games[0];
  return (
    <aside className="relative hidden min-h-dvh overflow-hidden border-r border-white/[0.06] bg-[#090a0f] p-10 lg:flex lg:flex-col xl:p-14">
      <div className="pointer-events-none absolute -left-40 top-1/4 h-[560px] w-[560px] rounded-full bg-accent/20 blur-[140px]" />
      <div className="pointer-events-none absolute right-0 top-0 h-[380px] w-[380px] rounded-full bg-cyan-400/[0.07] blur-[120px]" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.035] [background-image:linear-gradient(rgba(255,255,255,.8)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.8)_1px,transparent_1px)] [background-size:42px_42px]" />

      <Link href="/" className="relative z-10 inline-flex w-fit"><Logo /></Link>

      <div className="relative z-10 my-auto max-w-2xl py-12">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-semibold text-white/75 backdrop-blur">
          <span className="h-1.5 w-1.5 rounded-full bg-cyan-300 shadow-[0_0_12px_#67e8f9]" />
          Built around the games you play
        </div>
        <h2 className="mt-6 max-w-xl text-4xl font-bold leading-[1.04] tracking-[-0.045em] xl:text-5xl">
          Skip the noise.<br />Find the trick that works.
        </h2>
        <p className="mt-5 max-w-lg text-base leading-7 text-white/55">
          Short community clips for the exact games you care about—then a feed that gets smarter every time you watch.
        </p>

        <div className="relative mt-10 h-[330px] max-w-[620px]">
          <div className="absolute left-4 top-9 h-[260px] w-[178px] -rotate-6 overflow-hidden rounded-[26px] border border-white/10 bg-black shadow-2xl shadow-black/60 xl:left-10">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={clip.thumbnail} alt="" className="h-full w-full object-cover opacity-75" />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/5 to-black/25" />
            <span className="absolute inset-0 grid place-items-center"><span className="grid h-12 w-12 place-items-center rounded-full border border-white/20 bg-black/45 backdrop-blur"><Play className="ml-0.5 h-5 w-5 fill-white" /></span></span>
            <div className="absolute inset-x-3 bottom-3">
              <div className="text-[11px] font-bold leading-tight">{clip.title}</div>
              <div className="mt-2 flex gap-3 text-[9px] font-semibold text-white/65"><span className="flex items-center gap-1"><Heart className="h-3 w-3" />38.4K</span><span className="flex items-center gap-1"><Bookmark className="h-3 w-3" />Save</span></div>
            </div>
          </div>

          <div className="absolute left-[155px] top-0 w-[330px] rounded-[26px] border border-white/10 bg-[#11141b]/95 p-5 shadow-2xl shadow-black/50 backdrop-blur-xl xl:left-[205px] xl:w-[360px]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2"><GameLogo game={game} size={28} /><span className="text-xs font-bold">{game.name}</span></div>
              <span className="rounded-full bg-accent/15 px-2.5 py-1 text-[10px] font-bold text-[#b9aaff]">FOR YOU</span>
            </div>
            <div className="mt-5 text-xs font-semibold text-white/45">Your feed learns from</div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {["What you finish", "What you save", "Games you watch", "Creators you follow"].map((label) => (
                <div key={label} className="flex items-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.025] px-3 py-2.5 text-[11px] font-medium text-white/75">
                  <span className="grid h-4 w-4 place-items-center rounded-full bg-accent/20 text-[#b9aaff]"><Check className="h-2.5 w-2.5" /></span>{label}
                </div>
              ))}
            </div>
            <div className="mt-5 border-t border-white/[0.07] pt-4">
              <div className="flex items-end justify-between"><div><div className="text-[10px] uppercase tracking-[0.15em] text-white/35">Today&apos;s discovery</div><div className="mt-1 text-sm font-bold">Wave management</div></div><Sparkles className="h-5 w-5 text-cyan-300" /></div>
            </div>
          </div>

          <div className="absolute bottom-2 left-[245px] flex items-center gap-2 rounded-2xl border border-cyan-300/20 bg-[#11141b] px-4 py-3 shadow-xl shadow-black/50 xl:left-[300px]">
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-cyan-300/10 text-cyan-300"><Bookmark className="h-4 w-4" /></span>
            <div><div className="text-[10px] text-white/40">Saved for later</div><div className="text-xs font-bold">Mid lane collection</div></div>
          </div>
        </div>
      </div>

      <div className="relative z-10 flex items-center gap-6 border-t border-white/[0.07] pt-6 text-xs text-white/40">
        <span>Real community clips</span><span className="h-1 w-1 rounded-full bg-white/20" /><span>Your games only</span><span className="h-1 w-1 rounded-full bg-white/20" /><span>Free to join</span>
      </div>
    </aside>
  );
}

function Field({ label, icon, children }: { label: string; icon: ReactNode; children: ReactNode }) {
  return (
    <label className="relative block">
      <span className="mb-2 block text-sm font-medium text-white/85">{label}</span>
      <span className="pointer-events-none absolute bottom-0 left-0 grid h-12 w-11 place-items-center text-muted">{icon}</span>
      {children}
    </label>
  );
}

function Requirement({ children }: { children: ReactNode }) {
  return <span className="inline-flex items-center gap-1.5"><Check className="h-3 w-3 text-[#9d89ff]" />{children}</span>;
}

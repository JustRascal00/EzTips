"use client";

import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/client";
import { CheckCircle2, LoaderCircle } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";

const inputClass = "h-11 w-full rounded-xl border border-border bg-card px-3.5 text-sm outline-none placeholder:text-muted focus:border-accent/60";

export function AuthForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { configured, loading, user } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">(searchParams.get("mode") === "signup" ? "signup" : "signin");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const next = searchParams.get("next") || (mode === "signup" ? "/onboarding" : "/home");

  useEffect(() => {
    if (!loading && user) router.replace(next);
  }, [loading, next, router, user]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    setMessage("");
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") || "").trim();
    const password = String(form.get("password") || "");
    const displayName = String(form.get("displayName") || "").trim();
    const username = String(form.get("username") || "").trim().toLowerCase().replace(/[^a-z0-9_]/g, "");
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
      else setMessage("Account created. Check your email to confirm it, then sign in.");
    } else {
      const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (authError) setError(authError.message);
      else router.replace(next);
    }
    setPending(false);
  }

  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden bg-bg px-5 py-12">
      <div className="pointer-events-none absolute -left-48 top-0 h-96 w-96 rounded-full bg-accent/15 blur-[110px]" />
      <div className="relative w-full max-w-md">
        <Link href="/" className="mb-8 inline-flex"><Logo /></Link>
        <div className="rounded-3xl border border-border bg-card/90 p-6 shadow-2xl shadow-black/30 sm:p-8">
          <div className="flex rounded-xl border border-border bg-bg p-1">
            {(["signin", "signup"] as const).map((item) => (
              <button key={item} type="button" onClick={() => { setMode(item); setError(""); setMessage(""); }} className={`h-9 flex-1 rounded-lg text-sm font-semibold ${mode === item ? "bg-accent text-white" : "text-muted hover:text-white"}`}>
                {item === "signin" ? "Sign in" : "Create account"}
              </button>
            ))}
          </div>
          <h1 className="mt-7 text-2xl font-bold">{mode === "signin" ? "Welcome back" : "Join the community"}</h1>
          <p className="mt-2 text-sm text-muted">{mode === "signin" ? "Continue your personalized gaming feed." : "Upload clips, save useful tips, and build your game feed."}</p>

          {!configured && (
            <div className="mt-5 rounded-xl border border-amber-400/30 bg-amber-400/10 p-3 text-sm text-amber-100">
              Backend setup is ready, but this local copy still needs your Supabase URL and publishable key.
            </div>
          )}

          <form onSubmit={submit} className="mt-6 space-y-4">
            {mode === "signup" && (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Display name"><input name="displayName" required maxLength={50} className={inputClass} placeholder="Alex" /></Field>
                <Field label="Username"><input name="username" required minLength={3} maxLength={24} pattern="[A-Za-z0-9_]+" className={inputClass} placeholder="alexplays" /></Field>
              </div>
            )}
            <Field label="Email"><input name="email" required type="email" autoComplete="email" className={inputClass} placeholder="you@example.com" /></Field>
            <Field label="Password"><input name="password" required type="password" minLength={8} autoComplete={mode === "signup" ? "new-password" : "current-password"} className={inputClass} placeholder="At least 8 characters" /></Field>
            {error && <p role="alert" className="rounded-xl border border-danger/30 bg-danger/10 p-3 text-sm text-red-200">{error}</p>}
            {message && <p className="flex gap-2 rounded-xl border border-emerald-400/30 bg-emerald-400/10 p-3 text-sm text-emerald-100"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />{message}</p>}
            <Button type="submit" size="lg" className="w-full" disabled={pending || !configured}>
              {pending && <LoaderCircle className="h-4 w-4 animate-spin" />}
              {mode === "signin" ? "Sign in" : "Create my account"}
            </Button>
          </form>
          <p className="mt-5 text-center text-xs text-muted">By continuing, you agree to follow the community guidelines.</p>
        </div>
      </div>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-1.5 block text-sm font-medium">{label}</span>{children}</label>;
}

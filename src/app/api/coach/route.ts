import { NextResponse } from "next/server";
import { askCoach } from "@/lib/ai/coach";
import { GeminiError, type GeminiTurn } from "@/lib/ai/gemini";
import { createClient } from "@/lib/supabase/server";

const MAX_MESSAGE = 1000;
const MAX_HISTORY = 10;
const DAILY_LIMIT = 20;

// Temporary in-memory limit (resets when the server restarts).
// Replaced by the ai_queries table once the migration is in.
const usage = new Map<string, { day: string; count: number }>();

function takeQuota(userId: string) {
  const day = new Date().toISOString().slice(0, 10);
  const current = usage.get(userId);
  const count = current && current.day === day ? current.count : 0;
  if (count >= DAILY_LIMIT) return { ok: false, remaining: 0 };
  usage.set(userId, { day, count: count + 1 });
  return { ok: true, remaining: DAILY_LIMIT - count - 1 };
}

function refundQuota(userId: string) {
  const current = usage.get(userId);
  if (current && current.count > 0) current.count -= 1;
}

export async function POST(request: Request) {
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) return NextResponse.json({ error: "Sign in to use the coach." }, { status: 401 });

  let body: { message?: unknown; history?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const message = typeof body.message === "string" ? body.message.trim() : "";
  if (!message) return NextResponse.json({ error: "Ask a question first." }, { status: 400 });
  if (message.length > MAX_MESSAGE) return NextResponse.json({ error: `Keep questions under ${MAX_MESSAGE} characters.` }, { status: 400 });

  const history: GeminiTurn[] = (Array.isArray(body.history) ? body.history : [])
    .filter((turn): turn is GeminiTurn =>
      !!turn && typeof turn === "object"
      && ((turn as GeminiTurn).role === "user" || (turn as GeminiTurn).role === "model")
      && typeof (turn as GeminiTurn).text === "string")
    .slice(-MAX_HISTORY)
    .map((turn) => ({ role: turn.role, text: turn.text.slice(0, 2000) }));

  const quota = takeQuota(user.id);
  if (!quota.ok) return NextResponse.json({ error: `Daily limit reached (${DAILY_LIMIT} questions). Try again tomorrow.` }, { status: 429 });

  try {
    const answer = await askCoach(message, history);
    return NextResponse.json({ ...answer, remaining: quota.remaining });
  } catch (error) {
    refundQuota(user.id); // failed calls don't count
    if (error instanceof GeminiError) {
      console.error("[coach] Gemini error", error.status, error.message);
      if (error.busy) return NextResponse.json({ error: "The coach is busy right now. Try again in a minute." }, { status: 503 });
      if (error.status === 500 && error.message.includes("GEMINI_API_KEY")) {
        return NextResponse.json({ error: "Coach is not set up: GEMINI_API_KEY is missing." }, { status: 500 });
      }
      if (error.status === 400 || error.status === 401 || error.status === 403) {
        return NextResponse.json({ error: `Gemini rejected the request: ${error.message}` }, { status: 502 });
      }
      return NextResponse.json({ error: error.message }, { status: 502 });
    }
    console.error("[coach] unexpected error", error);
    return NextResponse.json({ error: "Something went wrong. Try again." }, { status: 500 });
  }
}

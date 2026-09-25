import "server-only";

const API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";
const RETRYABLE = new Set([429, 500, 502, 503, 504]);
const TIMEOUT_MS = 45_000;

export type GeminiTurn = { role: "user" | "model"; text: string };

export class GeminiError extends Error {
  constructor(message: string, public status: number, public busy = false) {
    super(message);
  }
}

export function geminiConfig() {
  return {
    apiKey: process.env.GEMINI_API_KEY?.trim() ?? "",
    model: process.env.GEMINI_MODEL?.trim() || "gemini-3.8-flash",
    fallbackModel: process.env.GEMINI_FALLBACK_MODEL?.trim() || "gemini-flash-lite-latest",
  };
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function callModel(model: string, apiKey: string, system: string, turns: GeminiTurn[]) {
  const res = await fetch(`${API_BASE}/${encodeURIComponent(model)}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
    cache: "no-store",
    signal: AbortSignal.timeout(TIMEOUT_MS),
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: turns.map((turn) => ({ role: turn.role, parts: [{ text: turn.text }] })),
      generationConfig: { responseMimeType: "application/json", temperature: 0.4 },
    }),
  });

  if (!res.ok) {
    let detail = "";
    try {
      const body = (await res.json()) as { error?: { message?: string } };
      detail = body.error?.message ?? "";
    } catch {
      // ignore
    }
    throw new GeminiError(detail || `Gemini returned HTTP ${res.status}`, res.status, RETRYABLE.has(res.status));
  }

  const body = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string; thought?: boolean }[] }; finishReason?: string }[];
    promptFeedback?: { blockReason?: string };
  };
  if (body.promptFeedback?.blockReason) throw new GeminiError(`Blocked: ${body.promptFeedback.blockReason}`, 400);
  const candidate = body.candidates?.[0];
  const text = (candidate?.content?.parts ?? [])
    .filter((part) => !part.thought && typeof part.text === "string")
    .map((part) => part.text)
    .join("")
    .trim();
  if (!text) throw new GeminiError(`Empty answer (finish reason: ${candidate?.finishReason ?? "unknown"})`, 502, true);
  return text;
}

/**
 * Calls the main model with retries, then the fallback model if the main one stays busy.
 * Returns the raw JSON text plus which model answered.
 */
export async function generateJson(system: string, turns: GeminiTurn[]) {
  const { apiKey, model, fallbackModel } = geminiConfig();
  if (!apiKey) throw new GeminiError("GEMINI_API_KEY is not set in .env.local", 500);

  const models = fallbackModel && fallbackModel !== model ? [model, fallbackModel] : [model];
  let lastError: unknown;
  for (const [index, current] of models.entries()) {
    const attempts = index === 0 ? 3 : 2;
    for (let attempt = 0; attempt < attempts; attempt++) {
      try {
        const text = await callModel(current, apiKey, system, turns);
        return { text, model: current, usedFallback: index > 0 };
      } catch (error) {
        lastError = error;
        const retryable =
          (error instanceof GeminiError && error.busy) ||
          (error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError"));
        // 404 on the main model (unknown model id) -> go straight to the fallback.
        if (error instanceof GeminiError && error.status === 404) break;
        if (!retryable) throw error;
        if (attempt < attempts - 1) await sleep(700 * 2 ** attempt + Math.random() * 300);
      }
    }
  }
  if (lastError instanceof GeminiError) throw new GeminiError(lastError.message, lastError.status, true);
  throw new GeminiError("Gemini is busy. Try again in a minute.", 503, true);
}

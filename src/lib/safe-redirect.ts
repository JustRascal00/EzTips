/**
 * Only allow same-site relative paths ("/home", "/t/abc?x=1").
 * Rejects protocol-relative ("//evil.com"), backslash tricks ("/\evil.com") and absolute URLs.
 */
export function safeNextPath(value: string | null | undefined, fallback: string): string {
  if (!value) return fallback;
  if (!value.startsWith("/")) return fallback;
  if (value.startsWith("//") || value.startsWith("/\\")) return fallback;
  if (/[\u0000-\u001f]/.test(value)) return fallback;
  try {
    const parsed = new URL(value, "http://local.invalid");
    if (parsed.origin !== "http://local.invalid") return fallback;
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return fallback;
  }
}

/**
 * Stable per-browser client identifier used as one signal in rate limiting.
 * Not a security boundary — server-side per-action limits are the real control.
 */
const KEY = "only_client_id";

export function getClientId(): string {
  if (typeof window === "undefined") return "ssr";
  let id = localStorage.getItem(KEY);
  if (!id) {
    id =
      (crypto.randomUUID?.() ?? Math.random().toString(36).slice(2)) +
      "-" +
      Date.now().toString(36);
    localStorage.setItem(KEY, id);
  }
  return id;
}

/** Convert a server-side rate-limit error into a friendly message. */
export function formatRateLimitError(err: unknown, fallback = "Too many requests. Please slow down."): string {
  const msg = (err as { message?: string })?.message ?? "";
  // PostgrestError from rate-limited RPCs throws "Too many … Please wait N seconds."
  const m = /(\d+)\s*seconds?/i.exec(msg);
  if (m) return `Too many attempts. Try again in ${m[1]}s.`;
  if (/too many/i.test(msg)) return msg;
  return fallback;
}

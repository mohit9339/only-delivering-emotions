import { supabase } from "@/integrations/supabase/client";

/** Server-side rate limit check. Returns null if allowed, or a friendly message. */
export async function checkLimit(
  action: string,
  identifier: string,
  maxAttempts = 5,
  windowSeconds = 300
): Promise<string | null> {
  const { data, error } = await supabase.rpc("check_rate_limit", {
    p_action: action,
    p_identifier: identifier,
    p_max_attempts: maxAttempts,
    p_window_seconds: windowSeconds,
  } as never);
  if (error) {
    // Fail-open on transient errors so legitimate users aren't locked out;
    // the server still has the trigger-level guards.
    console.warn("rate limit check failed", error);
    return null;
  }
  const result = data as { allowed: boolean; retry_after_seconds?: number } | null;
  if (!result || result.allowed) return null;
  const retry = result.retry_after_seconds ?? 60;
  return `Too many attempts. Try again in ${retry}s.`;
}

export async function recordAttempt(
  action: string,
  identifier: string,
  succeeded: boolean,
  metadata?: Record<string, unknown>
): Promise<void> {
  await supabase.rpc("record_rate_attempt", {
    p_action: action,
    p_identifier: identifier,
    p_succeeded: succeeded,
    p_metadata: (metadata ?? null) as never,
  } as never);
}

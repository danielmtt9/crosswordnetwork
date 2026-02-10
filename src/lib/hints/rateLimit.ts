export type HintKind = 'letter' | 'word';

export const HINT_WINDOW_SECONDS = 60 * 60;

export const HINT_LIMITS_PER_HOUR: Record<HintKind, number> = {
  letter: 5,
  word: 2,
};

export type HintRateLimitResult =
  | {
      ok: true;
      limit: number;
      remaining: number;
      windowSeconds: number;
    }
  | {
      ok: false;
      limit: number;
      remaining: 0;
      windowSeconds: number;
      retryAfterSeconds: number;
    };

/**
 * Compute a rolling-window rate limit state from hint event timestamps.
 * `eventTimesAsc` MUST be sorted ascending and contain only events within the window.
 */
export function computeRollingWindowLimit(params: {
  nowMs: number;
  windowSeconds: number;
  limit: number;
  eventTimesAsc: Date[];
}): HintRateLimitResult {
  const { nowMs, windowSeconds, limit, eventTimesAsc } = params;

  if (limit <= 0) {
    return { ok: false, limit: 0, remaining: 0, windowSeconds, retryAfterSeconds: windowSeconds };
  }

  if (eventTimesAsc.length >= limit) {
    const oldest = eventTimesAsc[0];
    const oldestMs = oldest.getTime();
    const windowMs = windowSeconds * 1000;
    const retryAfterMs = windowMs - (nowMs - oldestMs);
    const retryAfterSeconds = Math.max(1, Math.ceil(retryAfterMs / 1000));
    return { ok: false, limit, remaining: 0, windowSeconds, retryAfterSeconds };
  }

  return {
    ok: true,
    limit,
    remaining: Math.max(0, limit - eventTimesAsc.length - 1), // remaining AFTER consuming 1 hint
    windowSeconds,
  };
}


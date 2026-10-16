export const WINDOW_MS = 10 * 60 * 1000;
export const MAX_ORDERS_PER_WINDOW = 5;

// Uses fixed UTC-aligned windows. The transaction that calls this helper must
// atomically persist the returned count alongside the order write.
export function getRateLimitState(rateData, nowMs) {
  const windowStartMs = Math.floor(nowMs / WINDOW_MS) * WINDOW_MS;
  const sameWindow = rateData?.windowStartMs === windowStartMs;
  const count = sameWindow ? Number(rateData?.count || 0) : 0;
  return {
    allowed: count < MAX_ORDERS_PER_WINDOW,
    windowStartMs,
    count,
    nextCount: count + 1,
    resetAtMs: windowStartMs + WINDOW_MS
  };
}

import test from "node:test";
import assert from "node:assert/strict";
import { getRateLimitState, MAX_ORDERS_PER_WINDOW, WINDOW_MS } from "../rate-limit.js";

test("allows the first five successful submissions in a window", () => {
  const now = 1_800_000_000_000;
  for (let count = 0; count < MAX_ORDERS_PER_WINDOW; count++) {
    const state = getRateLimitState({ windowStartMs: Math.floor(now / WINDOW_MS) * WINDOW_MS, count }, now);
    assert.equal(state.allowed, true);
    assert.equal(state.nextCount, count + 1);
  }
});
test("rejects the sixth submission in the same window", () => {
  const now = 1_800_000_000_000;
  const windowStartMs = Math.floor(now / WINDOW_MS) * WINDOW_MS;
  const state = getRateLimitState({ windowStartMs, count: MAX_ORDERS_PER_WINDOW }, now);
  assert.equal(state.allowed, false);
});
test("resets the counter when the next window begins", () => {
  const now = 1_800_000_000_000;
  const oldWindow = Math.floor(now / WINDOW_MS) * WINDOW_MS;
  const state = getRateLimitState({ windowStartMs: oldWindow, count: MAX_ORDERS_PER_WINDOW }, oldWindow + WINDOW_MS);
  assert.equal(state.allowed, true);
  assert.equal(state.count, 0);
  assert.equal(state.nextCount, 1);
});


test("recovers safely from malformed stored counters", () => {
  const now = 1_800_000_000_000;
  const windowStartMs = Math.floor(now / WINDOW_MS) * WINDOW_MS;
  for (const count of [NaN, Infinity, -1, "5", 1.5]) {
    const state = getRateLimitState({ windowStartMs, count }, now);
    assert.equal(state.allowed, true);
    assert.equal(state.count, 0);
    assert.equal(state.nextCount, 1);
  }
});

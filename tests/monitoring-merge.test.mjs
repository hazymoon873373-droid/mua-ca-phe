import test from "node:test";
import assert from "node:assert/strict";
import { mergeMarket } from "../lib/coffee/analytics.mjs";
test("monitoring updates independently of retained prices and delayed responses cannot regress attempts", () => {
  const old = {
      available: true,
      lastAttemptAt: "2026-11-10T01:00:00Z",
      observedAttempts: 1,
    },
    fresh = {
      available: true,
      lastAttemptAt: "2026-11-11T01:00:00Z",
      observedAttempts: 2,
    };
  const current = {
    sourceDate: "2026-11-10",
    fetchedAt: "2026-11-10T02:00:00Z",
    monitoring: old,
  };
  const incoming = {
    sourceDate: "2026-11-09",
    fetchedAt: "2026-11-09T02:00:00Z",
    monitoring: fresh,
  };
  const merged = mergeMarket(current, incoming);
  assert.equal(merged.sourceDate, current.sourceDate);
  assert.deepEqual(merged.monitoring, fresh);
  assert.deepEqual(
    mergeMarket({ ...current, monitoring: fresh }, current).monitoring,
    fresh,
  );
  assert.deepEqual(
    mergeMarket(
      { ...current, monitoring: fresh },
      { ...current, monitoring: { available: false } },
    ).monitoring,
    fresh,
  );
});

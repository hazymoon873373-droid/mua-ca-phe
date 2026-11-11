import test from "node:test";
import assert from "node:assert/strict";
import { validStudySummary } from "../lib/coffee/study-view.mjs";
const metric = (model) => ({ model, n: 8, mae: 1000 });
const region = (regionId) => ({
  regionId,
  sourceEnd: "2026-05-22",
  horizons: [1, 7].map((days) => ({
    days,
    metrics: ["naive", "seasonalNaive", "prophet", "xgboost"].map(metric),
  })),
});
const study = {
  schemaVersion: 1,
  studyType: "retrospective",
  currentEligible: false,
  sourceEnd: "2026-05-22",
  regions: ["dak-lak", "lam-dong"].map(region),
};
test("research summary refuses current eligibility and malformed dates, rows or missing comparisons", () => {
  assert.equal(validStudySummary(study), true);
  for (const change of [
    { currentEligible: true },
    { sourceEnd: "yesterday" },
    { regions: [null] },
    { regions: [] },
    { regions: [region("bad")] },
  ])
    assert.equal(validStudySummary({ ...study, ...change }), false);
  for (const change of [{ n: 0 }, { mae: NaN }, { model: "invented" }]) {
    const bad = structuredClone(study);
    Object.assign(bad.regions[0].horizons[0].metrics[0], change);
    assert.equal(validStudySummary(bad), false);
  }
  const duplicate = structuredClone(study);
  duplicate.regions[0].horizons[0].metrics[1].model = "naive";
  assert.equal(validStudySummary(duplicate), false);
});

import test from "node:test";
import assert from "node:assert/strict";
import {
  validateForecastArtifact,
  forecastStatus,
  forecastCsv,
} from "../lib/coffee/forecast.mjs";
import { priceMoveAlert } from "../lib/coffee/analytics.mjs";

function fixture() {
  return {
    schemaVersion: 1,
    generatedAt: "2026-11-10T00:00:00Z",
    sourceId: "mendeley-v3",
    sourceUrl: "https://data.mendeley.com/datasets/p8fhcw59b7/3",
    sourceSha256: "a".repeat(64),
    models: { prophet: { version: "1" }, xgboost: { version: "3" } },
    validation: { method: "rolling-origin", description: "Fixed parameters" },
    regions: [
      {
        regionId: "dak-lak",
        trainStart: "2020-01-01",
        trainEnd: "2026-05-22",
        observationCount: 1613,
        horizons: [1, 7].map((days) => ({
          days,
          metrics: ["naive", "prophet", "xgboost"].map((model) => ({
            model,
            n: 1,
            mae: model === "naive" ? 200 : model === "prophet" ? 100 : 50,
            rmse: model === "naive" ? 200 : model === "prophet" ? 100 : 50,
            coverage80: model === "prophet" ? 1 : null,
          })),
          backtest: [
            {
              origin: "2026-05-01",
              date: days === 1 ? "2026-05-02" : "2026-05-08",
              actual: 85000,
              naive: 84800,
              prophet: 84900,
              xgboost: 84950,
              lower80: 84000,
              upper80: 86000,
            },
          ],
          forecast: {
            date: days === 1 ? "2026-05-23" : "2026-05-29",
            prophet: { yhat: 85000, lower80: 84000, upper80: 86000 },
            xgboost: { yhat: 85100 },
            naive: { yhat: 84800 },
          },
        })),
      },
    ],
  };
}
test("accepts measured artifact and rejects malformed dates, target leakage and invented metrics", () => {
  assert.equal(validateForecastArtifact(fixture()), true);
  for (const mutate of [
    (d) => (d.regions[0].horizons[0].backtest[0].date = "2026-05-01"),
    (d) => (d.regions[0].horizons[0].metrics[0].mae = 0),
    (d) => (d.regions[0].horizons[0].backtest[0].actual = NaN),
    (d) => (d.regions[0].horizons[0].forecast.date = "2026-11-11"),
    (d) => (d.regions[0].horizons[0].backtest[0].date = "2026-02-30"),
    (d) => d.regions[0].horizons[0].metrics.pop(),
    (d) => (d.regions[0].horizons[0].backtest[0].lower80 = 90000),
    (d) => delete d.validation,
    (d) => (d.validation.description = {}),
    (d) => (d.models.prophet.version = {}),
  ]) {
    const d = fixture();
    mutate(d);
    assert.equal(validateForecastArtifact(d), false);
  }
});
test("stale training withholds current predictions regardless of newer source price", () => {
  const r = fixture().regions[0];
  assert.equal(forecastStatus(r, 1, "2026-11-10").state, "stale");
  assert.deepEqual(forecastStatus(r, 1, "2026-11-10").eligibleModels, []);
  assert.equal(forecastStatus(r, 1, "2026-05-22").state, "unproven");
  assert.equal(forecastStatus(r, 1, "2026-05-23").state, "expired");
});
test("requires enough paired evidence and baseline advantage before eligibility", () => {
  const r = fixture().regions[0];
  for (const h of r.horizons) for (const m of h.metrics) m.n = 24;
  assert.deepEqual(forecastStatus(r, 1, "2026-05-22").eligibleModels, [
    "prophet",
    "xgboost",
  ]);
  r.horizons[0].metrics[1].mae = 250;
  r.horizons[0].metrics[2].mae = 220;
  assert.equal(forecastStatus(r, 1, "2026-05-22").state, "unproven");
});
test("CSV preserves actual origins, target dates and source without fabricated rows", () => {
  const d = fixture();
  const csv = forecastCsv(d.regions[0], 1);
  assert.equal(csv.split("\n").length, 2);
  assert.match(csv, /2026-05-01,2026-05-02,85000/);
  assert.match(csv, /mendeley-v3/);
});
test("price movement alert uses source previous price and absolute percentage", () => {
  assert.equal(
    priceMoveAlert({ priceVndKg: 102000, changeVndKg: 2000 }, 2).triggered,
    true,
  );
  assert.equal(
    priceMoveAlert({ priceVndKg: 98000, changeVndKg: -2000 }, 2).changePct,
    -2,
  );
  assert.equal(
    priceMoveAlert({ priceVndKg: 100000, changeVndKg: 0 }, 1).triggered,
    false,
  );
  for (const [q, t] of [
    [{ priceVndKg: 0, changeVndKg: 0 }, 1],
    [{ priceVndKg: 100, changeVndKg: 100 }, 1],
    [{ priceVndKg: NaN, changeVndKg: 1 }, 1],
    [{ priceVndKg: 100, changeVndKg: 1 }, 0],
    [{ priceVndKg: 100, changeVndKg: 1 }, 51],
  ])
    assert.equal(priceMoveAlert(q, t), null);
});

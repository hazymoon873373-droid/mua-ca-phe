import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parseDomesticPrices } from "../lib/coffee/source.mjs";
import {
  sanitizeHistory,
  monthlyAverages,
  seasonalProfile,
} from "../lib/coffee/history.mjs";
const fixture = readFileSync(
  new URL("../tools/coffee-data-fixture.html", import.meta.url),
  "utf8",
);
test("real 2026-11-09 public snapshot decodes CSS and excludes pepper and FX", () => {
  const result = parseDomesticPrices(fixture);
  assert.equal(result.sourceDate, "2026-11-09");
  assert.deepEqual(
    result.regions.map((r) => [r.regionId, r.priceVndKg, r.changeVndKg]),
    [
      ["dak-lak", 85000, 500],
      ["lam-dong", 84500, 500],
      ["gia-lai", 85000, 500],
      ["dak-nong", 85300, 600],
    ],
  );
});
test("date and all four prices are required; malformed or ambiguous CSS fails closed", () => {
  for (const html of [
    fixture.replace("09/11/2026", "31/02/2026"),
    fixture.replace("85,000", "no-price"),
    fixture.replace("Đắk Lắk", "Unknown"),
    fixture.replace("85,000", "8,50,00"),
    fixture + '<style>.majKyWd::after{content:"87,000"}</style>',
  ]) {
    assert.throws(() => parseDomesticPrices(html));
  }
});
test("negative and unchanged movements remain numerical", () => {
  const result = parseDomesticPrices(
    fixture.replace("'+500'", "'-500'").replace("'+600'", "'0'"),
  );
  assert.equal(result.regions[0].changeVndKg, -500);
  assert.equal(result.regions[3].changeVndKg, 0);
});
test("an older Kon Tum row is retained without requiring it in current snapshots", () => {
  const html = fixture.replace(
    "</tbody>",
    "<tr><td>Kon Tum</td><td>84,800</td><td>-100</td></tr></tbody>",
  );
  const result = parseDomesticPrices(html);
  assert.equal(result.regions.length, 5);
  assert.deepEqual(result.regions[4], {
    regionId: "kon-tum",
    name: "Kon Tum",
    priceVndKg: 84800,
    changeVndKg: -100,
  });
});
test("history deduplicates identical rows and rejects conflicting/malformed rows", () => {
  const a = {
    date: "2024-01-02",
    regionId: "dak-lak",
    priceVndKg: 65000,
    sourceId: "mendeley-v3",
  };
  assert.deepEqual(sanitizeHistory([a, a]), [a]);
  assert.throws(() => sanitizeHistory([a, { ...a, priceVndKg: 66000 }]));
  assert.throws(() => sanitizeHistory([{ ...a, date: "2024-02-31" }]));
  assert.equal(
    sanitizeHistory([a, { ...a, sourceId: "giacaphe-snapshot" }]).length,
    2,
  );
});
test("monthly means preserve source and region and do not manufacture missing dates", () => {
  const rows = [
    {
      date: "2024-01-02",
      regionId: "dak-lak",
      priceVndKg: 60000,
      sourceId: "a",
    },
    {
      date: "2024-01-04",
      regionId: "dak-lak",
      priceVndKg: 80000,
      sourceId: "a",
    },
    {
      date: "2024-01-04",
      regionId: "dak-lak",
      priceVndKg: 90000,
      sourceId: "b",
    },
  ];
  assert.deepEqual(
    monthlyAverages(rows).map((r) => [
      r.sourceId,
      r.meanPriceVndKg,
      r.observationCount,
    ]),
    [
      ["a", 70000, 2],
      ["b", 90000, 1],
    ],
  );
});
test("seasonal profile uses only years with observations in all twelve months; no future prediction", () => {
  const rows = Array.from({ length: 12 }, (_, i) => ({
    date: `2024-${String(i + 1).padStart(2, "0")}-01`,
    regionId: "dak-lak",
    priceVndKg: i === 0 ? 120000 : 60000,
    sourceId: "a",
  }));
  rows.push({ ...rows[0], date: "2025-01-01", priceVndKg: 999999 });
  const profile = seasonalProfile(rows, { regionId: "dak-lak", sourceId: "a" });
  assert.equal(profile.length, 12);
  assert.deepEqual(profile[0].years, [2024]);
  assert.ok(
    Math.abs(profile[0].meanDeviationPct - (120000 / 65000 - 1) * 100) < 1e-9,
  );
  assert.equal(profile[0].observationCount, 1);
});
test("shipped historical observations are valid and the snapshot agrees with the real-page fixture", () => {
  const history = JSON.parse(
    readFileSync(
      new URL("../public/data/history.json", import.meta.url),
      "utf8",
    ),
  );
  const latest = JSON.parse(
    readFileSync(
      new URL("../public/data/latest.json", import.meta.url),
      "utf8",
    ),
  );
  assert.equal(sanitizeHistory(history.rows).length, 5445);
  assert.deepEqual(latest.regions, parseDomesticPrices(fixture).regions);
  assert.equal(latest.sourceDate, "2026-11-09");
  assert.equal(latest.sourceLicenseUnconfirmed, true);
  assert.ok(Date.parse(latest.fetchedAt));
});

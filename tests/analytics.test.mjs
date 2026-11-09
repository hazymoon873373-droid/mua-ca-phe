import test from "node:test";
import assert from "node:assert/strict";
import {
  filterWindow,
  splitGaps,
  seriesSummary,
  evaluateWatch,
  exportCsv,
  validWatch,
  dayDistance,
  mergeMarket,
} from "../lib/coffee/analytics.mjs";
const rows = [
  {
    date: "2026-05-01",
    regionId: "dak-lak",
    sourceId: "mendeley-v3",
    priceVndKg: 100000,
  },
  {
    date: "2026-05-04",
    regionId: "dak-lak",
    sourceId: "mendeley-v3",
    priceVndKg: 99000,
  },
  {
    date: "2026-05-22",
    regionId: "dak-lak",
    sourceId: "mendeley-v3",
    priceVndKg: 95000,
  },
  {
    date: "2026-11-09",
    regionId: "dak-lak",
    sourceId: "giacaphe-snapshot",
    priceVndKg: 85000,
  },
];
test("date windows anchor at the last actual observation of the chosen source", () => {
  const r = filterWindow(rows, "dak-lak", "mendeley-v3", 30);
  assert.equal(r.length, 3);
  assert.equal(r.at(-1).date, "2026-05-22");
  assert.equal(filterWindow(rows, "dak-lak", "mendeley-v3", 7).length, 1);
  assert.equal(dayDistance("2026-05-01", "2026-05-04"), 3);
});
test("large missing intervals split paths and no fake daily values are introduced", () => {
  const r = filterWindow(rows, "dak-lak", "mendeley-v3", 0);
  const parts = splitGaps(r, 7);
  assert.deepEqual(
    parts.map((p) => p.length),
    [2, 1],
  );
  assert.equal(parts.flat().length, 3);
});
test("summary labels observed-window changes, not a forecast", () => {
  assert.deepEqual(seriesSummary(rows.slice(0, 3)), {
    count: 3,
    firstDate: "2026-05-01",
    lastDate: "2026-05-22",
    min: 95000,
    max: 100000,
    mean: 98000,
    change: -5000,
    changePct: -5,
  });
  assert.equal(seriesSummary([]), null);
});
test("watch requires a valid region, direction, positive bounded price", () => {
  assert.equal(
    validWatch({ regionId: "dak-lak", direction: "above", target: 90000 }),
    true,
  );
  assert.equal(
    validWatch({ regionId: "__proto__", direction: "above", target: 90000 }),
    false,
  );
  assert.equal(
    validWatch({ regionId: "dak-lak", direction: "above", target: 0 }),
    false,
  );
  assert.equal(
    evaluateWatch({ direction: "below", target: 90000 }, 85000),
    true,
  );
  assert.equal(
    evaluateWatch({ direction: "above", target: 90000 }, 85000),
    false,
  );
  assert.equal(
    evaluateWatch({ direction: "above", target: 90000 }, null),
    null,
  );
});
test("CSV preserves provenance and treats untrusted text as inert spreadsheet content", () => {
  const csv = exportCsv([
    {
      date: "2026-05-01",
      regionId: "=CMD(1)",
      priceVndKg: 95000,
      sourceId: "mendeley-v3",
    },
  ]);
  assert.match(csv, /source_id/);
  assert.ok(csv.includes("'=CMD(1)"));
  assert.equal(exportCsv([]).split("\r\n").length, 1);
});
test("fallback or delayed refresh cannot regress newer displayed prices and history", () => {
  const current = {
    sourceDate: "2026-11-10",
    fetchedAt: "2026-11-10T03:00:00Z",
    regions: [{ priceVndKg: 88000 }],
    snapshots: [{ date: "2026-11-10" }],
    sync: { last_success: "2026-11-10T03:00:00Z" },
  };
  const incoming = {
    sourceDate: "2026-11-09",
    fetchedAt: "2026-11-09T03:00:00Z",
    regions: [{ priceVndKg: 85000 }],
    seedFallback: true,
    sync: { error: "storage_unavailable" },
  };
  const merged = mergeMarket(current, incoming);
  assert.deepEqual(merged.regions, current.regions);
  assert.deepEqual(merged.snapshots, current.snapshots);
  assert.equal(merged.sync.error, "storage_unavailable");
  assert.equal(
    mergeMarket(current, {
      ...current,
      fetchedAt: "2026-11-10T02:00:00Z",
      regions: [{ priceVndKg: 87000 }],
    }).regions[0].priceVndKg,
    88000,
  );
});

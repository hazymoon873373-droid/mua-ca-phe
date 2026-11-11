import test from "node:test";
import assert from "node:assert/strict";
import * as quality from "../lib/coffee/quality.mjs";

const now = Date.parse("2026-11-09T18:00:00Z"); // Nov 10 in Vietnam.
const ids = ["dak-lak", "lam-dong", "gia-lai", "dak-nong"];
const rows = (date, regions = ids) => regions.map((regionId) => ({ date, regionId, priceVndKg: 85000, sourceId: "giacaphe-snapshot" }));

test("coverage counts collected source dates without borrowing Mendeley history", () => {
  const result = quality.assessDataQuality({
    sourceDate: "2026-11-09", fetchedAt: "2026-11-09T15:00:00Z",
    snapshots: [...rows("2026-11-06"), ...rows("2026-11-09"), ...rows("2026-11-07").map((r) => ({ ...r, sourceId: "mendeley-v3" }))],
  }, now);
  assert.equal(result.sourceAgeDays, 1);
  assert.equal(result.fetchedAgeHours, 3);
  assert.deepEqual(result.coverage, {
    firstDate: "2026-11-06", lastDate: "2026-11-09", observedDays: 2, calendarDays: 4,
    missingCalendarDates: ["2026-11-07", "2026-11-08"], incompleteDates: [],
    expectedRegionIds: ids, validRows: 8, invalidRows: 0,
  });
});

test("incomplete region dates remain observations while duplicate rows do not inflate coverage", () => {
  const result = quality.assessDataQuality({ snapshots: [...rows("2026-11-09", ["dak-lak"]), ...rows("2026-11-09", ["dak-lak"]), ...rows("2026-11-10")] }, now);
  assert.equal(result.coverage.validRows, 5);
  assert.equal(result.coverage.observedDays, 2);
  assert.deepEqual(result.coverage.incompleteDates, [{ date: "2026-11-09", missingRegionIds: ["lam-dong", "gia-lai", "dak-nong"] }]);
});

test("invalid dates, future dates and unusable prices never manufacture coverage or freshness", () => {
  const result = quality.assessDataQuality({ sourceDate: "2026-02-30", fetchedAt: "garbage", snapshots: [
    ...rows("2026-02-30", ["dak-lak"]), ...rows("2026-11-11", ["dak-lak"]),
    ...rows("2026-11-09", ["unknown"]), { ...rows("2026-11-09")[0], priceVndKg: NaN },
  ] }, now);
  assert.equal(result.sourceDate, null);
  assert.equal(result.sourceAgeDays, null);
  assert.equal(result.fetchedAgeHours, null);
  assert.equal(result.coverage.invalidRows, 4);
  assert.equal(result.coverage.observedDays, 0);
  assert.equal(result.coverage.calendarDays, 0);
  assert.deepEqual(result.coverage.missingCalendarDates, []);
  assert.equal(quality.assessDataQuality({ sourceDate: "2026-11-11", fetchedAt: "2026-11-10T00:00:00Z" }, now).sourceAgeDays, null);
  assert.equal(quality.assessDataQuality({ fetchedAt: "2026-02-30T12:00:00Z" }, now).fetchedAgeHours, null);
});

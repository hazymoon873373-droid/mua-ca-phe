import test from "node:test";
import assert from "node:assert/strict";
import {
  calculateLot,
  validLotRecord,
  lotCsv,
} from "../lib/coffee/lots.mjs";
const input = {
  role: "sell",
  weightKg: 1000,
  priceVndKg: 85000,
  costVnd: 500000,
};
const record = {
  ...input,
  id: "lot-1",
  date: "2026-11-10",
  regionId: "dak-lak",
  note: "Lô thử",
  priceType: "reference",
  sourceDate: "2026-11-10",
  sourceUrl: "https://giacaphe.com/gia-ca-phe-noi-dia/",
};
test("seller/buyer use integer VND and gram precision with no profit claim", () => {
  assert.deepEqual(calculateLot(input), {
    grossVnd: 85000000,
    totalVnd: 84500000,
    weightGrams: 1000000,
  });
  assert.equal(calculateLot({ ...input, role: "buy" }).totalVnd, 85500000);
  assert.equal(
    calculateLot({ ...input, weightKg: 1.125, priceVndKg: 1001, costVnd: 0 })
      .grossVnd,
    1126,
  );
  assert.equal(
    calculateLot({ ...input, weightKg: 1, costVnd: 100000 }).totalVnd,
    -15000,
  );
  for (const change of [
    { weightKg: 0 },
    { weightKg: NaN },
    { weightKg: 0.0001 },
    { weightKg: 1000001 },
    { priceVndKg: 1.5 },
    { priceVndKg: 1000001 },
    { costVnd: -1 },
    { costVnd: 0.5 },
    { role: "other" },
  ])
    assert.equal(calculateLot({ ...input, ...change }), null);
});
test("saved records validate dates, bounded notes and source provenance without recalculating from live price", () => {
  assert.equal(validLotRecord(record), true);
  assert.equal(
    validLotRecord({
      ...record,
      priceType: "manual",
      sourceDate: null,
      sourceUrl: null,
    }),
    true,
  );
  for (const change of [
    { date: "2026-02-30" },
    { regionId: "bad" },
    { note: "x".repeat(121) },
    { priceType: "manual", sourceDate: "2026-11-10" },
    { sourceDate: null },
    { sourceUrl: "javascript:alert(1)" },
    { weightKg: Infinity },
  ])
    assert.equal(validLotRecord({ ...record, ...change }), false);
  assert.equal(calculateLot(record).totalVnd, 84500000);
});
test("notebook CSV escapes quotes, formula notes including leading whitespace, and keeps dated provenance", () => {
  const csv = lotCsv([{ ...record, note: '  =HYPERLINK("a")' }]);
  assert.match(csv, /2026-11-10/);
  assert.match(csv, /reference/);
  assert.match(csv, /84500000/);
  assert.match(csv, /"'  =HYPERLINK\(""a""\)"/);
  assert.equal(lotCsv([]).split("\r\n").length, 1);
});

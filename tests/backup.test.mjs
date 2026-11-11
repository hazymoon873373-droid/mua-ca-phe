import test from "node:test";
import assert from "node:assert/strict";
import { backupLots, mergeLotBackup } from "../lib/coffee/lots.mjs";
import {
  assetPath,
  priceApiUrl,
  priceCorsHeaders,
} from "../lib/coffee/client-paths.mjs";
const r = {
  id: "1",
  date: "2026-11-10",
  regionId: "dak-lak",
  role: "sell",
  weightKg: 1000,
  priceVndKg: 85000,
  costVnd: 0,
  note: "Ghi chú",
  priceType: "manual",
  sourceDate: null,
  sourceUrl: null,
};
test("versioned backup validates records and merges without overwriting saved inputs", () => {
  const text = backupLots([r]);
  assert.deepEqual(mergeLotBackup(text, []), { records: [r], added: 1 });
  assert.deepEqual(mergeLotBackup(text, [r]), { records: [r], added: 0 });
  assert.throws(
    () => mergeLotBackup(backupLots([{ ...r, note: "Khác" }]), [r]),
    /trùng mã/,
  );
  for (const text of [
    "not-json",
    JSON.stringify({ version: 2, records: [r] }),
    JSON.stringify({ version: 1, records: [{ ...r, priceVndKg: -1 }] }),
    JSON.stringify({ version: 1, records: [r, r] }),
    "x".repeat(100001),
  ])
    assert.throws(() => mergeLotBackup(text, []));
  const existing = Array.from({ length: 50 }, (_, i) => ({
    ...r,
    id: "e" + i,
  }));
  assert.throws(() => mergeLotBackup(backupLots([r]), existing), /50/);
});
test("root and project paths work and CORS only grants the fixed public Pages origin", () => {
  assert.equal(
    assetPath("/data/history.json", "/mua-ca-phe/"),
    "/mua-ca-phe/data/history.json",
  );
  assert.equal(assetPath("images/a.jpg", "/"), "/images/a.jpg");
  assert.equal(priceApiUrl(""), "/api/market");
  assert.equal(
    priceApiUrl("https://mua-ca-phe-vn.cozyspoon36.chatgpt.site/"),
    "https://mua-ca-phe-vn.cozyspoon36.chatgpt.site/api/market",
  );
  assert.equal(
    priceCorsHeaders("https://hazymoon873373-droid.github.io")[
      "Access-Control-Allow-Origin"
    ],
    "https://hazymoon873373-droid.github.io",
  );
  assert.equal(
    priceCorsHeaders("https://evil.example")["Access-Control-Allow-Origin"],
    undefined,
  );
  assert.equal(
    priceCorsHeaders(null)["Access-Control-Allow-Origin"],
    undefined,
  );
});

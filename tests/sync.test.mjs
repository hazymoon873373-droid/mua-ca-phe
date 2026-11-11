import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { readFileSync, readdirSync } from "node:fs";
import { syncPriceSource, readStoredMarket } from "../lib/coffee/sync.mjs";
const html = readFileSync(
  new URL("../tools/coffee-data-fixture.html", import.meta.url),
  "utf8",
);
function database() {
  const sql = new DatabaseSync(":memory:");
  for (const file of readdirSync("drizzle").filter((x) => x.endsWith(".sql")))
    sql.exec(readFileSync("drizzle/" + file, "utf8"));
  const db = {
    prepare(query) {
      const args = [];
      const stmt = {
        bind(...a) {
          args.push(...a);
          return stmt;
        },
        async first() {
          return sql.prepare(query).get(...args) ?? null;
        },
        async all() {
          return { results: sql.prepare(query).all(...args) };
        },
        async run() {
          const r = sql.prepare(query).run(...args);
          return { meta: { changes: Number(r.changes) } };
        },
      };
      return stmt;
    },
    async batch(statements) {
      sql.exec("BEGIN");
      try {
        const r = [];
        for (const stmt of statements) r.push(await stmt.run());
        sql.exec("COMMIT");
        return r;
      } catch (e) {
        sql.exec("ROLLBACK");
        throw e;
      }
    },
  };
  return db;
}
const now = Date.parse("2026-11-09T15:00:00Z");
test("an interrupted source refresh can recover after five minutes instead of locking for an hour", async () => {
  const db = database();
  await db
    .prepare(
      "INSERT INTO source_state(source,last_attempt) VALUES('giacaphe',?)",
    )
    .bind(now)
    .run();
  const early = await syncPriceSource(db, {
    fetcher: async () => new Response(html),
    now: now + 60000,
  });
  assert.equal(early.reason, "cached");
  const recovered = await syncPriceSource(db, {
    fetcher: async () => new Response(html),
    now: now + 300001,
  });
  assert.equal(recovered.refreshed, true);
  assert.equal((await readStoredMarket(db)).regions.length, 4);
});
test("source sync persists one verified row per day/region and rate-limits all callers", async () => {
  const db = database();
  let calls = 0;
  const fetcher = async () => {
    calls++;
    return new Response(html);
  };
  const a = await syncPriceSource(db, { fetcher, now });
  assert.equal(a.refreshed, true);
  const b = await syncPriceSource(db, { fetcher, now: now + 1000 });
  assert.equal(b.reason, "cached");
  assert.equal(calls, 1);
  const data = await readStoredMarket(db);
  assert.equal(data.regions.length, 4);
  assert.equal(data.sourceDate, "2026-11-09");
  assert.equal(
    data.regions.find((x) => x.regionId === "dak-nong").priceVndKg,
    85300,
  );
  await syncPriceSource(db, { fetcher, now: now + 3600001 });
  assert.equal((await readStoredMarket(db)).snapshots.length, 4);
});
test("upstream failure or malformed payload never destroys good prices", async () => {
  const db = database();
  await syncPriceSource(db, { fetcher: async () => new Response(html), now });
  const fail = await syncPriceSource(db, {
    fetcher: async () => new Response("Denied", { status: 403 }),
    now: now + 3600001,
  });
  assert.equal(fail.refreshed, false);
  assert.equal(fail.reason, "upstream_unavailable");
  let data = await readStoredMarket(db);
  assert.equal(data.regions.length, 4);
  assert.equal(data.sourceDate, "2026-11-09");
  assert.ok(data.sync.error);
  await syncPriceSource(db, {
    fetcher: async () => new Response("<h1>No prices</h1>"),
    now: now + 7200002,
  });
  data = await readStoredMarket(db);
  assert.equal(data.snapshots.length, 4);
  assert.equal(data.sync.error, "source_parse_failed");
});
test("future source date is rejected and fixed URL is never user-controlled", async () => {
  const db = database();
  let requested;
  const r = await syncPriceSource(db, {
    fetcher: async (url) => {
      requested = url;
      return new Response(html.replaceAll("09/11/2026", "09/11/2030"));
    },
    now,
  });
  assert.equal(r.refreshed, false);
  assert.equal(requested, "https://giacaphe.com/gia-ca-phe-noi-dia/");
  assert.equal((await readStoredMarket(db)).regions.length, 0);
});

test("monitoring counts only completed refreshes and never cached reads as successes", async () => {
  const db = database();
  await syncPriceSource(db, { fetcher: async () => new Response(html), now });
  await syncPriceSource(db, { fetcher: async () => new Response(html), now: now + 1000 });
  await syncPriceSource(db, { fetcher: async () => new Response("Denied", { status: 403 }), now: now + 3600001 });
  const { monitoring } = await readStoredMarket(db, { now: now + 3600001 });
  assert.equal(monitoring.available, true);
  assert.equal(monitoring.observedAttempts, 2);
  assert.equal(monitoring.successfulAttempts, 1);
  assert.equal(monitoring.failedAttempts, 1);
  assert.equal(monitoring.successRate, 0.5);
  assert.equal(monitoring.observedSince, "2026-11-09T15:00:00.000Z");
  assert.deepEqual(monitoring.attempts.map((a) => [a.sourceDate, a.outcome]), [[null, "upstream_unavailable"], ["2026-11-09", "updated"]]);
});

test("a deployment before the monitoring migration still updates and reads valid prices", async () => {
  const db = database();
  await db.prepare("DROP TABLE refresh_attempts").run();
  assert.equal((await syncPriceSource(db, { fetcher: async () => new Response(html), now })).refreshed, true);
  const data = await readStoredMarket(db);
  assert.equal(data.regions.length, 4);
  assert.equal(data.sync.error, null);
  assert.equal(data.monitoring.available, false);
  assert.equal(data.monitoring.observedAttempts, 0);
  assert.equal(data.monitoring.successRate, null);
});

test("monitoring storage errors cannot roll back good prices or turn a valid update into failure", async () => {
  const db = database();
  await db.prepare("CREATE TRIGGER reject_log BEFORE INSERT ON refresh_attempts BEGIN SELECT RAISE(ABORT, 'monitoring unavailable'); END").run();
  assert.deepEqual(await syncPriceSource(db, { fetcher: async () => new Response(html), now }), { refreshed: true, reason: "updated" });
  const data = await readStoredMarket(db);
  assert.equal(data.regions.length, 4);
  assert.equal(data.sync.error, null);
  assert.equal(data.monitoring.successRate, null);
});

test("attempt history keeps at most 100 records and excludes records older than 30 days", async () => {
  const db = database();
  for (let i = 0; i < 105; i++) {
    await syncPriceSource(db, { fetcher: async () => new Response(html), now: now + i * 3600001 });
  }
  let data = await readStoredMarket(db, { now: now + 104 * 3600001 });
  assert.equal(data.monitoring.observedAttempts, 100);
  assert.equal(data.monitoring.successRate, 1);
  assert.equal(data.monitoring.attempts[99].attemptedAt, new Date(now + 5 * 3600001).toISOString());
  const later = now + 40 * 86400000;
  assert.equal((await readStoredMarket(db, { now: later })).monitoring.observedAttempts, 0);
  await syncPriceSource(db, { fetcher: async () => new Response(html), now: later });
  data = await readStoredMarket(db, { now: later });
  assert.equal(data.monitoring.observedAttempts, 1);
  assert.equal(data.monitoring.observedSince, new Date(later).toISOString());
});

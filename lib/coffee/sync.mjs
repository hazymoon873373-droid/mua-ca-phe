import { parseDomesticPrices, REGIONS } from "./source.mjs";
const SOURCE_URL = "https://giacaphe.com/gia-ca-phe-noi-dia/";
export async function syncPriceSource(
  db,
  { fetcher = fetch, now = Date.now() } = {},
) {
  await db
    .prepare(
      "INSERT OR IGNORE INTO source_state(source,last_attempt) VALUES('giacaphe',0)",
    )
    .run();
  const lease = await db
    .prepare(
      "UPDATE source_state SET last_attempt=? WHERE source='giacaphe' AND last_attempt<?",
    )
    .bind(now, now - 3600000)
    .run();
  if (!lease.meta.changes) return { refreshed: false, reason: "cached" };
  let reason = "upstream_unavailable";
  try {
    const response = await fetcher(SOURCE_URL, {
      signal: AbortSignal.timeout(12000),
      headers: {
        "User-Agent": "MuaCaPhe/0.1 (reference prices; hourly cache)",
        Accept: "text/html",
      },
    });
    if (!response.ok) throw new Error("Upstream unavailable");
    reason = "source_parse_failed";
    const parsed = parseDomesticPrices(await response.text());
    const today = new Date(now + 7 * 3600000).toISOString().slice(0, 10);
    const state = await db
      .prepare(
        "SELECT last_source_date FROM source_state WHERE source='giacaphe'",
      )
      .first();
    if (
      parsed.sourceDate > today ||
      (state.last_source_date && parsed.sourceDate < state.last_source_date)
    ) {
      reason = "source_date_out_of_range";
      throw new Error("Invalid observation date");
    }
    const stamp = new Date(now).toISOString();
    const statements = parsed.regions.map((r) =>
      db
        .prepare(
          "INSERT INTO daily_prices(id,date,region_id,price_vnd_kg,change_vnd_kg,fetched_at,source_url) VALUES(?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET price_vnd_kg=excluded.price_vnd_kg,change_vnd_kg=excluded.change_vnd_kg,fetched_at=excluded.fetched_at",
        )
        .bind(
          `${parsed.sourceDate}/${r.regionId}`,
          parsed.sourceDate,
          r.regionId,
          r.priceVndKg,
          r.changeVndKg,
          stamp,
          SOURCE_URL,
        ),
    );
    statements.push(
      db
        .prepare(
          "UPDATE source_state SET last_success=?,last_source_date=?,error=NULL WHERE source='giacaphe'",
        )
        .bind(stamp, parsed.sourceDate),
    );
    await db.batch(statements);
    return { refreshed: true, reason: "updated" };
  } catch (error) {
    await db
      .prepare("UPDATE source_state SET error=? WHERE source='giacaphe'")
      .bind(reason)
      .run();
    console.warn("Coffee source refresh:", reason);
    return { refreshed: false, reason };
  }
}
export async function readStoredMarket(db) {
  const { results } = await db
    .prepare("SELECT * FROM daily_prices ORDER BY date DESC,region_id")
    .all();
  const sourceDate = results[0]?.date ?? null;
  const sync = await db
    .prepare("SELECT * FROM source_state WHERE source='giacaphe'")
    .first();
  const regions = results
    .filter((r) => r.date === sourceDate)
    .map((r) => ({
      regionId: r.region_id,
      name:
        REGIONS.find((x) => x.regionId === r.region_id)?.name ?? r.region_id,
      priceVndKg: r.price_vnd_kg,
      changeVndKg: r.change_vnd_kg,
    }));
  return {
    sourceDate,
    fetchedAt: sync?.last_success ?? null,
    sourceUrl: SOURCE_URL,
    sourceId: "giacaphe-snapshot",
    sourceLicenseUnconfirmed: true,
    regions,
    sync: sync ?? {},
    snapshots: results.map((r) => ({
      date: r.date,
      regionId: r.region_id,
      priceVndKg: r.price_vnd_kg,
      sourceId: "giacaphe-snapshot",
    })),
  };
}

import { env } from "cloudflare:workers";
import { syncPriceSource, readStoredMarket } from "./sync.mjs";
import seed from "../../public/data/latest.json";
export async function marketData() {
  try {
    if (!env.DB) throw new Error("Database unavailable");
    const refresh = await syncPriceSource(env.DB);
    const stored = await readStoredMarket(env.DB);
    if (stored.regions.length)
      return { ...stored, storageReady: true, refresh };
    return {
      ...seed,
      snapshots: seed.regions.map((r) => ({
        date: seed.sourceDate,
        regionId: r.regionId,
        priceVndKg: r.priceVndKg,
        sourceId: "giacaphe-snapshot",
      })),
      sync: stored.sync,
      storageReady: true,
      refresh,
      seedFallback: true,
    };
  } catch (error) {
    console.warn("Coffee storage read unavailable");
    return {
      ...seed,
      snapshots: seed.regions.map((r) => ({
        date: seed.sourceDate,
        regionId: r.regionId,
        priceVndKg: r.priceVndKg,
        sourceId: "giacaphe-snapshot",
      })),
      sync: {
        error: "storage_unavailable",
        last_attempt: null,
        last_success: null,
      },
      storageReady: false,
      seedFallback: true,
    };
  }
}

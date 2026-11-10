import { isValidDate } from "./source.mjs";
const DAY = 86400000;
const finite = (x) => typeof x === "number" && Number.isFinite(x);
const positive = (x) => finite(x) && x > 0;
const distance = (a, b) => (Date.parse(b) - Date.parse(a)) / DAY;
const models = ["naive", "prophet", "xgboost"];

export function validateForecastArtifact(d) {
  try {
    if (
      d?.schemaVersion !== 1 ||
      d.sourceId !== "mendeley-v3" ||
      !/^[a-f0-9]{64}$/.test(d.sourceSha256) ||
      !Number.isFinite(Date.parse(d.generatedAt)) ||
      typeof d.generatedAt !== "string" ||
      typeof d.models?.prophet?.version !== "string" ||
      typeof d.models?.xgboost?.version !== "string" ||
      typeof d.validation?.description !== "string" ||
      typeof d.validation?.method !== "string" ||
      !Array.isArray(d.regions) ||
      !d.regions.length
    )
      return false;
    const ids = new Set();
    for (const r of d.regions) {
      if (
        !["dak-lak", "lam-dong"].includes(r.regionId) ||
        ids.has(r.regionId) ||
        !isValidDate(r.trainStart) ||
        !isValidDate(r.trainEnd) ||
        r.trainStart > r.trainEnd ||
        !Number.isInteger(r.observationCount) ||
        r.observationCount < 1 ||
        r.horizons?.length !== 2
      )
        return false;
      ids.add(r.regionId);
      if (new Set(r.horizons.map((h) => h.days)).size !== 2) return false;
      for (const h of r.horizons) {
        if (
          ![1, 7].includes(h.days) ||
          !Array.isArray(h.backtest) ||
          !h.backtest.length ||
          h.metrics?.length !== 3 ||
          new Set(h.metrics.map((m) => m.model)).size !== 3
        )
          return false;
        const origins = new Set();
        for (const p of h.backtest) {
          if (
            !isValidDate(p.origin) ||
            !isValidDate(p.date) ||
            distance(p.origin, p.date) !== h.days ||
            p.date > r.trainEnd ||
            p.origin < r.trainStart ||
            origins.has(p.origin) ||
            !["actual", ...models, "lower80", "upper80"].every((k) =>
              positive(p[k]),
            ) ||
            p.lower80 > p.upper80
          )
            return false;
          origins.add(p.origin);
        }
        for (const m of h.metrics) {
          if (
            !models.includes(m.model) ||
            m.n !== h.backtest.length ||
            !finite(m.mae) ||
            m.mae < 0 ||
            !finite(m.rmse) ||
            m.rmse < 0
          )
            return false;
          const errors = h.backtest.map((p) => p[m.model] - p.actual);
          const mae =
            errors.reduce((a, e) => a + Math.abs(e), 0) / errors.length;
          const rmse = Math.sqrt(
            errors.reduce((a, e) => a + e * e, 0) / errors.length,
          );
          if (Math.abs(mae - m.mae) > 0.2 || Math.abs(rmse - m.rmse) > 0.2)
            return false;
          if (m.model === "prophet") {
            const coverage =
              h.backtest.filter(
                (p) => p.actual >= p.lower80 && p.actual <= p.upper80,
              ).length / h.backtest.length;
            if (
              !finite(m.coverage80) ||
              Math.abs(coverage - m.coverage80) > 0.001
            )
              return false;
          } else if (m.coverage80 !== null) return false;
        }
        const f = h.forecast;
        if (
          !isValidDate(f?.date) ||
          distance(r.trainEnd, f.date) !== h.days ||
          !models.every((m) => positive(f[m]?.yhat)) ||
          !positive(f.prophet.lower80) ||
          !positive(f.prophet.upper80) ||
          f.prophet.lower80 > f.prophet.upper80
        )
          return false;
      }
    }
    return true;
  } catch {
    return false;
  }
}

export function forecastStatus(region, days, today) {
  const h = region.horizons.find((h) => h.days === days);
  const age = distance(region.trainEnd, today);
  if (!h || !isValidDate(today) || age < 0 || age > 3)
    return { state: "stale", eligibleModels: [] };
  if (h.forecast.date <= today) return { state: "expired", eligibleModels: [] };
  const baseline = h.metrics.find((m) => m.model === "naive");
  const eligibleModels = h.metrics
    .filter((m) => m.model !== "naive" && m.n >= 20 && m.mae < baseline.mae)
    .map((m) => m.model);
  return {
    state: eligibleModels.length ? "ready" : "unproven",
    eligibleModels,
  };
}

export function forecastCsv(region, days) {
  const h = region.horizons.find((h) => h.days === days);
  return [
    "source,region,origin,target,actual,naive,prophet,xgboost,lower80,upper80",
    ...h.backtest.map((p) =>
      [
        "mendeley-v3",
        region.regionId,
        p.origin,
        p.date,
        p.actual,
        p.naive,
        p.prophet,
        p.xgboost,
        p.lower80,
        p.upper80,
      ].join(","),
    ),
  ].join("\n");
}

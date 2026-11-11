import { isValidDate } from "./source.mjs";
export function validStudySummary(d) {
  try {
    const ids = ["dak-lak", "lam-dong"],
      models = ["naive", "seasonalNaive", "prophet", "xgboost"];
    return (
      d?.schemaVersion === 1 &&
      d.studyType === "retrospective" &&
      d.currentEligible === false &&
      isValidDate(d.sourceEnd) &&
      Array.isArray(d.regions) &&
      d.regions.length === 2 &&
      new Set(d.regions.map((r) => r.regionId)).size === 2 &&
      d.regions.every(
        (r) =>
          ids.includes(r.regionId) &&
          isValidDate(r.sourceEnd) &&
          Array.isArray(r.horizons) &&
          r.horizons.length === 2 &&
          new Set(r.horizons.map((h) => h.days)).size === 2 &&
          r.horizons.every(
            (h) =>
              [1, 7].includes(h.days) &&
              Array.isArray(h.metrics) &&
              h.metrics.length === 4 &&
              new Set(h.metrics.map((m) => m.model)).size === 4 &&
              h.metrics.every(
                (m) =>
                  models.includes(m.model) &&
                  Number.isInteger(m.n) &&
                  m.n > 0 &&
                  Number.isFinite(m.mae) &&
                  m.mae >= 0,
              ),
          ),
      )
    );
  } catch {
    return false;
  }
}

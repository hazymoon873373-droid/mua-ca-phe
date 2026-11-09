import { isValidDate, REGIONS } from "./source.mjs";

export function sanitizeHistory(rows) {
  if (!Array.isArray(rows)) throw new Error("History rows must be an array");
  const unique = new Map();
  for (const row of rows) {
    const { date, regionId, priceVndKg, sourceId } = row;
    if (
      !isValidDate(date) ||
      !REGIONS.some((r) => r.regionId === regionId) ||
      !Number.isFinite(priceVndKg) ||
      priceVndKg < 1000 ||
      priceVndKg > 1_000_000 ||
      typeof sourceId !== "string" ||
      !/^[a-z0-9-]+$/.test(sourceId)
    )
      throw new Error("Invalid history observation");
    const key = `${sourceId}/${regionId}/${date}`;
    if (unique.has(key) && unique.get(key).priceVndKg !== priceVndKg)
      throw new Error("Conflicting history observation");
    unique.set(key, { date, regionId, priceVndKg, sourceId });
  }
  return [...unique.values()].sort(
    (a, b) =>
      a.date.localeCompare(b.date) ||
      a.sourceId.localeCompare(b.sourceId) ||
      a.regionId.localeCompare(b.regionId),
  );
}

export function monthlyAverages(rows, { regionId, sourceId } = {}) {
  const groups = new Map();
  for (const row of sanitizeHistory(rows)) {
    if (
      (regionId && row.regionId !== regionId) ||
      (sourceId && row.sourceId !== sourceId)
    )
      continue;
    const yearMonth = row.date.slice(0, 7);
    const key = `${row.sourceId}/${row.regionId}/${yearMonth}`;
    const group = groups.get(key) ?? {
      sourceId: row.sourceId,
      regionId: row.regionId,
      yearMonth,
      total: 0,
      observationCount: 0,
    };
    group.total += row.priceVndKg;
    group.observationCount++;
    groups.set(key, group);
  }
  return [...groups.values()].map(({ total, ...group }) => ({
    ...group,
    meanPriceVndKg: total / group.observationCount,
  }));
}

// Complete calendar years with observed data in each month; missing daily observations are never filled.
export function seasonalProfile(rows, { regionId, sourceId }) {
  if (!regionId || !sourceId)
    throw new Error("A single region and source are required");
  const monthly = monthlyAverages(rows, { regionId, sourceId });
  const years = new Map();
  for (const month of monthly) {
    const year = Number(month.yearMonth.slice(0, 4));
    const entries = years.get(year) ?? [];
    entries.push(month);
    years.set(year, entries);
  }
  const result = Array.from({ length: 12 }, (_, index) => ({
    month: index + 1,
    meanDeviationPct: 0,
    years: [],
    observationCount: 0,
  }));
  for (const [year, months] of years) {
    if (months.length !== 12) continue;
    const baseline = months.reduce((sum, m) => sum + m.meanPriceVndKg, 0) / 12;
    for (const entry of months) {
      const month = result[Number(entry.yearMonth.slice(5)) - 1];
      month.meanDeviationPct += (entry.meanPriceVndKg / baseline - 1) * 100;
      month.years.push(year);
      month.observationCount += entry.observationCount;
    }
  }
  return result
    .filter((m) => m.years.length)
    .map((m) => ({
      ...m,
      meanDeviationPct: m.meanDeviationPct / m.years.length,
    }));
}

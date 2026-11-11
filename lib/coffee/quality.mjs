import { isValidDate, REGIONS } from "./source.mjs";

const DAY = 86400000;
const SOURCE_ID = "giacaphe-snapshot";

export function assessDataQuality(market, now = Date.now()) {
  const today = new Date(now + 7 * 3600000).toISOString().slice(0, 10);
  const expectedRegionIds = REGIONS.slice(0, 4).map((r) => r.regionId);
  const dates = new Map();
  const unique = new Set();
  let invalidRows = 0;
  for (const row of market.snapshots ?? []) {
    if (row.sourceId !== SOURCE_ID) continue;
    if (
      !isValidDate(row.date) || row.date > today ||
      !REGIONS.some((r) => r.regionId === row.regionId) ||
      !Number.isSafeInteger(row.priceVndKg) || row.priceVndKg < 1000 || row.priceVndKg > 1_000_000
    ) {
      invalidRows++;
      continue;
    }
    unique.add(`${row.date}/${row.regionId}`);
    if (!dates.has(row.date)) dates.set(row.date, new Set());
    dates.get(row.date).add(row.regionId);
  }
  const days = [...dates.keys()].sort();
  const firstDate = days[0] ?? null;
  const lastDate = days.at(-1) ?? null;
  const calendarDays = days.length ? (Date.parse(lastDate) - Date.parse(firstDate)) / DAY + 1 : 0;
  // Calendar gaps describe collection coverage; the source has no verified trading calendar.
  const missingCalendarDates = [];
  for (let index = 0; index < calendarDays; index++) {
    const date = new Date(Date.parse(firstDate) + index * DAY).toISOString().slice(0, 10);
    if (!dates.has(date)) missingCalendarDates.push(date);
  }
  const sourceDate = isValidDate(market.sourceDate) ? market.sourceDate : null;
  const fetchedAt = typeof market.fetchedAt === "string" && isValidDate(market.fetchedAt.slice(0, 10))
    ? Date.parse(market.fetchedAt) : NaN;
  return {
    sourceId: SOURCE_ID,
    sourceDate,
    sourceAgeDays: sourceDate && sourceDate <= today ? (Date.parse(today) - Date.parse(sourceDate)) / DAY : null,
    fetchedAgeHours: Number.isFinite(fetchedAt) && fetchedAt <= now ? (now - fetchedAt) / 3600000 : null,
    coverage: {
      firstDate, lastDate, observedDays: days.length, calendarDays, missingCalendarDates,
      incompleteDates: days.flatMap((date) => {
        const missingRegionIds = expectedRegionIds.filter((id) => !dates.get(date).has(id));
        return missingRegionIds.length ? [{ date, missingRegionIds }] : [];
      }),
      expectedRegionIds, validRows: unique.size, invalidRows,
    },
  };
}

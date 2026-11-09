import { REGIONS } from "./source.mjs";
export const dayDistance = (a, b) =>
  Math.round(
    (Date.parse(b + "T00:00:00Z") - Date.parse(a + "T00:00:00Z")) / 86400000,
  );
export function filterWindow(rows, regionId, sourceId, days = 90) {
  const series = rows
    .filter((r) => r.regionId === regionId && r.sourceId === sourceId)
    .sort((a, b) => a.date.localeCompare(b.date));
  if (!series.length || !days) return series;
  const end = series.at(-1).date;
  return series.filter((r) => dayDistance(r.date, end) < days);
}
export function splitGaps(rows, maxDays = 7) {
  const groups = [];
  for (const row of rows) {
    const last = groups.at(-1);
    if (!last || dayDistance(last.at(-1).date, row.date) > maxDays)
      groups.push([row]);
    else last.push(row);
  }
  return groups;
}
export function seriesSummary(rows) {
  if (!rows.length) return null;
  const values = rows.map((r) => r.priceVndKg),
    first = rows[0],
    last = rows.at(-1),
    change = last.priceVndKg - first.priceVndKg;
  return {
    count: rows.length,
    firstDate: first.date,
    lastDate: last.date,
    min: Math.min(...values),
    max: Math.max(...values),
    mean: values.reduce((a, b) => a + b, 0) / values.length,
    change,
    changePct: (change / first.priceVndKg) * 100,
  };
}
export function validWatch(w) {
  return (
    !!w &&
    REGIONS.some((r) => r.regionId === w.regionId) &&
    ["above", "below"].includes(w.direction) &&
    Number.isFinite(w.target) &&
    w.target >= 1000 &&
    w.target <= 1000000
  );
}
export function evaluateWatch(w, price) {
  if (!Number.isFinite(price)) return null;
  return w.direction === "above" ? price >= w.target : price <= w.target;
}
export function exportCsv(rows) {
  const cell = (value) => {
    let s = String(value ?? "");
    if (/^[=+@\-\t\r]/.test(s)) s = "'" + s;
    return /[",\r\n]/.test(s) ? '"' + s.replaceAll('"', '""') + '"' : s;
  };
  return [
    "date,region_id,price_vnd_kg,source_id",
    ...rows.map((r) =>
      [r.date, r.regionId, r.priceVndKg, r.sourceId].map(cell).join(","),
    ),
  ].join("\r\n");
}
export const dateLabel = (value) =>
  new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(value + "T00:00:00Z"));
export const priceLabel = (value) =>
  new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 }).format(value);
export const signedPrice = (value) =>
  (value > 0 ? "+" : "") + priceLabel(value);
export function mergeMarket(current, incoming) {
  const older =
    incoming.sourceDate < current.sourceDate ||
    (incoming.sourceDate === current.sourceDate &&
      (incoming.seedFallback ||
        (incoming.fetchedAt &&
          current.fetchedAt &&
          incoming.fetchedAt < current.fetchedAt)));
  if (!older) return incoming;
  return {
    ...current,
    storageReady: incoming.storageReady ?? current.storageReady,
    sync: {
      ...current.sync,
      ...(incoming.sync?.error ? { error: incoming.sync.error } : {}),
      ...(incoming.sync?.last_attempt
        ? { last_attempt: incoming.sync.last_attempt }
        : {}),
    },
  };
}

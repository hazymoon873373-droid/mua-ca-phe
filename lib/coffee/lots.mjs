import { REGIONS, isValidDate, DOMESTIC_SOURCE_URL } from "./source.mjs";
import { csvCell } from "./analytics.mjs";
export function calculateLot({ role, weightKg, priceVndKg, costVnd } = {}) {
  if (
    !["sell", "buy"].includes(role) ||
    !Number.isFinite(weightKg) ||
    weightKg < 0.001 ||
    weightKg > 1000000 ||
    Math.abs(weightKg * 1000 - Math.round(weightKg * 1000)) > 1e-6 ||
    !Number.isInteger(priceVndKg) ||
    priceVndKg < 1 ||
    priceVndKg > 1000000 ||
    !Number.isInteger(costVnd) ||
    costVnd < 0 ||
    costVnd > 1e12
  )
    return null;
  const weightGrams = Math.round(weightKg * 1000),
    grossVnd = Math.round((weightGrams * priceVndKg) / 1000);
  return {
    grossVnd,
    totalVnd: grossVnd + (role === "buy" ? costVnd : -costVnd),
    weightGrams,
  };
}
export function compareRegions(quotes, input) {
  return quotes.flatMap((q) => {
    const value = calculateLot({ ...input, priceVndKg: q.priceVndKg });
    return value ? [{ regionId: q.regionId, ...value }] : [];
  });
}
export function validLotRecord(r) {
  return (
    !!r &&
    typeof r.id === "string" &&
    r.id.length > 0 &&
    r.id.length <= 100 &&
    isValidDate(r.date) &&
    REGIONS.some((q) => q.regionId === r.regionId) &&
    typeof r.note === "string" &&
    r.note.length <= 120 &&
    !!calculateLot(r) &&
    ((r.priceType === "manual" &&
      r.sourceDate === null &&
      r.sourceUrl === null) ||
      (r.priceType === "reference" &&
        isValidDate(r.sourceDate) &&
        r.sourceUrl === DOMESTIC_SOURCE_URL))
  );
}
export function lotCsv(records) {
  return [
    "date,role,region_id,weight_kg,price_vnd_kg,cost_vnd,gross_vnd,total_vnd,price_type,source_date,source_url,note",
    ...records.filter(validLotRecord).map((r) => {
      const v = calculateLot(r);
      return [
        r.date,
        r.role,
        r.regionId,
        r.weightKg,
        r.priceVndKg,
        r.costVnd,
        v.grossVnd,
        v.totalVnd,
        r.priceType,
        r.sourceDate,
        r.sourceUrl,
        r.note,
      ]
        .map(csvCell)
        .join(",");
    }),
  ].join("\r\n");
}

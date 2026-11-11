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
export function backupLots(records) {
  if (
    !Array.isArray(records) ||
    records.length > 50 ||
    !records.every(validLotRecord) ||
    new Set(records.map((r) => r.id)).size !== records.length
  )
    throw Error("Sổ chứa dữ liệu không hợp lệ.");
  return JSON.stringify(
    { format: "mua-ca-phe-lots", version: 1, records },
    null,
    2,
  );
}
export function mergeLotBackup(text, existing) {
  if (typeof text !== "string" || text.length > 100000)
    throw Error("Tệp sao lưu quá lớn (tối đa 100 KB).");
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw Error("Tệp không phải JSON hợp lệ.");
  }
  if (
    data?.format !== "mua-ca-phe-lots" ||
    data.version !== 1 ||
    !Array.isArray(data.records)
  )
    throw Error("Tệp không đúng định dạng sao lưu Mùa Cà Phê.");
  backupLots(data.records);
  backupLots(existing);
  const byId = new Map(existing.map((r) => [r.id, r]));
  const added = [];
  for (const r of data.records) {
    const old = byId.get(r.id);
    if (old) {
      const keys = [
        "date",
        "regionId",
        "role",
        "weightKg",
        "priceVndKg",
        "costVnd",
        "note",
        "priceType",
        "sourceDate",
        "sourceUrl",
      ];
      if (keys.some((k) => r[k] !== old[k]))
        throw Error(
          "Có lô trùng mã nhưng khác nội dung; chưa nhập để tránh ghi đè.",
        );
    } else {
      added.push(r);
      byId.set(r.id, r);
    }
  }
  if (existing.length + added.length > 50)
    throw Error("Sau khi nhập sẽ vượt giới hạn 50 lô.");
  return { records: [...added, ...existing], added: added.length };
}

export const DOMESTIC_SOURCE_URL = "https://giacaphe.com/gia-ca-phe-noi-dia/";
export const REGIONS = [
  { regionId: "dak-lak", name: "Đắk Lắk" },
  { regionId: "lam-dong", name: "Lâm Đồng" },
  { regionId: "gia-lai", name: "Gia Lai" },
  { regionId: "dak-nong", name: "Đắk Nông" },
  { regionId: "kon-tum", name: "Kon Tum" },
];

export function isValidDate(date) {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(date) &&
    Number.isFinite(Date.parse(date)) &&
    new Date(date).toISOString().slice(0, 10) === date
  );
}

function numeric(text) {
  const value = text.trim();
  if (!/^[+-]?(?:\d+|\d{1,3}(?:,\d{3})+)$/.test(value))
    throw new Error("Invalid domestic price number");
  return Number(value.replaceAll(",", ""));
}

export function parseDomesticPrices(html, sourceUrl = DOMESTIC_SOURCE_URL) {
  if (typeof html !== "string" || html.length > 3_000_000)
    throw new Error("Invalid source HTML");
  const heading = html
    .match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1]
    .replace(/<[^>]+>/g, " ");
  const date = heading?.match(/ngày\s+(\d{2})\/(\d{2})\/(\d{4})/i);
  const sourceDate = date && `${date[3]}-${date[2]}-${date[1]}`;
  if (!sourceDate || !isValidDate(sourceDate))
    throw new Error("Missing or malformed source date");
  const cssValues = new Map();
  for (const style of html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)) {
    for (const match of style[1].matchAll(
      /\.([\w-]+)::after\s*\{[^}]*?\bcontent\s*:\s*(['"])([^'"]*)\2[^}]*\}/g,
    )) {
      const [, className, , content] = match;
      if (!content.trim()) continue;
      if (cssValues.has(className) && cssValues.get(className) !== content)
        throw new Error("Ambiguous price CSS");
      cssValues.set(className, content);
    }
  }
  const section = html.match(
    /<div\b[^>]*\bid=['"]gia-noi-dia['"][^>]*>([\s\S]*?<\/table>)/i,
  )?.[1];
  if (!section) throw new Error("Domestic price table missing");
  const regions = [];
  for (const row of section.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const cells = [...row[1].matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map(
      (m) => m[1],
    );
    const name = cells[0]?.replace(/<[^>]+>/g, "").trim();
    const region = REGIONS.find((r) => r.name === name);
    if (!region) continue;
    if (
      regions.some((r) => r.regionId === region.regionId) ||
      cells.length !== 3
    )
      throw new Error("Invalid region row");
    const values = cells.slice(1).map((cell) => {
      const classes = [...cell.matchAll(/\bclass=['"]([^'"]*)['"]/gi)].flatMap(
        (m) => m[1].split(/\s+/),
      );
      const contents = classes
        .filter((c) => cssValues.has(c))
        .map((c) => cssValues.get(c));
      if (contents.length > 1) throw new Error("Ambiguous numeric cell");
      return numeric(contents[0] ?? cell.replace(/<[^>]+>/g, ""));
    });
    if (
      !Number.isSafeInteger(values[0]) ||
      values[0] < 1000 ||
      values[0] > 1_000_000 ||
      !Number.isSafeInteger(values[1]) ||
      Math.abs(values[1]) > 500_000
    )
      throw new Error("Price outside supported bounds");
    regions.push({ ...region, priceVndKg: values[0], changeVndKg: values[1] });
  }
  if (
    REGIONS.slice(0, 4).some(
      (r) => !regions.some((p) => p.regionId === r.regionId),
    )
  )
    throw new Error("Required coffee region missing");
  return { sourceDate, regions, sourceUrl };
}

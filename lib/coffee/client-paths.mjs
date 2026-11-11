export function assetPath(path, base = import.meta.env?.BASE_URL || "/") {
  return base.replace(/\/?$/, "/") + path.replace(/^\//, "");
}
export function priceApiUrl(
  base = import.meta.env?.VITE_MARKET_API_BASE || "",
) {
  return base.replace(/\/$/, "") + "/api/market";
}
/** @returns {Record<string,string>} */
export function priceCorsHeaders(origin) {
  return origin === "https://hazymoon873373-droid.github.io"
    ? {
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Max-Age": "300",
        Vary: "Origin",
      }
    : {};
}

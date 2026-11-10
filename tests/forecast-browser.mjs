import { chromium } from "playwright";
import assert from "node:assert/strict";
import { readFile, writeFile, mkdir } from "node:fs/promises";
const base = process.env.TEST_URL || "http://127.0.0.1:5182/";
const artifact = JSON.parse(
  await readFile("public/data/forecast.json", "utf8"),
);
const browser = await chromium.launch({ headless: true, channel: "chrome" });
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
});
const page = await context.newPage();
const errors = [],
  checks = [];
page.on("pageerror", (e) => errors.push(e.message));
try {
  await page.goto(base);
  await page.waitForSelector(".forecast-metrics");
  const res = await context.request.get(new URL("/api/forecast", base).href);
  assert.equal(res.status(), 200);
  const actual = await res.json();
  assert.equal(actual.models.prophet.version, artifact.models.prophet.version);
  assert.equal(await page.locator(".forecast-metrics tbody tr").count(), 3);
  assert.match(
    await page.locator("#forecast-live-title").textContent(),
    /Chưa phát hành/,
  );
  assert.match(
    await page.locator(".forecast-availability").textContent(),
    /22\/05\/2026/,
  );
  checks.push(
    "Actual two-model artifact and API; stale history withholds current forecasts",
  );
  await page
    .locator("#du-bao")
    .getByRole("button", { name: "7 ngày", exact: true })
    .click();
  assert.match(page.url(), /du-bao=7/);
  assert.match(
    await page.locator(".forecast-evidence-heading h3").textContent(),
    /7 ngày/,
  );
  await page.locator(".forecast-chart").focus();
  const before = await page.locator(".forecast-readout").textContent();
  await page.keyboard.press("ArrowLeft");
  assert.notEqual(
    await page.locator(".forecast-readout").textContent(),
    before,
  );
  const dl = page.waitForEvent("download");
  await page.getByRole("button", { name: "Tải bảng kiểm định CSV" }).click();
  assert.match((await dl).suggestedFilename(), /7-ngay.csv/);
  await page.locator(".forecast-observations summary").click();
  assert.equal(
    await page.locator(".forecast-observations tbody tr").count(),
    10,
  );
  await page
    .locator(".forecast-observations")
    .getByRole("button", { name: "Sau", exact: true })
    .click();
  assert.match(
    await page
      .locator(".forecast-observations .table-pagination")
      .textContent(),
    /Trang 2/,
  );
  checks.push(
    "Horizon URL, keyboard accessible chart, real CSV, actual/predicted table pagination",
  );
  await page.locator("#history-region").selectOption("kon-tum");
  assert.match(
    await page.locator(".forecast-empty").textContent(),
    /chưa có mô hình/,
  );
  await page.getByRole("button", { name: "Xem mô hình Đắk Lắk" }).click();
  await page.waitForSelector(".forecast-metrics");
  checks.push(
    "Unsupported regions show honest empty state with supported-region action",
  );
  await page
    .getByRole("spinbutton", { name: "Ngưỡng biến động phần trăm" })
    .fill("0.1");
  assert.equal(await page.locator(".volatility-alert li").count(), 4);
  await page.reload();
  await page.waitForSelector(".forecast-metrics");
  assert.equal(
    await page
      .getByRole("spinbutton", { name: "Ngưỡng biến động phần trăm" })
      .inputValue(),
    "0.1",
  );
  await page
    .getByRole("spinbutton", { name: "Ngưỡng biến động phần trăm" })
    .fill("0");
  assert.match(
    await page.locator(".volatility-alert [role=alert]").textContent(),
    /0,1/,
  );
  checks.push(
    "Source-dated percentage thresholds validate and persist locally",
  );
  for (const width of [360, 768, 1440, 1920]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto(base);
    await page.waitForSelector(".forecast-metrics");
    await page.locator("#du-bao").scrollIntoViewIfNeeded();
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    );
    await mkdir("test-results", { recursive: true });
    await page
      .locator("#du-bao")
      .screenshot({ path: `test-results/forecast-${width}.png` });
  }
  checks.push("Forecast panel and tables fit four screen widths");
  await page.route("**/api/forecast", (route) =>
    route.fulfill({ status: 503, json: { error: "unavailable" } }),
  );
  await page.goto(base);
  await page.getByRole("button", { name: "Thử tải lại mô hình" }).waitFor();
  assert.equal(await page.locator(".region-quote").count(), 4);
  await page.unroute("**/api/forecast");
  await page.getByRole("button", { name: "Thử tải lại mô hình" }).click();
  await page.waitForSelector(".forecast-metrics");
  await page.route("**/api/forecast", (route) =>
    route.fulfill({
      json: { ...artifact, asOfDate: "2026-11-10", regions: [] },
    }),
  );
  await page.reload();
  await page.getByRole("button", { name: "Thử tải lại mô hình" }).waitFor();
  checks.push(
    "Unavailable/malformed model data is recoverable and leaves price lookup intact",
  );
  await page.unroute("**/api/forecast");
  await page.route("**/api/forecast", (route) =>
    route.fulfill({
      json: { ...artifact, asOfDate: "2026-11-10", validation: null },
    }),
  );
  await page.reload();
  await page.getByRole("button", { name: "Thử tải lại mô hình" }).waitFor();
  assert.equal(await page.locator(".region-quote").count(), 4);
  checks.push("Malformed rendered metadata cannot crash the price dashboard");
  await page.unroute("**/api/forecast");
  // Isolated browser fixture exercises the future eligible state, never persisted to the server.
  const eligible = structuredClone(artifact);
  for (const r of eligible.regions)
    for (const h of r.horizons) {
      for (const p of h.backtest) {
        p.prophet = p.actual;
        p.lower80 = p.actual - 100;
        p.upper80 = p.actual + 100;
      }
      const m = h.metrics.find((m) => m.model === "prophet");
      m.mae = 0;
      m.rmse = 0;
      m.coverage80 = 1;
    }
  await page.route("**/api/forecast", (route) =>
    route.fulfill({ json: { ...eligible, asOfDate: "2026-05-22" } }),
  );
  await page.reload();
  await page.waitForSelector(".forecast-live-values");
  assert.equal(await page.locator(".forecast-live-values li").count(), 1);
  assert.match(
    await page.locator(".forecast-live-values li").textContent(),
    /Prophet/,
  );
  assert.doesNotMatch(
    await page.locator(".forecast-live-values li").textContent(),
    /XGBoost/,
  );
  assert.match(
    await page.locator(".forecast-live-values").textContent(),
    /23\/05\/2026/,
  );
  checks.push(
    "Eligible-state fixture exposes only qualifying model and exact future target date",
  );
  assert.deepEqual(errors, []);
  await mkdir("docs/verification", { recursive: true });
  await writeFile(
    "docs/verification/forecast-browser.json",
    JSON.stringify(
      { executedAt: new Date().toISOString(), base, checks, errors },
      null,
      2,
    ),
  );
  console.log("PASS", checks.length, "forecast browser check groups");
} finally {
  await browser.close();
}

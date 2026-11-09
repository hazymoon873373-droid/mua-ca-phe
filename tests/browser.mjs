import { chromium } from "playwright";
import assert from "node:assert/strict";
import { readFile, mkdir, writeFile } from "node:fs/promises";
const base = process.env.TEST_URL || "http://127.0.0.1:5182/";
const browser = await chromium.launch({ headless: true, channel: "chrome" });
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
});
const page = await context.newPage();
const errors = [],
  checks = [];
page.on("pageerror", (e) => errors.push(e.message));
await mkdir("test-results", { recursive: true });
try {
  await page.goto(base);
  await page.waitForSelector(".chart-readout");
  await page.evaluate(() => document.fonts.ready);
  assert.equal(await page.locator("html").getAttribute("lang"), "vi");
  assert.equal(await page.locator(".region-quote").count(), 4);
  assert.equal(
    await page.locator("h1").innerText(),
    "Theo nhịp giá.\nHiểu mùa cà phê.",
  );
  assert.ok(
    await page.evaluate(() =>
      document.fonts.check('600 16px "Hanken Grotesk"'),
    ),
  );
  checks.push(
    "New Vietnamese site, four actual source regions, local Hanken font loaded",
  );
  const response = await context.request.get(new URL("/api/market", base).href);
  assert.equal(response.status(), 200);
  const market = await response.json();
  assert.equal(market.regions.length, 4);
  assert.equal(market.storageReady, true);
  checks.push(
    "Real API backed by initialized D1 store, four validated regions",
  );
  const rawHistory = JSON.parse(
    await readFile("public/data/history.json", "utf8"),
  );
  const series = rawHistory.rows.filter((r) => r.regionId === "dak-lak");
  const last = series.at(-1);
  assert.match(
    await page.locator(".data-period").textContent(),
    /22\/05\/2026/,
  );
  assert.match(
    await page.locator(".chart-readout strong").textContent(),
    /86.633/,
  );
  await page.getByRole("button", { name: "30 ngày", exact: true }).click();
  assert.match(page.url(), /ngay=30/);
  await page.locator("#history-region").selectOption("kon-tum");
  assert.match(
    await page.locator(".data-period").textContent(),
    /16\/01\/2026/,
  );
  checks.push(
    "Date windows anchored to selected historical coverage; Kon Tum does not pretend May coverage",
  );
  await page.locator("#history-region").selectOption("dak-lak");
  await page.locator(".chart-frame").focus();
  const before = await page.locator(".chart-readout").textContent();
  await page.keyboard.press("ArrowLeft");
  assert.notEqual(await page.locator(".chart-readout").textContent(), before);
  assert.equal(
    await page.locator(".chart-readout").getAttribute("aria-live"),
    "polite",
  );
  checks.push("Keyboard chart inspection updates an accessible live readout");
  const dl = page.waitForEvent("download");
  await page.getByRole("button", { name: "Tải CSV", exact: true }).click();
  assert.match((await dl).suggestedFilename(), /\.csv$/);
  checks.push("Filtered source-separated CSV download");
  await page.locator("#history-source").selectOption("giacaphe-snapshot");
  await page.waitForSelector(".chart-single");
  assert.match(
    await page.locator(".chart-single").textContent(),
    /Một quan sát/,
  );
  checks.push(
    "New source with one day has no fabricated trend or joined historical line",
  );
  await page.locator("#history-source").selectOption("mendeley-v3");
  await page.getByRole("button", { name: "Tất cả", exact: true }).click();
  await page.locator(".data-table-details summary").click();
  assert.equal(await page.locator(".data-table-details tbody tr").count(), 20);
  await page.getByRole("button", { name: "Sau", exact: true }).click();
  assert.match(
    await page.locator(".table-pagination").textContent(),
    /Trang 2/,
  );
  assert.equal(await page.locator(".monthly-table tbody tr").count(), 7);
  assert.ok((await page.locator(".monthly-table .no-observation").count()) > 0);
  checks.push("History table pagination and real missing-month cells");
  await page.locator("#watch-target").fill("84000");
  await page.getByRole("button", { name: "Lưu ngưỡng", exact: true }).click();
  assert.equal(await page.locator(".watch-row").count(), 1);
  assert.match(await page.locator(".watch-row").textContent(), /Đã chạm mốc/);
  await page.reload();
  await page.waitForSelector(".watch-row");
  assert.match(await page.locator(".watch-row").textContent(), /84.000/);
  await page.locator(".remove-watch").click();
  assert.equal(await page.locator(".watch-row").count(), 0);
  await page.getByRole("button", { name: "Hoàn tác", exact: true }).click();
  assert.equal(await page.locator(".watch-row").count(), 1);
  checks.push("Watch thresholds persist locally, remove and undo work");
  await page.route("**/api/market", (route) =>
    route.fulfill({
      json: {
        ...market,
        sourceDate: "2026-11-10",
        fetchedAt: "2026-11-10T03:00:00Z",
        regions: market.regions.map((r) => ({ ...r, priceVndKg: 88000 })),
        sync: { last_attempt: 1794280000000, error: null },
      },
    }),
  );
  await page
    .getByRole("button", { name: "Kiểm tra nguồn", exact: true })
    .click();
  await page.waitForFunction(
    () =>
      document.querySelector(".region-quote strong").textContent === "88.000",
  );
  await page.unroute("**/api/market");
  await page.route("**/api/market", (route) =>
    route.fulfill({
      json: {
        ...market,
        seedFallback: true,
        sync: { error: "storage_unavailable" },
      },
    }),
  );
  await page
    .getByRole("button", { name: "Kiểm tra nguồn", exact: true })
    .click();
  await page.waitForFunction(() =>
    document.querySelector(".status-line").textContent.includes("giữ bản"),
  );
  assert.equal(
    await page.locator(".region-quote strong").first().textContent(),
    "88.000",
  );
  checks.push(
    "Storage-failure fixture cannot regress newer displayed prices to old seed",
  );
  await page.unroute("**/api/market");
  await page.route("**/api/market", (route) =>
    route.fulfill({ status: 503, body: "Unavailable" }),
  );
  await page
    .getByRole("button", { name: "Kiểm tra nguồn", exact: true })
    .click();
  await page.waitForFunction(() =>
    document.querySelector(".status-line").textContent.includes("Chưa kết nối"),
  );
  assert.equal(
    await page.locator(".region-quote strong").first().textContent(),
    "88.000",
  );
  checks.push("Network failure keeps existing displayed prices");
  await page.unroute("**/api/market");
  for (const width of [360, 768, 1440, 1920]) {
    await page.setViewportSize({ width, height: 960 });
    await page.goto(base);
    await page.waitForSelector(".chart-readout");
    await page.evaluate(() => document.fonts.ready);
    const layout = await page.evaluate(() => ({
      scroll: document.documentElement.scrollWidth,
      width: innerWidth,
      bad: [...document.querySelectorAll("button,input,select")]
        .filter((e) => {
          const r = e.getBoundingClientRect();
          return r.width && (r.right > innerWidth + 1 || r.left < 0);
        })
        .map((e) => e.id || e.className),
    }));
    assert.ok(layout.scroll <= width + 1, JSON.stringify(layout));
    assert.deepEqual(layout.bad, [], JSON.stringify(layout));
    await page.screenshot({
      path: `test-results/${width}.png`,
      fullPage: true,
    });
  }
  checks.push(
    "360/768/1440/1920 layouts, no clipped controls or page overflow",
  );
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(base);
  await page.keyboard.press("Tab");
  assert.match(
    await page.evaluate(() => document.activeElement.textContent),
    /Đến bảng giá/,
  );
  await page.keyboard.press("Enter");
  assert.equal(
    await page.evaluate(() => document.activeElement.id),
    "thi-truong",
  );
  checks.push("Keyboard skip link reaches market");
  await page.goto(new URL("/credits.html", base).href);
  assert.match(await page.locator("body").textContent(), /A S M Jobaer/);
  assert.equal(
    (
      await context.request.get(new URL("/data/provenance.json", base).href)
    ).status(),
    200,
  );
  checks.push("Published credit and provenance documents reachable");
  assert.deepEqual(errors, []);
  await page.goto(base);
  await page.waitForSelector(".chart-readout");
  await page.evaluate(() => document.fonts.ready);
  await writeFile(".hallmark/rendered.html", (await page.content()).replace(/href="\/app\/globals\.css"/g,'href="../app/globals.css"'));
  await page.screenshot({
    path: "test-results/desktop-fold.png",
    fullPage: false,
  });
  await mkdir("docs/verification", { recursive: true });
  await writeFile(
    "docs/verification/browser.json",
    JSON.stringify(
      {
        executedAt: new Date().toISOString(),
        base,
        checks,
        errors,
        limitations:
          "Storage/network failures use explicit fixtures; actual API/D1 read exercised separately. No assistive-technology user study.",
      },
      null,
      2,
    ),
  );
  console.log("PASS", checks.length, "browser checks");
} finally {
  await browser.close();
}

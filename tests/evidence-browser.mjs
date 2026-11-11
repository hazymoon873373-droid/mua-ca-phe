import { chromium } from "playwright";
import assert from "node:assert/strict";
import { readFile, writeFile, mkdir } from "node:fs/promises";
const base = process.env.TEST_URL || "http://127.0.0.1:5182/";
const browser = await chromium.launch({ channel: "chrome", headless: true });
const checks = [],
  errors = [];
try {
  const context = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
    }),
    page = await context.newPage();
  page.on("pageerror", (e) => errors.push(e.message));
  const market = JSON.parse(await readFile("public/data/latest.json", "utf8"));
  market.snapshots = market.regions.map((r) => ({
    date: market.sourceDate,
    regionId: r.regionId,
    priceVndKg: r.priceVndKg,
    sourceId: "giacaphe-snapshot",
  }));
  market.monitoring = {
    available: true,
    observedAttempts: 2,
    successfulAttempts: 1,
    failedAttempts: 1,
    successRate: 0.5,
    observedSince: "2026-11-11T01:00:00.000Z",
    attempts: [
      {
        attemptedAt: "2026-11-11T02:00:00.000Z",
        sourceDate: market.sourceDate,
        outcome: "updated",
      },
      {
        attemptedAt: "2026-11-11T01:00:00.000Z",
        sourceDate: null,
        outcome: "upstream_unavailable",
      },
    ],
  };
  await page.route("**/api/market", (r) =>
    r.fulfill({
      json: market,
      headers: { "Access-Control-Allow-Origin": new URL(base).origin },
    }),
  );
  let broken = true;
  await page.route("**/data/forecast-study.json", (r) =>
    broken ? r.fulfill({ json: { regions: [] } }) : r.continue(),
  );
  await page.goto(base);
  assert.equal(await page.getByRole('heading',{name:'Thử nghiệm cùng người dùng',exact:true}).count(),0);
  await page.locator("#data-quality summary").click();
  await page.waitForFunction(() =>
    document
      .querySelector("#data-quality")
      .textContent.includes("1/2 lần kiểm tra"),
  );
  assert.match(
    await page.locator("#data-quality").innerText(),
    /không phải tỷ lệ hoạt động/,
  );
  const download = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Tải nhật ký và độ phủ", exact: true })
    .click();
  const report = JSON.parse(
    await readFile(await (await download).path(), "utf8"),
  );
  assert.equal(report.monitoring.observedAttempts, 2);
  assert.equal(report.quality.coverage.observedDays, 1);
  checks.push(
    "Explicit monitoring fixture exports measured attempts and separate collection coverage",
  );
  await page.locator(".forecast-study summary").click();
  await page
    .getByRole("button", { name: "Thử lại kết quả nghiên cứu", exact: true })
    .waitFor();
  broken = false;
  await page
    .getByRole("button", { name: "Thử lại kết quả nghiên cứu", exact: true })
    .click();
  await page
    .getByRole("combobox", { name: "Vùng nghiên cứu", exact: true })
    .waitFor();
  assert.equal(await page.locator(".forecast-study tbody tr").count(), 4);
  await page
    .getByRole("combobox", { name: "Vùng nghiên cứu", exact: true })
    .selectOption("lam-dong");
  await page
    .getByRole("combobox", { name: "Kỳ hạn nghiên cứu", exact: true })
    .selectOption("7");
  assert.equal(await page.locator(".forecast-study tbody tr").count(), 4);
  assert.match(
    await page.locator(".forecast-study").innerText(),
    /Chưa phát hành dự báo giá hiện tại/,
  );
  checks.push(
    "Malformed study is withheld; retry loads actual retrospective artifact and region/horizon controls",
  );
  for (const width of [360, 768, 1440, 1920]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.locator(".forecast-study").scrollIntoViewIfNeeded();
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    );
  }
  checks.push("Expanded source/research disclosures fit four viewport widths");
  const kit = new URL("field-kit/", base).href;
  const response = await context.request.get(kit);
  assert.equal(response.status(), 200);
  await page.goto(kit);
  assert.equal(await page.locator("html").getAttribute("lang"), "vi");
  const links = await page
    .locator("a[href]")
    .evaluateAll((a) =>
      a
        .map((x) => x.getAttribute("href"))
        .filter((x) => x && !x.startsWith("#") && !/^https?:|^mailto:/.test(x)),
    );
  for (const path of links) {
    const r = await context.request.get(new URL(path, kit).href);
    assert.equal(r.status(), 200, `Field kit link ${path}`);
  }
  await page.setViewportSize({ width: 360, height: 1000 });
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  );
  checks.push(
    "Vietnamese field kit and all local downloads reachable under active hosting base",
  );
  assert.deepEqual(errors, []);
  await mkdir("test-results", { recursive: true });
  await writeFile(
    "test-results/evidence-browser.json",
    JSON.stringify(
      {
        base,
        checks,
        errors,
        limitations:
          "Monitoring counts use an explicit fixture; actual deployed D1 checked separately. No real participant results.",
      },
      null,
      2,
    ),
  );
  console.log("PASS", checks.length, "evidence browser groups");
} finally {
  await browser.close();
}

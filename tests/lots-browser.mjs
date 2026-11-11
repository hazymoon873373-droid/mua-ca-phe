import { chromium } from "playwright";
import assert from "node:assert/strict";
import { readFile, writeFile, mkdir } from "node:fs/promises";
const base = process.env.TEST_URL || "http://127.0.0.1:5182/";
const browser = await chromium.launch({ headless: true, channel: "chrome" });
const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
  }),
  page = await context.newPage(),
  errors = [],
  checks = [];
page.on("pageerror", (e) => errors.push(e.message));
async function enter(p, note = "Lô thử nghiệm") {
  await p
    .getByRole("combobox", { name: "Đơn vị", exact: true })
    .selectOption("ton");
  await p
    .getByRole("spinbutton", { name: "Khối lượng", exact: true })
    .fill("1");
  await p.getByLabel("Đơn giá (đ/kg)", { exact: true }).fill("");
  await p.getByLabel("Đơn giá (đ/kg)", { exact: true }).fill("85000");
  await p
    .getByLabel("Vận chuyển và chi phí khác (đ)", { exact: true })
    .fill("500000");
  await p.getByLabel("Ngày của lô", { exact: true }).fill("2026-11-10");
  await p.getByLabel("Ghi chú", { exact: true }).fill(note);
}
try {
  await page.goto(base);
  await page.locator(".lot-form").waitFor();
  assert.equal(await page.locator(".forecast-section").count(), 0);
  assert.equal(
    await page
      .getByText("Dự báo, đi cùng kiểm chứng.", { exact: true })
      .count(),
    0,
  );
  await enter(page);
  assert.match(await page.locator(".lot-total").innerText(), /84\.500\.000/);
  await page
    .getByRole("combobox", { name: "Nhu cầu", exact: true })
    .selectOption("buy");
  assert.match(await page.locator(".lot-total").innerText(), /85\.500\.000/);
  await page
    .getByRole("combobox", { name: "Đơn vị", exact: true })
    .selectOption("kg");
  assert.equal(
    await page
      .getByRole("spinbutton", { name: "Khối lượng", exact: true })
      .inputValue(),
    "1000",
  );
  assert.match(await page.locator(".lot-total").innerText(), /85\.500\.000/);
  assert.equal(await page.locator(".lot-comparison").count(), 0);
  assert.equal(await page.locator(".opening-photo figcaption, .lot-photo figcaption").count(), 0);
  checks.push(
    "Forecast diagnostics removed; kg/ton, sale/buy money calculation, redundant comparison and photo captions removed",
  );
  await page
    .getByRole("button", { name: "Lưu vào sổ lô hàng", exact: true })
    .click();
  assert.equal(await page.locator(".lot-records>li").count(), 1);
  assert.match(await page.locator(".lot-records").innerText(), /Giá tự nhập/);
  await page.reload();
  await page.locator(".lot-records>li").waitFor();
  assert.match(await page.locator(".lot-records").innerText(), /85\.500\.000/);
  await page
    .getByRole("button", { name: "Xóa lô Lô thử nghiệm", exact: true })
    .click();
  assert.equal(await page.locator(".lot-records>li").count(), 0);
  await page.getByRole("button", { name: "Hoàn tác xóa", exact: true }).click();
  assert.equal(await page.locator(".lot-records>li").count(), 1);
  checks.push(
    "Saved money/provenance frozen across reload; delete/undo restores original record",
  );
  await enter(page, '=HYPERLINK("x")');
  await page
    .getByRole("button", { name: "Lưu vào sổ lô hàng", exact: true })
    .click();
  const dl = page.waitForEvent("download");
  await page.getByRole("button", { name: "Tải sổ CSV", exact: true }).click();
  const download = await dl;
  const csv = await readFile(await download.path(), "utf8");
  assert.match(csv, /manual/);
  assert.match(csv, /'=HYPERLINK/);
  assert.match(csv, /85000/);
  checks.push(
    "Actual CSV download includes record values and escapes formula notes",
  );
  await page
    .getByRole("spinbutton", { name: "Khối lượng", exact: true })
    .fill("0");
  assert.equal(await page.locator(".lot-total").count(), 0);
  assert.equal(
    await page
      .getByRole("button", { name: "Lưu vào sổ lô hàng", exact: true })
      .isDisabled(),
    true,
  );
  await page
    .getByRole("spinbutton", { name: "Khối lượng", exact: true })
    .fill("1");
  await page
    .getByRole("button", { name: "Dùng lại giá tham khảo", exact: true })
    .click();
  assert.match(
    await page.locator(".lot-input-note").innerText(),
    /Giá tham khảo/,
  );
  checks.push(
    "Invalid inputs withhold result/save; reference price can be restored explicitly",
  );
  await mkdir("test-results", { recursive: true });
  for (const width of [360, 768, 1440, 1920]) {
    await page.setViewportSize({ width, height: 960 });
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    );
    await page
      .locator("#lo-hang")
      .screenshot({ path: `test-results/lots-${width}.png` });
  }
  checks.push("Calculator and notebook fit four viewport widths");
  const blocked = await browser.newContext();
  await blocked.addInitScript(() => {
    const set = Storage.prototype.setItem;
    Storage.prototype.setItem = function (k, v) {
      if (k === "mua-ca-phe-lots-v1")
        throw new DOMException("Quota", "QuotaExceededError");
      return set.call(this, k, v);
    };
  });
  const b = await blocked.newPage();
  await b.goto(base);
  await enter(b);
  await b
    .getByRole("button", { name: "Lưu vào sổ lô hàng", exact: true })
    .click();
  assert.equal(await b.locator(".lot-records>li").count(), 1);
  assert.match(
    await b.locator("#so-lo-hang").innerText(),
    /Trình duyệt không lưu được sổ/,
  );
  await blocked.close();
  checks.push(
    "Storage quota failure retains session record and explains CSV fallback",
  );
  const corrupt = await browser.newContext();
  await corrupt.addInitScript(() =>
    localStorage.setItem("mua-ca-phe-lots-v1", "not-json"),
  );
  const c = await corrupt.newPage();
  await c.goto(base);
  await enter(c);
  await c
    .getByRole("button", { name: "Lưu vào sổ lô hàng", exact: true })
    .click();
  assert.equal(
    await c.evaluate(() => localStorage.getItem("mua-ca-phe-lots-v1")),
    "not-json",
  );
  assert.match(
    await c.locator("#so-lo-hang").innerText(),
    /Dữ liệu cũ được giữ nguyên/,
  );
  await corrupt.close();
  checks.push("Corrupt stored data is never silently overwritten");
  const conflict = await browser.newContext();
  const cp = await conflict.newPage();
  await cp.goto(base);
  await enter(cp);
  await cp.evaluate(() => localStorage.setItem("mua-ca-phe-lots-v1", "[]"));
  await cp
    .getByRole("button", { name: "Lưu vào sổ lô hàng", exact: true })
    .click();
  assert.equal(
    await cp.evaluate(() => localStorage.getItem("mua-ca-phe-lots-v1")),
    "[]",
  );
  assert.match(
    await cp.locator("#so-lo-hang").innerText(),
    /Sổ đã thay đổi ở tab khác/,
  );
  await conflict.close();
  checks.push("A changed stored version cannot be overwritten by an older tab");
  assert.deepEqual(errors, []);
  await mkdir("docs/verification", { recursive: true });
  await writeFile(
    "docs/verification/lots-browser.json",
    JSON.stringify(
      { executedAt: new Date().toISOString(), base, checks, errors },
      null,
      2,
    ),
  );
  console.log("PASS", checks.length, "lot tools browser groups");
} finally {
  await browser.close();
}

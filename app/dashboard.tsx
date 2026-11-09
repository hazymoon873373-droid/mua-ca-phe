"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpRight,
  Download,
  RefreshCw,
  Plus,
  X,
  Bell,
  Check,
  ExternalLink,
} from "lucide-react";
import PriceChart from "./components/price-chart";
import { REGIONS } from "../lib/coffee/source.mjs";
import { sanitizeHistory, monthlyAverages } from "../lib/coffee/history.mjs";
import {
  filterWindow,
  seriesSummary,
  priceLabel,
  dateLabel,
  signedPrice,
  validWatch,
  evaluateWatch,
  exportCsv,
  mergeMarket,
} from "../lib/coffee/analytics.mjs";
type Observation = {
  date: string;
  regionId: string;
  priceVndKg: number;
  sourceId: string;
};
type Quote = {
  regionId: string;
  name: string;
  priceVndKg: number;
  changeVndKg: number;
};
type Market = {
  sourceDate: string;
  fetchedAt: string;
  sourceUrl: string;
  regions: Quote[];
  snapshots?: Observation[];
  sync?: {
    error?: string | null;
    last_attempt?: number | null;
    last_success?: string | null;
  };
  seedFallback?: boolean;
  storageReady?: boolean;
};
type Watch = { regionId: string; direction: string; target: number };
const shortTime = (value: string | number) =>
  new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
  }).format(new Date(value));
function downloadRows(rows: Observation[]) {
  const url = URL.createObjectURL(
    new Blob(["\ufeff" + exportCsv(rows)], { type: "text/csv;charset=utf-8" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = "mua-ca-phe-quan-sat.csv";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export default function Dashboard({ initial }: { initial: Market }) {
  const [market, setMarket] = useState<Market>(initial),
    [busy, setBusy] = useState(false),
    [refreshNote, setRefreshNote] = useState(""),
    [region, setRegion] = useState("dak-lak"),
    [days, setDays] = useState(90),
    [source, setSource] = useState("mendeley-v3");
  const [history, setHistory] = useState<Observation[]>([]),
    [historyStatus, setHistoryStatus] = useState("loading"),
    [retry, setRetry] = useState(0),
    [watchList, setWatchList] = useState<Watch[]>([]),
    [watchLoaded, setWatchLoaded] = useState(false),
    [watchError, setWatchError] = useState(""),
    [watchNote, setWatchNote] = useState(""),
    [undone, setUndone] = useState<Watch | null>(null),
    [watchRegion, setWatchRegion] = useState("dak-lak"),
    [direction, setDirection] = useState("above"),
    [target, setTarget] = useState(""),
    [tablePage, setTablePage] = useState(0);
  const refresh = useCallback(async (manual = false) => {
    setBusy(true);
    if (manual) setRefreshNote("Đang đối chiếu bản ghi gần nhất…");
    try {
      const response = await fetch("/api/market", {
        method: manual ? "POST" : "GET",
        signal: AbortSignal.timeout(18000),
        cache: "no-store",
      });
      if (!response.ok) throw new Error();
      const data = (await response.json()) as Market;
      if (!Array.isArray(data.regions) || !data.sourceDate) throw new Error();
      setMarket((previous) => mergeMarket(previous, data));
      if (manual)
        setRefreshNote(
          data.sync?.error
            ? "Chưa đọc được nguồn mới. Đang giữ bản ghi gần nhất."
            : "Đã đối chiếu. Nguồn có ngày " + dateLabel(data.sourceDate) + ".",
        );
    } catch {
      setRefreshNote("Chưa kết nối được. Bảng ghi gần nhất vẫn được giữ lại.");
    } finally {
      setBusy(false);
    }
  }, []);
  useEffect(() => {
    void refresh();
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, 300000);
    return () => clearInterval(timer);
  }, [refresh]);
  useEffect(() => {
    const controller = new AbortController();
    setHistoryStatus("loading");
    fetch("/data/history.json", { signal: controller.signal })
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json() as Promise<{ rows: Observation[] }>;
      })
      .then((data) => {
        setHistory(sanitizeHistory(data.rows));
        setHistoryStatus("ready");
      })
      .catch((e) => {
        if (e.name !== "AbortError") setHistoryStatus("error");
      });
    return () => controller.abort();
  }, [retry]);
  useEffect(() => {
    try {
      const raw = JSON.parse(
        localStorage.getItem("mua-ca-phe-watch-v1") || "[]",
      );
      if (Array.isArray(raw)) setWatchList(raw.filter(validWatch).slice(0, 5));
    } catch {}
    setWatchLoaded(true);
    const params = new URLSearchParams(location.search);
    const r = params.get("vung"),
      d = Number(params.get("ngay")),
      s = params.get("nguon");
    if (REGIONS.some((x) => x.regionId === r)) setRegion(r!);
    if (params.has("ngay") && [7, 30, 90, 365, 0].includes(d)) setDays(d);
    if (s === "giacaphe-snapshot") setSource(s);
  }, []);
  useEffect(() => {
    if (!watchLoaded) return;
    try {
      localStorage.setItem("mua-ca-phe-watch-v1", JSON.stringify(watchList));
    } catch {
      setWatchError(
        "Trình duyệt không lưu được ngưỡng; tùy chọn chỉ tồn tại trong lần mở này.",
      );
    }
  }, [watchList, watchLoaded]);
  useEffect(() => {
    if (!watchLoaded) return;
    const url = new URL(location.href);
    url.searchParams.set("vung", region);
    url.searchParams.set("ngay", String(days));
    url.searchParams.set("nguon", source);
    window.history.replaceState(null, "", url);
    setTablePage(0);
  }, [region, days, source, watchLoaded]);
  const regionName = REGIONS.find((r) => r.regionId === region)?.name || region;
  const freshRows =
    market.snapshots ||
    market.regions.map((r) => ({
      date: market.sourceDate,
      regionId: r.regionId,
      priceVndKg: r.priceVndKg,
      sourceId: "giacaphe-snapshot",
    }));
  const rows = useMemo(
    () =>
      filterWindow(
        source === "mendeley-v3" ? history : freshRows,
        region,
        source,
        days,
      ),
    [history, freshRows, region, source, days],
  );
  const summary = useMemo(() => seriesSummary(rows), [rows]);
  const months = useMemo(
    () =>
      monthlyAverages(history, { regionId: region, sourceId: "mendeley-v3" }),
    [history, region],
  );
  const years = [...new Set(months.map((m) => m.yearMonth.slice(0, 4)))]
      .sort()
      .reverse(),
    monthMin = Math.min(...months.map((m) => m.meanPriceVndKg)),
    monthMax = Math.max(...months.map((m) => m.meanPriceVndKg));
  const stale =
    market.sourceDate !==
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Ho_Chi_Minh",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
  function addWatch(e: React.FormEvent) {
    e.preventDefault();
    const item = { regionId: watchRegion, direction, target: Number(target) };
    if (!validWatch(item)) {
      setWatchError("Nhập mốc từ 1.000 đến 1.000.000 đ/kg.");
      return;
    }
    if (
      watchList.some(
        (w) =>
          w.regionId === item.regionId &&
          w.direction === item.direction &&
          w.target === item.target,
      )
    ) {
      setWatchError("Ngưỡng này đã được lưu.");
      return;
    }
    if (watchList.length >= 5) {
      setWatchError("Có thể lưu tối đa 5 ngưỡng trên thiết bị.");
      return;
    }
    setWatchList([...watchList, item]);
    setWatchError("");
    setWatchNote("Đã lưu ngưỡng trên thiết bị này.");
    setUndone(null);
  }
  return (
    <>
      <a className="skip-link" href="#thi-truong">
        Đến bảng giá
      </a>
      <header className="site-header container">
        <a href="/" className="wordmark" aria-label="Mùa Cà Phê, trang chủ">
          <span>mùa.</span>
          <span>cà phê</span>
        </a>
        <nav aria-label="Điều hướng chính">
          <a href="#thi-truong">Thị trường</a>
          <a href="#lich-su">Lịch sử</a>
          <a href="#mua-vu">Theo tháng</a>
          <a href="#nguon">Nguồn dữ liệu</a>
        </nav>
        <a href="#theo-doi" className="header-watch">
          <Bell size={16} aria-hidden="true" />
          <span>Theo dõi mốc giá</span>
        </a>
      </header>
      <main className="container">
        <section className="opening" aria-labelledby="page-title">
          <div className="opening-copy">
            <h1 id="page-title">
              Theo nhịp giá.
              <br />
              Hiểu mùa cà phê.
            </h1>
            <p>Giá Robusta theo vùng, lịch sử rõ nguồn, biến động dễ đọc.</p>
            <a className="inline-link" href="#lich-su">
              Khám phá lịch sử giá <ArrowUpRight size={17} aria-hidden="true" />
            </a>
          </div>
          <figure className="opening-photo">
            <img
              src="/images/roasted-coffee-beans-on-the-surface-01-1920.jpg"
              alt="Hạt cà phê rang, ảnh minh họa"
              width="1920"
              height="1280"
            />
            <figcaption>
              Nhìn thị trường từ dữ liệu.
              <span>Ảnh minh họa hạt cà phê rang.</span>
            </figcaption>
          </figure>
        </section>
        <section
          id="thi-truong"
          tabIndex={-1}
          className="market-section"
          aria-labelledby="market-title"
        >
          <div className="section-heading">
            <div>
              <h2 id="market-title">Bảng giá Robusta</h2>
              <p>Giá tham khảo trong nước, đồng/kg.</p>
            </div>
            <div className="market-actions">
              <span className="source-date">
                Bản ghi {dateLabel(market.sourceDate)}
              </span>
              <button
                className="button-quiet refresh-button"
                onClick={() => void refresh(true)}
                disabled={busy}
                aria-busy={busy}
              >
                <RefreshCw
                  size={16}
                  aria-hidden="true"
                  className={busy ? "refreshing" : ""}
                />
                <span>{busy ? "Đang đối chiếu" : "Kiểm tra nguồn"}</span>
              </button>
            </div>
          </div>
          <div className="regional-ledger" aria-label="Chọn vùng giá">
            {market.regions.map((r) => (
              <button
                key={r.regionId}
                className={
                  "region-quote" + (region === r.regionId ? " selected" : "")
                }
                onClick={() => setRegion(r.regionId)}
                aria-pressed={region === r.regionId}
              >
                <span className="region-name">
                  {r.name}
                  <ArrowUpRight size={16} aria-hidden="true" />
                </span>
                <strong>{priceLabel(r.priceVndKg)}</strong>
                <span
                  className={
                    "daily-change " + (r.changeVndKg >= 0 ? "rise" : "fall")
                  }
                >
                  {r.changeVndKg > 0 ? (
                    <ArrowUp size={13} aria-hidden="true" />
                  ) : r.changeVndKg < 0 ? (
                    <ArrowDown size={13} aria-hidden="true" />
                  ) : null}
                  {signedPrice(r.changeVndKg)} <span>so bản trước</span>
                </span>
              </button>
            ))}
          </div>
          <div className="source-meta">
            <p>
              Nguồn:{" "}
              <a
                href={market.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                Giacaphe.com / Y5Cafe
              </a>
              .{" "}
              {market.sync?.last_attempt
                ? "Kiểm tra " + shortTime(market.sync.last_attempt)
                : "Ghi nhận " + shortTime(market.fetchedAt)}
              .
            </p>
            <p className={market.sync?.error || stale ? "source-warning" : ""}>
              {market.sync?.error
                ? "Chưa đọc được nguồn mới; giữ bản ghi gần nhất."
                : stale
                  ? "Nguồn chưa có bản ghi mang ngày hôm nay."
                  : "Ngày dữ liệu trùng ngày hôm nay."}
            </p>
          </div>
          <p className="status-line" role="status">
            {refreshNote}
          </p>
        </section>
        <section
          id="lich-su"
          className="history-section"
          aria-labelledby="history-title"
        >
          <div className="section-heading">
            <div>
              <h2 id="history-title">Một đường giá. Nhiều góc nhìn.</h2>
              <p>
                Chọn vùng và khoảng thời gian để đọc những thay đổi đã xảy ra.
              </p>
            </div>
            <button
              className="button-quiet"
              disabled={!rows.length}
              onClick={() => downloadRows(rows)}
            >
              <Download size={16} aria-hidden="true" />
              Tải CSV
            </button>
          </div>
          <div className="chart-sheet">
            <div className="chart-toolbar">
              <label className="select-label">
                Vùng trồng
                <select
                  id="history-region"
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                >
                  {REGIONS.map((r) => (
                    <option key={r.regionId} value={r.regionId}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="select-label source-select">
                Bộ dữ liệu
                <select
                  id="history-source"
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                >
                  <option value="mendeley-v3">Lịch sử nghiên cứu</option>
                  <option value="giacaphe-snapshot">Theo dõi nguồn mới</option>
                </select>
              </label>
              <div
                className="range-controls"
                role="group"
                aria-label="Khoảng lịch sử"
              >
                {[
                  [7, "7 ngày"],
                  [30, "30 ngày"],
                  [90, "90 ngày"],
                  [365, "1 năm"],
                  [0, "Tất cả"],
                ].map(([value, label]) => (
                  <button
                    key={value}
                    aria-pressed={days === value}
                    onClick={() => setDays(Number(value))}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div className="chart-heading">
              <div>
                <span>{regionName}</span>
                <h3>
                  {source === "mendeley-v3"
                    ? "Lịch sử giá tham khảo"
                    : "Các bản ghi từ nguồn mới"}
                </h3>
              </div>
              <span className="data-period">
                {summary
                  ? `${dateLabel(summary.firstDate)} đến ${dateLabel(summary.lastDate)}`
                  : "Đang đọc dữ liệu"}
              </span>
            </div>
            {source === "mendeley-v3" && historyStatus === "loading" ? (
              <div className="chart-loading" role="status">
                Đang mở dữ liệu lịch sử…
              </div>
            ) : source === "mendeley-v3" && historyStatus === "error" ? (
              <div className="chart-empty" role="alert">
                <p>Chưa tải được lịch sử.</p>
                <button
                  className="button-quiet"
                  onClick={() => setRetry(retry + 1)}
                >
                  Thử lại
                </button>
              </div>
            ) : (
              <PriceChart rows={rows} name={regionName} />
            )}
            <div className="chart-footnote">
              <span>
                {summary
                  ? `${summary.count} quan sát thực có`
                  : "Chưa có quan sát"}
                . Không tự điền ngày thiếu.
              </span>
              <span>
                {source === "mendeley-v3"
                  ? "Mendeley Data V3, dữ liệu kết thúc trong năm 2026."
                  : "Lưu từ lúc hệ thống bắt đầu ghi nhận."}
              </span>
            </div>
            {summary && (
              <dl className="window-statistics">
                <div>
                  <dt>Thấp nhất trong khoảng</dt>
                  <dd>
                    {priceLabel(summary.min)} <small>đ/kg</small>
                  </dd>
                </div>
                <div>
                  <dt>Cao nhất trong khoảng</dt>
                  <dd>
                    {priceLabel(summary.max)} <small>đ/kg</small>
                  </dd>
                </div>
                <div>
                  <dt>Đầu đến cuối khoảng</dt>
                  <dd>
                    {signedPrice(summary.change)} <small>đ/kg</small>
                  </dd>
                </div>
              </dl>
            )}
          </div>
          <details className="data-table-details">
            <summary>Xem bảng quan sát và nguồn</summary>
            <div className="table-scroll">
              <table>
                <caption>Quan sát đang hiển thị, mới nhất trước</caption>
                <thead>
                  <tr>
                    <th>Ngày</th>
                    <th>Vùng</th>
                    <th className="numeric">Giá (đ/kg)</th>
                    <th>Nguồn</th>
                  </tr>
                </thead>
                <tbody>
                  {[...rows]
                    .reverse()
                    .slice(tablePage * 20, (tablePage + 1) * 20)
                    .map((r) => (
                      <tr key={r.date}>
                        <td>{dateLabel(r.date)}</td>
                        <td>{regionName}</td>
                        <td className="numeric">{priceLabel(r.priceVndKg)}</td>
                        <td>
                          {r.sourceId === "mendeley-v3"
                            ? "Mendeley V3"
                            : "Giacaphe.com"}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
            <div className="table-pagination">
              <button
                className="button-quiet"
                disabled={tablePage === 0}
                onClick={() => setTablePage(tablePage - 1)}
              >
                Trước
              </button>
              <span>
                Trang {tablePage + 1} /{" "}
                {Math.max(1, Math.ceil(rows.length / 20))}
              </span>
              <button
                className="button-quiet"
                disabled={(tablePage + 1) * 20 >= rows.length}
                onClick={() => setTablePage(tablePage + 1)}
              >
                Sau
              </button>
            </div>
          </details>
        </section>
        <section
          id="mua-vu"
          className="monthly-section"
          aria-labelledby="monthly-title"
        >
          <div className="section-heading">
            <div>
              <h2 id="monthly-title">Đặt từng tháng cạnh nhau.</h2>
              <p>Giá bình quân trên các ngày có quan sát của {regionName}.</p>
            </div>
            <span className="quiet-label">Lịch sử, không phải dự báo</span>
          </div>
          <div
            className="monthly-scroll"
            tabIndex={0}
            role="region"
            aria-label="Bảng giá theo tháng, cuộn ngang để xem đủ các tháng"
          >
            <table className="monthly-table">
              <caption>
                Giá trung bình theo tháng, nghìn đồng/kg. Ô trống nghĩa là không
                có dữ liệu.
              </caption>
              <thead>
                <tr>
                  <th>Năm</th>
                  {Array.from({ length: 12 }, (_, i) => (
                    <th key={i}>Tháng {i + 1}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {years.map((year) => (
                  <tr key={year}>
                    <th scope="row">{year}</th>
                    {Array.from({ length: 12 }, (_, i) => {
                      const m = months.find(
                        (x) =>
                          x.yearMonth ===
                          `${year}-${String(i + 1).padStart(2, "0")}`,
                      );
                      return (
                        <td
                          key={i}
                          className={m ? "heat-cell" : "no-observation"}
                          style={
                            m
                              ? ({
                                  "--intensity": `${8 + ((m.meanPriceVndKg - monthMin) / (monthMax - monthMin || 1)) * 44}%`,
                                } as React.CSSProperties)
                              : undefined
                          }
                          title={
                            m
                              ? `${m.observationCount} quan sát; ${priceLabel(m.meanPriceVndKg)} đ/kg`
                              : "Không có quan sát"
                          }
                        >
                          {m
                            ? (m.meanPriceVndKg / 1000).toLocaleString(
                                "vi-VN",
                                { maximumFractionDigits: 1 },
                              )
                            : ""}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="monthly-note">
            Màu đậm thể hiện giá bình quân cao hơn trong bảng. Tháng ít quan sát
            vẫn được giữ nguyên số ngày có dữ liệu; bảng này không chứng minh
            quy luật mùa vụ.
          </p>
        </section>
        <section
          id="theo-doi"
          className="watch-section"
          aria-labelledby="watch-title"
        >
          <div className="watch-intro">
            <Bell size={23} aria-hidden="true" />
            <h2 id="watch-title">
              Mốc giá của bạn,
              <br />
              để ngay trong tầm mắt.
            </h2>
            <p>
              Lưu một ngưỡng để đối chiếu khi mở web. Chỉ lưu trên thiết bị này.
            </p>
            <span>Không gửi thông báo đẩy.</span>
          </div>
          <div className="watch-workspace">
            <form onSubmit={addWatch}>
              <label>
                Vùng
                <select
                  id="watch-region"
                  value={watchRegion}
                  onChange={(e) => setWatchRegion(e.target.value)}
                >
                  {market.regions.map((r) => (
                    <option key={r.regionId} value={r.regionId}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Điều kiện
                <select
                  id="watch-direction"
                  value={direction}
                  onChange={(e) => setDirection(e.target.value)}
                >
                  <option value="above">Đạt hoặc vượt</option>
                  <option value="below">Đạt hoặc thấp hơn</option>
                </select>
              </label>
              <label>
                Mốc giá (đ/kg)
                <input
                  id="watch-target"
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                  type="number"
                  min="1000"
                  max="1000000"
                  step="1"
                  placeholder="Nhập mốc giá"
                  required
                />
              </label>
              <button className="button-primary" type="submit">
                <Plus size={16} aria-hidden="true" />
                Lưu ngưỡng
              </button>
            </form>
            <p className="watch-error" role="alert">
              {watchError}
            </p>
            <p className="watch-status" role="status">
              {watchNote}
              {undone && (
                <button
                  className="text-button"
                  onClick={() => {
                    setWatchList([...watchList, undone]);
                    setUndone(null);
                    setWatchNote("Đã khôi phục ngưỡng.");
                  }}
                >
                  Hoàn tác
                </button>
              )}
            </p>
            <div className="watch-list">
              {!watchList.length ? (
                <p className="watch-empty">
                  Chưa có ngưỡng được lưu. Chọn vùng và mốc giá để bắt đầu.
                </p>
              ) : (
                watchList.map((w, i) => {
                  const q = market.regions.find(
                      (r) => r.regionId === w.regionId,
                    ),
                    hit = evaluateWatch(w, q?.priceVndKg ?? null);
                  return (
                    <div
                      className="watch-row"
                      key={`${w.regionId}/${w.direction}/${w.target}`}
                    >
                      <div>
                        <strong>
                          {REGIONS.find((r) => r.regionId === w.regionId)?.name}
                        </strong>
                        <span>
                          {w.direction === "above"
                            ? "Đạt hoặc vượt"
                            : "Đạt hoặc thấp hơn"}{" "}
                          {priceLabel(w.target)} đ/kg
                        </span>
                      </div>
                      <span className="watch-result">
                        {hit ? <Check size={15} aria-hidden="true" /> : null}
                        {hit === null
                          ? "Chưa có giá"
                          : hit
                            ? "Đã chạm mốc"
                            : "Chưa chạm mốc"}
                        <small>Bản ghi {dateLabel(market.sourceDate)}</small>
                      </span>
                      <button
                        type="button"
                        className="remove-watch"
                        aria-label={
                          "Bỏ ngưỡng " + priceLabel(w.target) + " " + w.regionId
                        }
                        onClick={() => {
                          setUndone(w);
                          setWatchList(watchList.filter((_, j) => i !== j));
                          setWatchNote("Đã bỏ ngưỡng.");
                        }}
                      >
                        <X size={16} aria-hidden="true" />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </section>
        <section
          id="nguon"
          className="sources-section"
          aria-labelledby="sources-title"
        >
          <div className="source-heading">
            <h2 id="sources-title">
              Rõ nguồn.
              <br />
              Rõ những giới hạn.
            </h2>
            <p>
              Giá tham khảo hỗ trợ quan sát thị trường. Giá thu mua thực tế còn
              phụ thuộc chất lượng, địa điểm và điều kiện giao dịch.
            </p>
          </div>
          <div className="source-register">
            <article>
              <div>
                <h3>Giacaphe.com / Y5Cafe</h3>
                <p>
                  Bảng giá nội địa công khai. Kiểm tra tối đa một lần mỗi giờ
                  khi có yêu cầu; giữ bản ghi gần nhất nếu nguồn chưa phản hồi.
                </p>
                <a
                  href="https://giacaphe.com/gia-ca-phe-noi-dia/"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Đối chiếu nguồn giá{" "}
                  <ExternalLink size={13} aria-hidden="true" />
                </a>
              </div>
            </article>
            <article>
              <div>
                <h3>VNCoffeePrice, Mendeley Data V3</h3>
                <p>
                  5.445 quan sát, 2020 đến 2026. Độ phủ khác nhau giữa năm vùng;
                  không ghép liền với nguồn mới. Giấy phép CC BY 4.0.
                </p>
                <p className="source-authors">
                  Tan Nguyen Duc, Hai Nguyen Chi (2026). DOI:
                  10.17632/p8fhcw59b7.3.
                </p>
                <a
                  href="https://data.mendeley.com/datasets/p8fhcw59b7/3"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Xem bộ dữ liệu <ExternalLink size={13} aria-hidden="true" />
                </a>
              </div>
            </article>
            <details>
              <summary>Phương pháp và độ phủ dữ liệu</summary>
              <p>
                Lịch sử Đắk Lắk, Lâm Đồng bắt đầu năm 2020; các vùng còn lại bắt
                đầu năm 2021. Đắk Nông và Kon Tum kết thúc ngày 16/01/2026, các
                vùng khác ngày 22/05/2026. Giá trung bình tháng được tính trên
                các quan sát có thật, không tự điền ngày thiếu.
              </p>
              <p>
                Không có kết nối hợp tác hay cam kết nguồn cấp dữ liệu với
                Giacaphe.com. Trang lưu trữ bị từ chối truy cập không được thu
                thập tiếp. Không coi bảng tham khảo là báo giá riêng của từng
                đại lý.
              </p>
              <a
                href="/data/provenance.json"
                target="_blank"
                rel="noopener noreferrer"
              >
                Xem nguồn gốc và phạm vi tệp dữ liệu
              </a>
            </details>
          </div>
        </section>
      </main>
      <footer className="site-footer container">
        <a href="#" className="footer-brand">
          mùa.
        </a>
        <p>Một góc nhìn rõ ràng hơn về thị trường cà phê Việt Nam.</p>
        <span data-credits="true">
          Ảnh:{" "}
          <a
            href="https://commons.wikimedia.org/wiki/File:Roasted_coffee_beans_on_the_surface._01.jpg"
            target="_blank"
            rel="noopener noreferrer"
          >
            A S M Jobaer
          </a>
          ,{" "}
          <a
            href="https://creativecommons.org/licenses/by-sa/4.0/"
            target="_blank"
            rel="noopener noreferrer"
          >
            CC BY-SA 4.0
          </a>
          .
        </span>
        <a href="#thi-truong">
          Về bảng giá <ArrowUpRight size={14} aria-hidden="true" />
        </a>
      </footer>
    </>
  );
}

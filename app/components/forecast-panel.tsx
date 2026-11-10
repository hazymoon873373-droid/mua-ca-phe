"use client";
import { useEffect, useState } from "react";
import { dateLabel, priceLabel } from "../../lib/coffee/analytics.mjs";
import {
  forecastCsv,
  forecastStatus,
  validateForecastArtifact,
} from "../../lib/coffee/forecast.mjs";

type Point = {
  origin: string;
  date: string;
  actual: number;
  naive: number;
  prophet: number;
  xgboost: number;
  lower80: number;
  upper80: number;
};
type Metric = {
  model: string;
  n: number;
  mae: number;
  rmse: number;
  coverage80: number | null;
};
type Horizon = {
  days: number;
  metrics: Metric[];
  backtest: Point[];
  forecast: {
    date: string;
    prophet: { yhat: number; lower80: number; upper80: number };
    xgboost: { yhat: number };
    naive: { yhat: number };
  };
};
type Region = {
  regionId: string;
  trainStart: string;
  trainEnd: string;
  observationCount: number;
  horizons: Horizon[];
};
type Artifact = {
  schemaVersion: number;
  generatedAt: string;
  sourceId: string;
  asOfDate: string;
  models: { prophet: { version: string }; xgboost: { version: string } };
  validation: { method: string; description: string };
  regions: Region[];
};
const labels: Record<string, string> = {
  actual: "Giá thực tế",
  naive: "Giá gần nhất",
  prophet: "Prophet",
  xgboost: "XGBoost",
};
const percent = (n: number) =>
  new Intl.NumberFormat("vi-VN", {
    style: "percent",
    maximumFractionDigits: 1,
  }).format(n);
function save(text: string, name: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function ComparisonChart({ points }: { points: Point[] }) {
  const [active, setActive] = useState<number | null>(null);
  const series = ["actual", "prophet", "xgboost", "naive"] as const;
  const values = points.flatMap((p) => series.map((k) => p[k]));
  const min = Math.min(...values),
    max = Math.max(...values),
    pad = Math.max(500, (max - min) * 0.12),
    low = min - pad,
    high = max + pad;
  const first = Date.parse(points[0].date),
    span = Date.parse(points.at(-1)!.date) - first;
  const x = (p: Point) =>
    92 + (span ? ((Date.parse(p.date) - first) / span) * 1048 : 524);
  const y = (v: number) => 20 + ((high - v) / (high - low)) * 230;
  const index =
      active === null ? points.length - 1 : Math.min(active, points.length - 1),
    p = points[index];
  return (
    <>
      <div
        className="forecast-chart"
        role="group"
        tabIndex={0}
        aria-label="Biểu đồ kiểm định hai mô hình. Dùng phím trái và phải để xem từng ngày."
        onKeyDown={(e) => {
          if (e.target !== e.currentTarget) return;
          if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
            e.preventDefault();
            setActive(
              Math.max(
                0,
                Math.min(
                  points.length - 1,
                  index + (e.key === "ArrowLeft" ? -1 : 1),
                ),
              ),
            );
          }
        }}
        onPointerLeave={() => setActive(null)}
        onPointerMove={(e) => {
          const rect = e.currentTarget
            .querySelector("svg")!
            .getBoundingClientRect();
          const cursor = ((e.clientX - rect.left) / rect.width) * 1200;
          let i = 0;
          for (let j = 1; j < points.length; j++)
            if (
              Math.abs(x(points[j]) - cursor) < Math.abs(x(points[i]) - cursor)
            )
              i = j;
          setActive(i);
        }}
      >
        <div className="forecast-readout" aria-live="polite" aria-atomic="true">
          <span>
            Ngày đối chiếu <strong>{dateLabel(p.date)}</strong>
          </span>
          <span>
            Thực tế <strong>{priceLabel(p.actual)} đ/kg</strong>
          </span>
          <span>
            Prophet <strong>{priceLabel(p.prophet)}</strong>
          </span>
          <span>
            XGBoost <strong>{priceLabel(p.xgboost)}</strong>
          </span>
        </div>
        <div
          className="forecast-plot-scroll"
          tabIndex={0}
          role="region"
          aria-label="Đồ thị dự báo, có thể cuộn ngang trên điện thoại"
        >
          <svg
            viewBox="0 0 1200 285"
            role="img"
            aria-label={`Các dự báo ngoài mẫu và giá thật, ${points.length} ngày đối chiếu.`}
          >
            {[0, 1, 2, 3, 4].map((i) => {
              const v = low + ((high - low) * i) / 4;
              return (
                <g key={i}>
                  <line
                    x1="92"
                    x2="1140"
                    y1={y(v)}
                    y2={y(v)}
                    className="forecast-grid"
                  />
                  <text x="82" y={y(v) + 4} textAnchor="end">
                    {priceLabel(v)}
                  </text>
                </g>
              );
            })}
            {series.map((k) => (
              <polyline
                key={k}
                className={`forecast-line forecast-${k}`}
                points={points.map((p) => `${x(p)},${y(p[k])}`).join(" ")}
              />
            ))}
            <line
              x1={x(p)}
              x2={x(p)}
              y1="20"
              y2="250"
              className="forecast-cursor"
            />
            {series.map((k) => (
              <circle
                key={k}
                cx={x(p)}
                cy={y(p[k])}
                r="4"
                className={`forecast-dot forecast-${k}`}
              />
            ))}
            <text x="92" y="277">
              {dateLabel(points[0].date)}
            </text>
            <text x="1140" y="277" textAnchor="end">
              {dateLabel(points.at(-1)!.date)}
            </text>
          </svg>
        </div>
        <p className="forecast-scroll-hint">
          Cuộn ngang để xem đủ biểu đồ, hoặc mở bảng giá bên dưới.
        </p>
      </div>
      <ul className="forecast-legend" aria-label="Chú giải biểu đồ">
        {series.map((k) => (
          <li key={k}>
            <span className={`forecast-key forecast-${k}`} aria-hidden="true" />
            {labels[k]}
          </li>
        ))}
      </ul>
      <p className="forecast-note">
        Mỗi điểm là một lần dự báo từ dữ liệu đã có trước ngày đối chiếu. Đường
        nối giúp so sánh các điểm kiểm định, không đại diện giá của những ngày ở
        giữa.
      </p>
    </>
  );
}

export default function ForecastPanel({
  regionId,
  onRegionChange,
}: {
  regionId: string;
  onRegionChange: (id: string) => void;
}) {
  const [data, setData] = useState<Artifact | null>(null),
    [state, setState] = useState("loading"),
    [retry, setRetry] = useState(0),
    [days, setDays] = useState(1),
    [page, setPage] = useState(0);
  useEffect(() => {
    const h = new URLSearchParams(location.search).get("du-bao");
    if (h === "7") setDays(7);
  }, []);
  useEffect(() => {
    setPage(0);
  }, [regionId, days]);
  useEffect(() => {
    const controller = new AbortController();
    setState("loading");
    fetch("/api/forecast", {
      signal: AbortSignal.any([controller.signal, AbortSignal.timeout(15000)]),
      cache: "no-store",
    })
      .then((r) => {
        if (!r.ok) throw Error();
        return r.json() as Promise<Artifact>;
      })
      .then((d) => {
        if (
          !validateForecastArtifact(d) ||
          !/^\d{4}-\d{2}-\d{2}$/.test(d.asOfDate)
        )
          throw Error();
        setData(d);
        setState("ready");
      })
      .catch(() => {
        if (!controller.signal.aborted) setState("error");
      });
    return () => controller.abort();
  }, [retry]);
  const r = data?.regions.find((r) => r.regionId === regionId),
    h = r?.horizons.find((h) => h.days === days);
  const gate = r && data ? forecastStatus(r, days, data.asOfDate) : null;
  const best = h ? [...h.metrics].sort((a, b) => a.mae - b.mae)[0] : null;
  const changeDays = (value: number) => {
    setDays(value);
    const url = new URL(location.href);
    url.searchParams.set("du-bao", String(value));
    window.history.replaceState(null, "", url);
  };
  return (
    <section
      id="du-bao"
      className="forecast-section"
      aria-labelledby="forecast-title"
    >
      <div className="section-heading">
        <div>
          <h2 id="forecast-title">Dự báo, đi cùng kiểm chứng.</h2>
          <p>
            Prophet và XGBoost được đối chiếu với giá thật và cách giữ nguyên
            giá gần nhất.
          </p>
        </div>
        <a
          href="/data/forecast.json"
          download="mua-ca-phe-ket-qua-mo-hinh.json"
          className="button-quiet"
        >
          Tải kết quả mô hình
        </a>
      </div>
      {state === "loading" ? (
        <div className="forecast-loading" role="status">
          Đang tải kết quả huấn luyện và kiểm định…
        </div>
      ) : state === "error" ? (
        <div className="forecast-empty" role="alert">
          <p>
            Chưa tải được kết quả mô hình. Bảng giá và ngưỡng theo dõi vẫn sử
            dụng được.
          </p>
          <button
            type="button"
            className="button-quiet"
            onClick={() => setRetry(retry + 1)}
          >
            Thử tải lại mô hình
          </button>
        </div>
      ) : !r || !h ? (
        <div className="forecast-empty">
          <p>
            Vùng này chưa có mô hình được kiểm định. Đợt thử nghiệm đầu tiên
            dùng Đắk Lắk và Lâm Đồng, nơi có lịch sử ít gián đoạn hơn.
          </p>
          <button
            type="button"
            className="button-quiet"
            onClick={() => onRegionChange("dak-lak")}
          >
            Xem mô hình Đắk Lắk
          </button>
        </div>
      ) : (
        <>
          <div className="forecast-controls">
            <label className="select-label">
              Vùng dự báo
              <select
                aria-label="Vùng dự báo"
                value={regionId}
                onChange={(e) => onRegionChange(e.target.value)}
              >
                <option value="dak-lak">Đắk Lắk</option>
                <option value="lam-dong">Lâm Đồng</option>
              </select>
            </label>
            <p>
              <strong>{regionId === "dak-lak" ? "Đắk Lắk" : "Lâm Đồng"}</strong>{" "}
              — {r.observationCount.toLocaleString("vi-VN")} quan sát, từ{" "}
              {dateLabel(r.trainStart)} đến {dateLabel(r.trainEnd)}
            </p>
            <div role="group" aria-label="Kỳ hạn dự báo">
              {[1, 7].map((value) => (
                <button
                  key={value}
                  className="window-button"
                  aria-pressed={days === value}
                  onClick={() => changeDays(value)}
                >
                  {value} ngày
                </button>
              ))}
            </div>
          </div>
          <p className="forecast-note">
            Bộ kết quả được tạo ngày{" "}
            {new Intl.DateTimeFormat("vi-VN", {
              timeZone: "Asia/Ho_Chi_Minh",
              dateStyle: "short",
            }).format(new Date(data!.generatedAt))}
            ; mốc dữ liệu huấn luyện là {dateLabel(r.trainEnd)}.
          </p>
          <aside
            className="forecast-availability"
            aria-labelledby="forecast-live-title"
          >
            <h3 id="forecast-live-title">
              {gate?.state === "ready"
                ? "Dự báo từ mốc dữ liệu gần nhất"
                : "Chưa phát hành dự báo giá hiện tại"}
            </h3>
            <p>
              {gate?.state === "ready"
                ? `Kết quả chỉ có hiệu lực tại mốc ${dateLabel(r.trainEnd)}; xem ngày đích và kiểm định bên dưới.`
                : gate?.state === "unproven"
                  ? "Chưa có đủ bằng chứng mô hình vượt phương án giữ nguyên giá gần nhất."
                  : gate?.state === "expired"
                    ? "Ngày đích của dự báo đã qua. Cần một lần huấn luyện mới với dữ liệu gần hơn."
                    : `Mô hình học đến ${dateLabel(r.trainEnd)}, chưa có chuỗi dữ liệu gần hiện tại đủ điều kiện. Giá mới từ Giacaphe được theo dõi riêng, không tự ghép vào lịch sử huấn luyện.`}
            </p>
            {gate?.state === "ready" && (
              <div className="forecast-live-values">
                <p>
                  Ngày đích: <strong>{dateLabel(h.forecast.date)}</strong>
                </p>
                <ul>
                  {gate.eligibleModels.map((model: string) => (
                    <li key={model}>
                      {labels[model]}:{" "}
                      <strong>
                        {priceLabel(
                          h.forecast[model as "prophet" | "xgboost"].yhat,
                        )}{" "}
                        đ/kg
                      </strong>
                    </li>
                  ))}
                </ul>
                <p className="forecast-note">
                  Chỉ các mô hình vượt mốc so sánh ngoài mẫu được trình bày tại
                  đây; kết quả vẫn có thể sai.
                </p>
              </div>
            )}
            <p className="forecast-note">
              Phần bên dưới là thí nghiệm lịch sử. Không suy diễn thành khuyến
              nghị mua/bán hay cam kết giá thu mua.
            </p>
          </aside>
          <div className="forecast-evidence">
            <div className="forecast-evidence-heading">
              <h3>Kiểm định ngoài mẫu: trước {days} ngày lịch</h3>
              <button
                type="button"
                className="button-quiet"
                onClick={() =>
                  save(
                    "\ufeff" + forecastCsv(r, days),
                    `mua-ca-phe-${regionId}-${days}-ngay.csv`,
                    "text/csv;charset=utf-8",
                  )
                }
              >
                Tải bảng kiểm định CSV
              </button>
            </div>
            <p>
              Ở mỗi mốc, mô hình chỉ được học dữ liệu đã có lúc đó. Cả ba cách
              dự báo được chấm trên cùng {h.backtest.length} cặp ngày có giá
              thật.
            </p>
            <div
              className="table-scroll"
              tabIndex={0}
              role="region"
              aria-label="So sánh sai số các mô hình"
            >
              <table className="forecast-metrics">
                <caption>
                  Sai số theo đồng/kg; MAE và RMSE càng thấp càng tốt. Dải
                  Prophet danh nghĩa 80% được kiểm tra lại trên mẫu.
                </caption>
                <thead>
                  <tr>
                    <th scope="col">Phương án</th>
                    <th scope="col" className="numeric">
                      MAE
                    </th>
                    <th scope="col" className="numeric">
                      RMSE
                    </th>
                    <th scope="col" className="numeric">
                      Số mẫu
                    </th>
                    <th scope="col" className="numeric">
                      Trong dải 80%
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {h.metrics.map((m) => (
                    <tr key={m.model}>
                      <th scope="row">{labels[m.model]}</th>
                      <td className="numeric">{priceLabel(m.mae)}</td>
                      <td className="numeric">{priceLabel(m.rmse)}</td>
                      <td className="numeric">{m.n}</td>
                      <td className="numeric">
                        {m.coverage80 === null
                          ? "Không áp dụng"
                          : percent(m.coverage80)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="forecast-conclusion">
              MAE thấp nhất trong mẫu này:{" "}
              <strong>{labels[best!.model]}</strong>. Kết quả phụ thuộc vùng và
              kỳ hạn, chưa chứng minh hiệu quả giao dịch hay bảo đảm sai số
              tương lai.
            </p>
            <ComparisonChart key={`${regionId}/${days}`} points={h.backtest} />
            <details className="forecast-observations">
              <summary>Xem các giá đã dự báo và giá thực tế</summary>
              <div
                className="table-scroll"
                tabIndex={0}
                role="region"
                aria-label="Bảng dự báo ngoài mẫu"
              >
                <table>
                  <thead>
                    <tr>
                      <th scope="col">Mốc dự báo</th>
                      <th scope="col">Ngày đối chiếu</th>
                      {["actual", "prophet", "xgboost", "naive"].map((k) => (
                        <th key={k} scope="col" className="numeric">
                          {labels[k]}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {h.backtest.slice(page * 10, page * 10 + 10).map((p) => (
                      <tr key={p.origin}>
                        <td>{dateLabel(p.origin)}</td>
                        <td>{dateLabel(p.date)}</td>
                        {(
                          ["actual", "prophet", "xgboost", "naive"] as const
                        ).map((k) => (
                          <td key={k} className="numeric">
                            {priceLabel(p[k])}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="table-pagination">
                <button
                  className="button-quiet"
                  disabled={page === 0}
                  onClick={() => setPage(page - 1)}
                >
                  Trước
                </button>
                <span>
                  Trang {page + 1}/{Math.ceil(h.backtest.length / 10)}
                </span>
                <button
                  className="button-quiet"
                  disabled={(page + 1) * 10 >= h.backtest.length}
                  onClick={() => setPage(page + 1)}
                >
                  Sau
                </button>
              </div>
            </details>
          </div>
          <details className="forecast-method">
            <summary>Mốc huấn luyện, ước lượng và giới hạn</summary>
            <p>
              Huấn luyện cuối cùng đến {dateLabel(r.trainEnd)}; ngày đích{" "}
              {dateLabel(h.forecast.date)}.{" "}
              {gate?.state === "ready"
                ? "Giá dự báo chưa phải giá đã quan sát; chỉ dùng các mô hình đủ điều kiện ở phần trên."
                : "Đây là dự báo từ mốc lịch sử, chưa phải giá đã quan sát hoặc dự báo cho ngày hôm nay."}
            </p>
            <ul>
              <li>
                Prophet: {priceLabel(h.forecast.prophet.yhat)} đ/kg; dải danh
                nghĩa 80% từ {priceLabel(h.forecast.prophet.lower80)} đến{" "}
                {priceLabel(h.forecast.prophet.upper80)} đ/kg.
              </li>
              <li>XGBoost: {priceLabel(h.forecast.xgboost.yhat)} đ/kg.</li>
              <li>
                Giữ nguyên giá gần nhất: {priceLabel(h.forecast.naive.yhat)}{" "}
                đ/kg.
              </li>
            </ul>
            <p>
              Dải bất định chưa được hiệu chỉnh để bảo đảm độ bao phủ. Không gộp
              hai mô hình thành một dự báo trung bình.
            </p>
            <p>
              Mỗi vùng dùng {h.backtest.length} mốc kiểm định trong 180 ngày
              lịch cuối, có ít nhất hai năm lịch sử trước mốc đầu. Tham số được
              cố định trước khi chấm; không dùng giá sau mốc dự báo để huấn
              luyện. Chỉ chấm những ngày có giá thực tế, không tự điền nhãn
              thiếu.
            </p>
            <p>
              Prophet {data!.models.prophet.version}; XGBoost{" "}
              {data!.models.xgboost.version}. Nguồn lịch sử: Mendeley Data V3,
              DOI 10.17632/p8fhcw59b7.3. Huấn luyện lại và phát hành một bộ kết
              quả mới sau khi có chuỗi gần hiện tại đã kiểm chứng.
            </p>
          </details>
        </>
      )}
    </section>
  );
}

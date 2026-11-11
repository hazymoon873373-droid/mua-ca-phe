"use client";
import { useState } from "react";
import { assetPath } from "../../lib/coffee/client-paths.mjs";
import { dateLabel, priceLabel } from "../../lib/coffee/analytics.mjs";
import { validStudySummary } from "../../lib/coffee/study-view.mjs";
type Metric = {
  model: string;
  n: number;
  mae: number;
  rmse: number;
  coverage80: number | null;
  meanWidth80: number | null;
  skillVsNaive: number | null;
};
type Region = {
  regionId: string;
  sourceEnd: string;
  horizons: { days: number; metrics: Metric[] }[];
};
type Study = {
  schemaVersion: number;
  studyType: string;
  currentEligible: boolean;
  sourceEnd: string;
  regions: Region[];
};
const names: Record<string, string> = {
  naive: "Giữ giá gần nhất",
  seasonalNaive: "Lặp giá cùng tuần",
  prophet: "Prophet",
  xgboost: "XGBoost",
};
export default function ForecastStudy() {
  const [study, setStudy] = useState<Study | null>(null),
    [error, setError] = useState(false),
    [loading, setLoading] = useState(false);
  const [region, setRegion] = useState("dak-lak"),
    [days, setDays] = useState(1);
  async function load() {
    if (study || loading) return;
    setLoading(true);
    setError(false);
    try {
      const r = await fetch(assetPath("/data/forecast-study.json"));
      if (!r.ok) throw Error();
      const d = await r.json();
      if (!validStudySummary(d)) throw Error();
      setStudy(d as Study);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }
  const selected = study?.regions
    .find((x) => x.regionId === region)
    ?.horizons.find((h) => h.days === days);
  return (
    <details
      className="evidence-details forecast-study"
      onToggle={(e) => {
        if (e.currentTarget.open) void load();
      }}
    >
      <summary>Dự báo ngắn hạn và kết quả nghiên cứu</summary>
      <p>
        Chưa phát hành dự báo giá hiện tại. Dữ liệu huấn luyện gần nhất kết thúc
        22/05/2026; mô hình cần được kiểm chứng trên các quan sát mới.
      </p>
      <p>
        Thí nghiệm lịch sử mở rộng chọn cấu hình Prophet và XGBoost trên giai
        đoạn trước, rồi đo ở giai đoạn sau. Đây là kiểm định hồi cứu; kết quả
        không xác nhận hiệu quả tương lai.
      </p>
      {loading && <p role="status">Đang đọc kết quả đã huấn luyện…</p>}
      {error && (
        <p role="status">
          Chưa đọc được kết quả.{" "}
          <button
            type="button"
            className="text-button"
            onClick={() => void load()}
          >
            Thử lại kết quả nghiên cứu
          </button>
        </p>
      )}
      {study && (
        <>
          <div className="evidence-controls">
            <label>
              Vùng nghiên cứu
              <select
                value={region}
                onChange={(e) => setRegion(e.target.value)}
              >
                <option value="dak-lak">Đắk Lắk</option>
                <option value="lam-dong">Lâm Đồng</option>
              </select>
            </label>
            <label>
              Kỳ hạn nghiên cứu
              <select
                value={days}
                onChange={(e) => setDays(Number(e.target.value))}
              >
                <option value="1">1 ngày lịch</option>
                <option value="7">7 ngày lịch</option>
              </select>
            </label>
          </div>
          <div
            className="table-scroll"
            role="region"
            tabIndex={0}
            aria-label="Sai số thí nghiệm dự báo lịch sử"
          >
            <table>
              <caption>
                MAE: sai số tuyệt đối trung bình, đồng/kg; càng thấp càng tốt.
                Các phương pháp dùng cùng những ngày đích có quan sát.
              </caption>
              <thead>
                <tr>
                  <th scope="col">Phương pháp</th>
                  <th scope="col">Số mẫu</th>
                  <th scope="col">MAE (đ/kg)</th>
                </tr>
              </thead>
              <tbody>
                {selected?.metrics.map((m) => (
                  <tr key={m.model}>
                    <th scope="row">{names[m.model] ?? m.model}</th>
                    <td>{m.n}</td>
                    <td>{priceLabel(Math.round(m.mae))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p>
            Ngày cuối dữ liệu: {dateLabel(study.sourceEnd)}. Không dùng kết quả
            này như mức giá giao dịch hôm nay. Độ bao phủ khoảng dự báo, ngày
            kiểm định và cấu hình nằm trong tệp chi tiết.
          </p>
        </>
      )}
      <p>
        <a
          href={assetPath("/data/forecast-study.json")}
          download="mua-ca-phe-nghien-cuu-du-bao.json"
        >
          Tải kết quả và phương pháp đầy đủ
        </a>
      </p>
    </details>
  );
}

"use client";
import { assessDataQuality } from "../../lib/coffee/quality.mjs";
import { dateLabel } from "../../lib/coffee/analytics.mjs";
type Attempt = {
  attemptedAt: string;
  sourceDate: string | null;
  outcome: string;
};
type Monitoring = {
  available: boolean;
  observedAttempts: number;
  successfulAttempts: number;
  failedAttempts: number;
  successRate: number | null;
  observedSince: string | null;
  attempts: Attempt[];
};
type Market = {
  sourceDate: string;
  fetchedAt: string;
  sourceId?: string;
  snapshots?: {
    date: string;
    regionId: string;
    priceVndKg: number;
    sourceId: string;
  }[];
  monitoring?: Monitoring;
};
const stamp = (value: string | null) =>
  value && Number.isFinite(Date.parse(value))
    ? new Date(value).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })
    : "Chưa có";
const outcomes: Record<string, string> = {
  updated: "Đọc và lưu giá hợp lệ",
  upstream_unavailable: "Nguồn chưa phản hồi",
  source_parse_failed: "Không đọc được bảng giá",
  source_date_out_of_range: "Ngày nguồn không hợp lệ",
  storage_write_failed: "Chưa lưu được bản giá vào cơ sở dữ liệu",
};
export default function DataHealth({ market }: { market: Market }) {
  const q = assessDataQuality(market),
    m = market.monitoring;
  function download() {
    const url = URL.createObjectURL(
      new Blob(
        [
          JSON.stringify(
            {
              exportedAt: new Date().toISOString(),
              quality: q,
              monitoring: m ?? null,
            },
            null,
            2,
          ),
        ],
        { type: "application/json" },
      ),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "mua-ca-phe-chat-luong-nguon.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <details className="evidence-details" id="data-quality">
      <summary>Độ mới và chất lượng nguồn giá</summary>
      <p>
        Chỉ tính dữ liệu Giacaphe đã thu thập; tách riêng bộ lịch sử nghiên cứu.
      </p>
      <dl className="evidence-facts">
        <div>
          <dt>Ngày bảng giá</dt>
          <dd>{dateLabel(market.sourceDate)}</dd>
        </div>
        <div>
          <dt>Tuổi dữ liệu</dt>
          <dd>
            {q.sourceAgeDays === null
              ? "Chưa xác định"
              : `${q.sourceAgeDays} ngày`}
          </dd>
        </div>
        <div>
          <dt>Số ngày có quan sát</dt>
          <dd>{q.coverage.observedDays}</dd>
        </div>
        <div>
          <dt>Ngày chưa đủ bốn vùng</dt>
          <dd>{q.coverage.incompleteDates.length}</dd>
        </div>
      </dl>
      <p>
        {q.coverage.firstDate
          ? `${dateLabel(q.coverage.firstDate)} đến ${dateLabel(q.coverage.lastDate)}.`
          : "Chưa có chuỗi quan sát đã lưu."}{" "}
        Có {q.coverage.missingCalendarDates.length} ngày lịch không có bản ghi
        trong khoảng này; không đồng nghĩa nguồn lỗi hoặc thị trường phải có giá
        mỗi ngày.
      </p>
      {m?.available && m.observedAttempts > 0 ? (
        <>
          <p>
            Nhật ký từ {stamp(m.observedSince)}: {m.successfulAttempts}/
            {m.observedAttempts} lần kiểm tra đã hoàn tất đọc được dữ liệu hợp
            lệ; {m.failedAttempts} lần lỗi. Chỉ tính cửa sổ nhật ký đang lưu,
            không phải tỷ lệ hoạt động từ khi ra mắt. Lượt đọc bộ nhớ đệm không
            tính là lần kiểm tra nguồn.
          </p>
          <ol className="source-attempts">
            {m.attempts.slice(0, 5).map((a, i) => (
              <li key={a.attemptedAt + i}>
                <time dateTime={a.attemptedAt}>{stamp(a.attemptedAt)}</time>
                <span>
                  {outcomes[a.outcome] ?? "Kiểm tra chưa thành công"}
                  {a.sourceDate ? ` (${dateLabel(a.sourceDate)})` : ""}
                </span>
              </li>
            ))}
          </ol>
        </>
      ) : (
        <p>
          Chưa có nhật ký kiểm tra nguồn để tính tỷ lệ thành công. Bản giá vẫn
          giữ ngày nguồn riêng.
        </p>
      )}
      <button className="outline-button" type="button" onClick={download}>
        Tải nhật ký và độ phủ
      </button>
    </details>
  );
}

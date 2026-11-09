"use client";
import { useMemo, useState } from "react";
import {
  dateLabel,
  priceLabel,
  splitGaps,
  dayDistance,
} from "../../lib/coffee/analytics.mjs";
type Observation = {
  date: string;
  regionId: string;
  priceVndKg: number;
  sourceId: string;
};
export default function PriceChart({
  rows,
  name,
}: {
  rows: Observation[];
  name: string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const plot = useMemo(() => {
    if (!rows.length) return null;
    const values = rows.map((r) => r.priceVndKg),
      min = Math.min(...values),
      max = Math.max(...values),
      pad = Math.max(800, (max - min) * 0.12),
      low = min - pad,
      high = max + pad,
      span = dayDistance(rows[0].date, rows.at(-1)!.date);
    const x = (date: string) =>
      span ? 62 + (dayDistance(rows[0].date, date) / span) * 1096 : 610;
    const y = (value: number) => 22 + ((high - value) / (high - low)) * 234;
    return {
      low,
      high,
      x,
      y,
      segments: splitGaps(rows, 7),
      ticks: Array.from({ length: 5 }, (_, i) => low + ((high - low) * i) / 4),
    };
  }, [rows]);
  if (!plot)
    return (
      <div className="chart-empty">
        <p>Chưa có quan sát trong khoảng này.</p>
        <p>Chọn nguồn hoặc vùng khác để xem dữ liệu đã ghi nhận.</p>
      </div>
    );
  const index = hover !== null && hover < rows.length ? hover : rows.length - 1,
    selected = rows[index];
  return (
    <div
      className="chart-frame"
      role="group"
      tabIndex={0}
      aria-label={`Biểu đồ giá ${name}. Dùng phím trái và phải để đọc từng quan sát.`}
      onKeyDown={(e) => {
        if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
          e.preventDefault();
          setHover(
            Math.max(
              0,
              Math.min(
                rows.length - 1,
                index + (e.key === "ArrowLeft" ? -1 : 1),
              ),
            ),
          );
        }
      }}
      onPointerLeave={() => setHover(null)}
      onPointerMove={(e) => {
        const rect = e.currentTarget.getBoundingClientRect(),
          at = ((e.clientX - rect.left) / rect.width) * 1200;
        let closest = 0;
        for (let i = 1; i < rows.length; i++)
          if (
            Math.abs(plot.x(rows[i].date) - at) <
            Math.abs(plot.x(rows[closest].date) - at)
          )
            closest = i;
        setHover(closest);
      }}
    >
      <div
        className="chart-readout"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        <span>{dateLabel(selected.date)}</span>
        <strong>
          {priceLabel(selected.priceVndKg)} <small>đ/kg</small>
        </strong>
      </div>
      <svg
        viewBox="0 0 1200 300"
        className="price-chart"
        role="img"
        aria-label={`${name}, ${rows.length} quan sát từ ${dateLabel(rows[0].date)} đến ${dateLabel(rows.at(-1)!.date)}.`}
      >
        <title>Giá tham khảo {name}</title>
        <desc>
          Đơn vị đồng mỗi kg. Đường ngắt khi thiếu quan sát quá bảy ngày; không
          nội suy dữ liệu.
        </desc>
        {plot.ticks.map((value: number, i: number) => (
          <g key={i}>
            <line
              x1="62"
              x2="1158"
              y1={plot.y(value)}
              y2={plot.y(value)}
              className="chart-grid"
            />
            <text
              x="48"
              y={plot.y(value) + 4}
              textAnchor="end"
              className="chart-axis"
            >
              {priceLabel(Math.round(value / 100) * 100)}
            </text>
          </g>
        ))}
        {plot.segments.map((segment: Observation[], i: number) => (
          <path
            key={i}
            d={segment
              .map(
                (r, j) =>
                  `${j ? "L" : "M"}${plot.x(r.date).toFixed(2)},${plot.y(r.priceVndKg).toFixed(2)}`,
              )
              .join(" ")}
            className="chart-line"
          />
        ))}
        {plot.segments
          .filter((s: Observation[]) => s.length === 1)
          .map((s: Observation[]) => (
            <circle
              key={s[0].date}
              cx={plot.x(s[0].date)}
              cy={plot.y(s[0].priceVndKg)}
              r="3"
              className="chart-point"
            />
          ))}
        <line
          x1={plot.x(selected.date)}
          x2={plot.x(selected.date)}
          y1="16"
          y2="260"
          className="chart-cursor"
        />
        <circle
          cx={plot.x(selected.date)}
          cy={plot.y(selected.priceVndKg)}
          r="5"
          className="chart-selected"
        />
        {[
          0,
          Math.floor((rows.length - 1) / 3),
          Math.floor(((rows.length - 1) * 2) / 3),
          rows.length - 1,
        ]
          .filter((n, i, a) => a.indexOf(n) === i)
          .map((i) => (
            <text
              key={i}
              x={plot.x(rows[i].date)}
              y="289"
              textAnchor={
                i === 0 ? "start" : i === rows.length - 1 ? "end" : "middle"
              }
              className="chart-axis"
            >
              {dateLabel(rows[i].date).slice(0, 5)}
            </text>
          ))}
      </svg>
      {rows.length === 1 && (
        <p className="chart-single">
          Một quan sát được ghi nhận; chưa đủ để thể hiện xu hướng.
        </p>
      )}
    </div>
  );
}

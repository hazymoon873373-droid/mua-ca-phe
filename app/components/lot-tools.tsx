"use client";
import { useEffect, useRef, useState } from "react";
import {
  calculateLot,
  validLotRecord,
  lotCsv,
  backupLots,
  mergeLotBackup,
} from "../../lib/coffee/lots.mjs";
import { dateLabel, priceLabel } from "../../lib/coffee/analytics.mjs";
import { REGIONS, DOMESTIC_SOURCE_URL } from "../../lib/coffee/source.mjs";
import { assetPath } from "../../lib/coffee/client-paths.mjs";
type Quote = { regionId: string; name: string; priceVndKg: number };
type Lot = {
  id: string;
  date: string;
  regionId: string;
  role: string;
  weightKg: number;
  priceVndKg: number;
  costVnd: number;
  note: string;
  priceType: string;
  sourceDate: string | null;
  sourceUrl: string | null;
};
const KEY = "mua-ca-phe-lots-v1";
const today = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
const money = (n: number) => priceLabel(n) + " đ";
const normalize = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replaceAll("đ", "d");
export default function LotTools({
  quotes,
  sourceDate,
}: {
  quotes: Quote[];
  sourceDate: string;
}) {
  const [role, setRole] = useState("sell"),
    [region, setRegion] = useState("dak-lak"),
    [weight, setWeight] = useState(""),
    [unit, setUnit] = useState("kg"),
    [manualPrice, setManualPrice] = useState<string | null>(null),
    [cost, setCost] = useState("0"),
    [date, setDate] = useState(""),
    [note, setNote] = useState("");
  const [records, setRecords] = useState<Lot[]>([]),
    [loaded, setLoaded] = useState(false),
    [writable, setWritable] = useState(true),
    [storageIssue, setStorageIssue] = useState(""),
    [notice, setNotice] = useState(""),
    [error, setError] = useState(""),
    [undo, setUndo] = useState<Lot | null>(null);
  const storedVersion = useRef<string | null>(null);
  const recordsRef = useRef<Lot[]>([]);
  const importInput = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState(""),
    [roleFilter, setRoleFilter] = useState("all");
  useEffect(() => {
    setDate(today());
    if (location.hash === "#du-bao") {
      const url = new URL(location.href);
      url.hash = "lo-hang";
      url.searchParams.delete("du-bao");
      window.history.replaceState(null, "", url);
      requestAnimationFrame(() =>
        document.getElementById("lo-hang")?.scrollIntoView(),
      );
    }
    try {
      const raw = localStorage.getItem(KEY);
      storedVersion.current = raw;
      if (raw) {
        const list: unknown = JSON.parse(raw);
        if (
          !Array.isArray(list) ||
          list.length > 50 ||
          !list.every(validLotRecord) ||
          new Set(list.map((r) => r.id)).size !== list.length
        )
          throw Error();
        setRecords(list);
        recordsRef.current = list;
      }
    } catch {
      setWritable(false);
      setStorageIssue(
        "Chưa đọc được sổ đã lưu. Dữ liệu cũ được giữ nguyên; các lô thêm trong lần mở này chỉ lưu tạm. Hãy tải CSV trước khi đóng trang.",
      );
    }
    setLoaded(true);
  }, []);
  const quote = quotes.find((q) => q.regionId === region),
    price = manualPrice === null ? quote?.priceVndKg : Number(manualPrice);
  const input = {
    role,
    weightKg: Number(weight) * (unit === "ton" ? 1000 : 1),
    priceVndKg: price,
    costVnd: Number(cost),
  };
  const result = calculateLot(input);
  const shown = records.filter(
    (r) =>
      (roleFilter === "all" || r.role === roleFilter) &&
      normalize(
        r.note +
          " " +
          (REGIONS.find((q) => q.regionId === r.regionId)?.name || "") +
          " " +
          dateLabel(r.date),
      ).includes(normalize(query)),
  );
  async function importBackup(file?: File) {
    if (!file) return;
    try {
      if (file.size > 100000) throw Error("Tệp sao lưu vượt 100 KB.");
      const merged = mergeLotBackup(await file.text(), recordsRef.current);
      persist(merged.records);
      setUndo(null);
      setNotice(
        `Đã nhập ${merged.added} lô mới; các bản trùng nội dung được giữ nguyên.`,
      );
      setError("");
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Không đọc được tệp sao lưu.");
    } finally {
      if (importInput.current) importInput.current.value = "";
    }
  }
  function persist(next: Lot[]) {
    recordsRef.current = next;
    setRecords(next);
    if (writable)
      try {
        if (localStorage.getItem(KEY) !== storedVersion.current) {
          setWritable(false);
          setStorageIssue(
            "Sổ đã thay đổi ở tab khác. Các thay đổi ở đây chỉ lưu tạm; hãy tải CSV trước khi tải lại trang.",
          );
          return;
        }
        const serialized = JSON.stringify(next);
        localStorage.setItem(KEY, serialized);
        storedVersion.current = serialized;
      } catch {
        setWritable(false);
        setStorageIssue(
          "Trình duyệt không lưu được sổ. Các thay đổi chỉ có trong lần mở này; hãy tải CSV trước khi đóng trang.",
        );
      }
  }
  function save(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const row = {
      ...input,
      id: crypto.randomUUID(),
      date,
      regionId: region,
      note: note.trim(),
      priceType: manualPrice === null ? "reference" : "manual",
      sourceDate: manualPrice === null ? sourceDate : null,
      sourceUrl: manualPrice === null ? DOMESTIC_SOURCE_URL : null,
    };
    if (!validLotRecord(row)) {
      setError("Kiểm tra khối lượng, đơn giá, chi phí và ngày của lô hàng.");
      return;
    }
    if (records.length >= 50) {
      setError("Sổ đã có 50 lô. Tải CSV và bỏ một lô trước khi lưu thêm.");
      return;
    }
    persist([row as Lot, ...records]);
    setUndo(null);
    setNotice(
      "Đã thêm lô vào sổ. Giá và số tiền của bản lưu được giữ nguyên khi bảng giá thay đổi.",
    );
  }
  function download(asBackup = false) {
    const url = URL.createObjectURL(
      new Blob([asBackup ? backupLots(records) : "\ufeff" + lotCsv(records)], {
        type: asBackup ? "application/json" : "text/csv;charset=utf-8",
      }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = asBackup
      ? "mua-ca-phe-sao-luu.json"
      : "mua-ca-phe-so-lo-hang.csv";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <section id="lo-hang" className="lot-section" aria-labelledby="lot-title">
      <div className="section-heading">
        <div>
          <h2 id="lot-title">Tính tiền cho lô cà phê.</h2>
          <p>
            Nhập khối lượng và chi phí để dự tính số tiền bán hoặc ngân sách thu
            mua.
          </p>
        </div>
        <a className="button-quiet" href="#so-lo-hang">
          Mở sổ lô hàng
        </a>
      </div>
      <div className="lot-workspace">
        <form className="lot-form" onSubmit={save}>
          <fieldset
            className="lot-fields"
            disabled={!loaded}
            aria-label="Thông tin lô hàng"
          >
            <label>
              Nhu cầu
              <select value={role} onChange={(e) => setRole(e.target.value)}>
                <option value="sell">Tính tiền bán</option>
                <option value="buy">Tính chi phí thu mua</option>
              </select>
            </label>
            <label>
              Vùng của lô
              <select
                value={region}
                onChange={(e) => {
                  setRegion(e.target.value);
                  setManualPrice(null);
                  setNotice("");
                }}
              >
                {REGIONS.map((r) => (
                  <option key={r.regionId} value={r.regionId}>
                    {r.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Khối lượng
              <input
                type="number"
                inputMode="decimal"
                min={unit === "kg" ? "0.001" : "0.000001"}
                max={unit === "kg" ? 1000000 : 1000}
                step={unit === "kg" ? "0.001" : "0.000001"}
                placeholder="Nhập khối lượng"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                required
              />
            </label>
            <label>
              Đơn vị
              <select
                value={unit}
                onChange={(e) => {
                  const next = e.target.value;
                  if (weight && Number.isFinite(Number(weight)))
                    setWeight(
                      String(
                        Number(
                          (
                            Number(weight) * (next === "ton" ? 0.001 : 1000)
                          ).toFixed(next === "ton" ? 6 : 3),
                        ),
                      ),
                    );
                  setUnit(next);
                }}
              >
                <option value="kg">kg</option>
                <option value="ton">Tấn (1.000 kg)</option>
              </select>
            </label>
            <div className="lot-wide lot-price-field">
              <label htmlFor="lot-price">Đơn giá (đ/kg)</label>
              <input
                id="lot-price"
                aria-describedby="lot-price-note"
                type="number"
                inputMode="numeric"
                min="1"
                max="1000000"
                step="1"
                value={price ?? ""}
                onChange={(e) => setManualPrice(e.target.value)}
                required
              />
              <span className="lot-input-note" id="lot-price-note">
                {manualPrice === null
                  ? quote
                    ? `Giá tham khảo ${dateLabel(sourceDate)}, Giacaphe.com.`
                    : "Vùng này chưa có giá tham khảo mới. Bạn có thể nhập đơn giá riêng."
                  : "Giá tự nhập, không phải báo giá từ nguồn."}
              </span>
              <button
                type="button"
                className="text-button"
                disabled={!quote || manualPrice === null}
                onClick={() => setManualPrice(null)}
              >
                Dùng lại giá tham khảo
              </button>
            </div>
            <label className="lot-wide">
              Vận chuyển và chi phí khác (đ)
              <input
                type="number"
                inputMode="numeric"
                min="0"
                max="1000000000000"
                step="1"
                value={cost}
                onChange={(e) => setCost(e.target.value)}
              />
            </label>
            <label>
              Ngày của lô
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </label>
            <label>
              Ghi chú
              <input
                type="text"
                maxLength={120}
                value={note}
                placeholder="Tùy chọn, tối đa 120 ký tự"
                onChange={(e) => setNote(e.target.value)}
              />
            </label>
          </fieldset>
          <div className="lot-save">
            <button
              className="button-primary"
              type="submit"
              disabled={!loaded || !result}
            >
              Lưu vào sổ lô hàng
            </button>
            <span>Sổ lưu trên trình duyệt này, tối đa 50 lô.</span>
          </div>
          <p role="alert" className="lot-error">
            {error}
          </p>
        </form>
        <div className="lot-result" aria-live="polite" aria-atomic="true">
          <figure className="lot-photo">
            <img
              src={assetPath("/images/green-coffee.jpg")}
              alt="Cà phê nhân chưa rang trên bao tải"
              width="1280"
              height="851"
              loading="lazy"
            />
          </figure>
          <h3>
            {role === "sell" ? "Số tiền dự tính nhận" : "Ngân sách dự tính chi"}
          </h3>
          {result ? (
            <>
              <p className="lot-total">{money(result.totalVnd)}</p>
              <dl>
                <div>
                  <dt>Khối lượng quy đổi</dt>
                  <dd>
                    {new Intl.NumberFormat("vi-VN", {
                      maximumFractionDigits: 3,
                    }).format(input.weightKg)}{" "}
                    kg
                  </dd>
                </div>
                <div>
                  <dt>Giá trị theo đơn giá</dt>
                  <dd>{money(result.grossVnd)}</dd>
                </div>
                <div>
                  <dt>
                    {role === "sell"
                      ? "Trừ chi phí đã nhập"
                      : "Cộng chi phí đã nhập"}
                  </dt>
                  <dd>{money(input.costVnd)}</dd>
                </div>
              </dl>
              {result.totalVnd < 0 && (
                <p className="lot-error">
                  Chi phí đã nhập lớn hơn giá trị lô hàng.
                </p>
              )}
            </>
          ) : (
            <p className="lot-empty">
              Nhập khối lượng lớn hơn 0, đơn giá và chi phí hợp lệ để xem kết
              quả. Khối lượng hỗ trợ đến 1 gram, tối đa 1.000 tấn.
            </p>
          )}
          <p className="lot-note">
            Đây là phép tính theo dữ liệu bạn nhập, chưa phải lợi nhuận, hóa đơn
            hay giá giao dịch được cam kết. Chi phí chưa nhập không được tính
            vào kết quả.
          </p>
        </div>
      </div>
      <div id="so-lo-hang" className="lot-notebook">
        <div className="lot-book-heading">
          <div>
            <h3>Sổ lô hàng của bạn</h3>
            <p>
              Ghi lại phương án mua/bán theo giá tham khảo hoặc giá tự nhập.
              Không đồng bộ giữa các thiết bị.
            </p>
          </div>
          <div className="lot-book-actions">
            <button
              type="button"
              className="button-quiet"
              onClick={() => download()}
              disabled={!records.length}
            >
              Tải sổ CSV
            </button>
            <button
              type="button"
              className="button-quiet"
              disabled={!records.length}
              onClick={() => download(true)}
            >
              Sao lưu JSON
            </button>
            <button
              type="button"
              className="button-quiet"
              disabled={!loaded}
              onClick={() => importInput.current?.click()}
            >
              Nhập sao lưu
            </button>
            <input
              ref={importInput}
              type="file"
              accept=".json,application/json"
              hidden
              aria-label="Tệp sao lưu sổ lô hàng"
              onChange={(e) => void importBackup(e.target.files?.[0])}
            />
          </div>
        </div>
        <p className="lot-note">
          Chuyển địa chỉ hoặc thiết bị: tải sao lưu JSON ở nơi cũ rồi nhập tại
          đây. Tệp tải chứa toàn bộ sổ; nhập tệp sẽ không ghi đè lô đã lưu.
        </p>
        {!!records.length && (
          <div className="lot-book-filters">
            <label>
              Tìm lô hàng
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Ghi chú, vùng hoặc ngày"
              />
            </label>
            <label>
              Lọc loại lô
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
              >
                <option value="all">Tất cả</option>
                <option value="sell">Bán</option>
                <option value="buy">Thu mua</option>
              </select>
            </label>
            <span role="status">
              {shown.length}/{records.length} lô
            </span>
          </div>
        )}
        {storageIssue && (
          <p className="lot-error" role="status">
            {storageIssue}
          </p>
        )}
        <p role="status" className="lot-status">
          {notice}
          {undo && (
            <button
              type="button"
              className="text-button"
              disabled={records.length >= 50}
              onClick={() => {
                persist([undo, ...records]);
                setUndo(null);
                setNotice("Đã khôi phục lô hàng.");
              }}
            >
              Hoàn tác xóa
            </button>
          )}
        </p>
        {!loaded ? (
          <p role="status">Đang mở sổ đã lưu…</p>
        ) : !records.length ? (
          <p className="lot-empty">
            Chưa có lô hàng. Tính một lô và chọn “Lưu vào sổ lô hàng” để ghi
            lại.
          </p>
        ) : !shown.length ? (
          <p className="lot-empty">
            Không có lô phù hợp. Đổi từ khóa hoặc chọn “Tất cả”.
          </p>
        ) : (
          <ol className="lot-records">
            {shown.map((r) => {
              const v = calculateLot(r)!;
              return (
                <li key={r.id}>
                  <div className="lot-record-main">
                    <h4>
                      {r.role === "sell" ? "Bán" : "Thu mua"} ·{" "}
                      {REGIONS.find((q) => q.regionId === r.regionId)?.name}
                    </h4>
                    <p>
                      {dateLabel(r.date)} —{" "}
                      {new Intl.NumberFormat("vi-VN", {
                        maximumFractionDigits: 3,
                      }).format(r.weightKg)}{" "}
                      kg × {priceLabel(r.priceVndKg)} đ/kg
                    </p>
                    <p>
                      {r.priceType === "reference"
                        ? `Giá tham khảo ${dateLabel(r.sourceDate!)} · Giacaphe.com`
                        : "Giá tự nhập"}
                      . Chi phí {money(r.costVnd)}.
                    </p>
                    {r.note && <p className="lot-record-note">{r.note}</p>}
                  </div>
                  <strong>{money(v.totalVnd)}</strong>
                  <button
                    type="button"
                    className="button-quiet"
                    aria-label={`Xóa lô ${r.note || dateLabel(r.date)}`}
                    onClick={() => {
                      persist(records.filter((x) => x.id !== r.id));
                      setUndo(r);
                      setNotice("Đã xóa lô khỏi sổ.");
                    }}
                  >
                    Xóa lô
                  </button>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </section>
  );
}

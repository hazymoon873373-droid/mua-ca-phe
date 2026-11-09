# Mùa Cà Phê

Website mới theo dõi giá cà phê Robusta theo vùng, lịch sử và giá bình quân theo tháng. Không đưa ra khuyến nghị mua/bán. Dự án tách biệt với firm-lens và green-basket.

## Chức năng
- Bảng giá tham khảo bốn vùng từ Giacaphe.com, ghi riêng ngày nguồn và lần kiểm tra.
- Bộ lấy dữ liệu chạy ở máy chủ, giới hạn tối đa một lần/giờ; lưu dữ liệu hợp lệ vào Cloudflare D1. Giữ bản giá đã có khi nguồn lỗi, không vượt qua trang bị từ chối truy cập.
- Lịch sử 5.445 quan sát thật từ Mendeley V3, theo năm vùng. Bộ lịch sử và giá thu thập mới được chọn riêng, không ghép thành một đường liên tục.
- Biểu đồ tương tác bằng chuột/bàn phím, khoảng 7/30/90 ngày, 1 năm hoặc toàn bộ dữ liệu của nguồn đã chọn; tải CSV, bảng quan sát phân trang và bảng tháng có ô thiếu.
- Tối đa năm ngưỡng giá lưu trên thiết bị, có xóa/hoàn tác. Đây là đối chiếu trong web lúc mở, chưa có thông báo đẩy.
- Giao diện Hallmark Almanac, phông Hanken Grotesk lưu cục bộ, giá dạng số thẳng cột, ảnh có attribution.

## Chạy và kiểm tra
Node >=22.13; bài kiểm tra SQLite dùng Node24 trong lần xác minh này. Chrome được dùng cho browser checks.

```powershell
npm ci
npm test
npm run typecheck
npm run build
```

Chỉ lần đầu, áp dụng migration vào cơ sở dữ liệu preview:

```powershell
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_dusty_wolverine.sql
npm run dev -- --port 5182 --hostname 127.0.0.1
```

Mở http://127.0.0.1:5182 . Với dev server đang chạy, `npm run test:browser`. Để thử đúng bản build: `npm start -- --port 4182`, sau đó đặt `TEST_URL` tương ứng trước khi chạy browser checks. Xuất bản qua Sites áp migration sản xuất riêng; không dùng lệnh local để sửa dữ liệu sản xuất.

## Nguồn và giới hạn
- [VNCoffeePrice V3](https://data.mendeley.com/datasets/p8fhcw59b7/3), Tan Nguyen Duc, Hai Nguyen Chi (2026), DOI10.17632/p8fhcw59b7.3, CC BY4.0. Chuẩn hóa trường và chọn giá nội địa, giữ nguyên quan sát; không điền ngày thiếu. Đắk Lắk/Lâm Đồng/Gia Lai kết thúc22/05/2026; Đắk Nông/Kon Tum kết thúc16/01/2026. Khởi đầu từng vùng khác nhau.
- [Giacaphe.com](https://giacaphe.com/gia-ca-phe-noi-dia/): snapshot thật09/11/2026 và bản được đọc/lưu sau đó. Giá tham khảo theo vùng, không phải cam kết giá của đại lý. Quyền cấp feed/tái sử dụng và SLA chưa được xác nhận với chủ nguồn; không nhận là đối tác. Chỉ đọc trang công khai, không dùng các route robots cấm; lần đọc archive403 đã dừng.
- `public/data/provenance.json` ghi version, hash, nguồn gốc, phạm vi và phương pháp. `tools/coffee-data-README.md` có cách tái tạo dữ liệu lịch sử. Raw archive/HTML đầy đủ ở `.cache/`, không commit hoặc deploy.
- Giá trung bình tháng là trung bình các quan sát có thật, không mặc nhiên là trung bình đủ mọi ngày; chưa chứng minh quy luật mùa vụ. Chưa triển khai mô hình dự báo hoặc lời khuyên giao dịch.
- Cập nhật khi mở trang đi qua `/api/market`; chỉ tạo lịch chạy khi đóng trang sau khi cơ chế đọc/ghi môi trường thật đã kiểm chứng. Không gọi cập nhật theo lịch là đang hoạt động nếu chưa tạo thành công.

## Triển khai
Vinext/React và Cloudflare Worker, giữ tích hợp Sites trong `vite.config.ts`/`worker/index.ts`; D1 binding `DB` trong `.openai/hosting.json`. URL dự kiến (chỉ xác nhận live sau deployment thành công): https://mua-ca-phe-vn.cozyspoon36.chatgpt.site . Người dùng đã yêu cầu công khai, ai có link cũng xem được.

UI/analytics ở `app/`, `lib/coffee/analytics.mjs`; source parsing, history và sync tách module, có unit tests. Không lưu khóa trong mã hoặc tệp hosting. Mọi POST tới `/api/market` chỉ yêu cầu kiểm tra nguồn cố định, không nhận URL hay dữ liệu giá do người gọi nhập.

# Mùa Cà Phê

Website mới theo dõi giá cà phê Robusta theo vùng, lịch sử và giá bình quân theo tháng. Không đưa ra khuyến nghị mua/bán. Dự án tách biệt với firm-lens và green-basket.

## Chức năng
- Bảng giá tham khảo bốn vùng từ Giacaphe.com, ghi riêng ngày nguồn và lần kiểm tra.
- Bộ lấy dữ liệu chạy ở máy chủ, nhịp đọc thông thường một lần/giờ; lượt bị ngắt được phép phục hồi sau năm phút; lưu dữ liệu hợp lệ vào Cloudflare D1. Giữ bản giá đã có khi nguồn lỗi, không vượt qua trang bị từ chối truy cập.
- Lịch sử 5.445 quan sát thật từ Mendeley V3, theo năm vùng. Bộ lịch sử và giá thu thập mới được chọn riêng, không ghép thành một đường liên tục.
- Biểu đồ tương tác bằng chuột/bàn phím, khoảng 7/30/90 ngày, 1 năm hoặc toàn bộ dữ liệu của nguồn đã chọn; tải CSV, bảng quan sát phân trang và bảng tháng có ô thiếu.
- Tối đa năm ngưỡng giá lưu trên thiết bị, có xóa/hoàn tác. Đây là đối chiếu trong web lúc mở, chưa có thông báo đẩy.
- Cảnh báo mức biến động phần trăm theo thay đổi mà nguồn công bố, ngưỡng 0,1–50% lưu trên thiết bị; luôn gắn ngày của bản giá.
- Công cụ lô hàng: đổi kg/tấn, giá tham khảo hoặc giá tự nhập, tiền bán sau chi phí/ngân sách thu mua. Tính theo gram và đồng nguyên, không gọi số tiền sau chi phí là lợi nhuận.
- Sổ tối đa 50 lô lưu trên trình duyệt, giữ nguyên đơn giá/ngày nguồn lúc lưu, ghi chú, tải CSV, xóa/hoàn tác; tìm ghi chú/vùng/ngày không cần dấu và lọc lô bán/thu mua. Sao lưu/nhập JSON để chuyển địa chỉ hoặc thiết bị: bỏ qua lô trùng, từ chối tệp hỏng, xung đột mã và vượt 50 lô. Không đồng bộ thiết bị; lỗi lưu được thông báo và cho tải bản trong phiên. Dữ liệu lưu hỏng không bị tự ghi đè.
- Đã bỏ dashboard kiểm định khỏi luồng chính theo yêu cầu; các mô hình thật Prophet/XGBoost, pipeline, API và raw artifact giữ trong phần nghiên cứu. Thông tin ngắn và đường tải nằm trong mục nguồn, không cung cấp dự báo giá hiện tại chưa đủ điều kiện.
- Giao diện Hallmark Almanac, phông Hanken Grotesk lưu cục bộ, giá dạng số thẳng cột. Hai ảnh thật minh họa cây và cà phê nhân, tác giả/giấy phép trong `public/credits.html`; không xác nhận giống hoặc địa điểm của ảnh.

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
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0001_refresh_attempts.sql
npm run dev -- --port 5182 --hostname 127.0.0.1
```

Mở http://127.0.0.1:5182 . Với dev server đang chạy, `npm run test:browser`. Để thử đúng bản build: `npm start -- --port 4182`, sau đó đặt `TEST_URL` tương ứng trước khi chạy browser checks. Xuất bản qua Sites áp migration sản xuất riêng; không dùng lệnh local để sửa dữ liệu sản xuất.

## Nguồn và giới hạn
- [VNCoffeePrice V3](https://data.mendeley.com/datasets/p8fhcw59b7/3), Tan Nguyen Duc, Hai Nguyen Chi (2026), DOI10.17632/p8fhcw59b7.3, CC BY4.0. Chuẩn hóa trường và chọn giá nội địa, giữ nguyên quan sát; không điền ngày thiếu. Đắk Lắk/Lâm Đồng/Gia Lai kết thúc22/05/2026; Đắk Nông/Kon Tum kết thúc16/01/2026. Khởi đầu từng vùng khác nhau.
- [Giacaphe.com](https://giacaphe.com/gia-ca-phe-noi-dia/): snapshot thật09/11/2026 và bản được đọc/lưu sau đó. Giá tham khảo theo vùng, không phải cam kết giá của đại lý. Quyền cấp feed/tái sử dụng và SLA chưa được xác nhận với chủ nguồn; không nhận là đối tác. Chỉ đọc trang công khai, không dùng các route robots cấm; lần đọc archive403 đã dừng.
- `public/data/provenance.json` ghi version, hash, nguồn gốc, phạm vi và phương pháp. `tools/coffee-data-README.md` có cách tái tạo dữ liệu lịch sử. Raw archive/HTML đầy đủ ở `.cache/`, không commit hoặc deploy.
- Giá trung bình tháng là trung bình các quan sát có thật, không mặc nhiên là trung bình đủ mọi ngày; chưa chứng minh quy luật mùa vụ. Mô hình thử nghiệm không đưa lời khuyên giao dịch.
- Cập nhật khi mở trang đi qua `/api/market`. Lịch Sites kiểm tra nguồn 08:10/11:10/15:10 giờ Việt Nam đã được tạo; lịch này cập nhật giá, không huấn luyện lại mô hình.

## Huấn luyện và kiểm định

Nâng cấp 11/11/2026: `tools/forecasting/study.py` tạo `public/data/forecast-study.json` qua ba giai đoạn chọn cấu hình, hiệu chỉnh khoảng và đánh giá lần lượt theo thời gian (6/8/12 mốc mỗi vùng). Có đối chứng naive/seasonal naive, checksum nguồn/mã/quy trình và các mẫu kiểm định để tái tính. Đây là nghiên cứu hồi cứu đã biết bối cảnh dữ liệu, không phải kiểm định tiền cứu hay dự báo hiện tại. Xem `tools/forecasting/study-README.md` và `docs/research/2026-11-11-retrospective-study.md`; cả hai artifact được giữ để đối chiếu, không so trực tiếp sai số giữa các đợt khác mẫu.

Trong phần nguồn của web có hai mục mở rộng: độ mới/độ phủ/nhật ký nguồn và kết quả nghiên cứu chọn vùng/kỳ hạn, tải JSON. Nhật ký giữ tối đa 100 lượt kiểm tra đã hoàn tất trong 30 ngày, không tính lượt đọc cache hoặc suy đoán tỷ lệ hoạt động trước khi cài đặt. `drizzle/0001_refresh_attempts.sql` là migration bổ sung; Sites áp dụng khi triển khai. Thiếu bảng nhật ký hoặc lỗi ghi nhật ký không làm mất giá hợp lệ.

Tài liệu nội bộ nhóm được giữ ở `public/field-kit/`, đã gỡ mục dẫn tới bộ phiếu khỏi trang chính theo yêu cầu. Ngưỡng giá/biến động vẫn chỉ đối chiếu khi mở web; chưa có kênh gửi thông báo khi đóng web. Xem `HUONG_DAN_CHAY.md` khi nhận mã nguồn qua ZIP.

Đọc `tools/forecasting/README.md` để tạo môi trường Python riêng, cài phiên bản cố định, chạy kiểm tra chống rò rỉ dữ liệu và tái tạo `public/data/forecast.json`. Không có mô hình giả lập hoặc API AI trả phí. Python không chạy trong Worker; JSON được xuất sau huấn luyện rồi phát hành cùng web. Không cung cấp endpoint công khai để chạy training hoặc tải model pickle.

`/api/forecast` vẫn kiểm tra hợp lệ artifact và trả ngày hiện tại theo Việt Nam cho mục đích nghiên cứu. Helpers kiểm tra độ mới/chất lượng và dữ liệu đo được giữ nguyên; màn hình kiểm định đã gỡ khỏi trang chính. Dữ liệu gần hiện tại còn thiếu; nguồn Giacaphe không được tự nối với Mendeley hoặc đổi nhãn dự báo lịch sử thành hiện tại.

Kiểm tra bổ sung: `node --test tests/forecast.test.mjs tests/lots.test.mjs`; với preview đang chạy, `node tests/lots-browser.mjs`. Raw model artifact là kết quả nghiên cứu, không phải giá giao dịch.

## Triển khai
Giao diện công khai chạy trên GitHub Pages tại `https://hazymoon873373-droid.github.io/mua-ca-phe/` sau khi workflow triển khai thành công. Repo: https://github.com/hazymoon873373-droid/mua-ca-phe . `.github/workflows/pages.yml` cài từ lockfile, chạy unit tests, build `dist-pages` và triển khai khi push `main`. Chạy thử giao diện tĩnh bằng `npm run build:pages`, `npm run preview:pages`; asset và dữ liệu lịch sử hỗ trợ tiền tố `/mua-ca-phe/`.

API giá và lịch kiểm tra nguồn vẫn chạy trên Vinext/Cloudflare Worker tại `https://mua-ca-phe-vn.cozyspoon36.chatgpt.site/api/market`, giữ tích hợp Sites trong `vite.config.ts`/`worker/index.ts`; D1 binding `DB` trong `.openai/hosting.json`. API chỉ cấp CORS cho origin GitHub Pages đã định rõ, không gửi cookie hoặc khóa. Cả hai giao diện dùng chung bảng giá; sổ lô hàng/ngưỡng giá vẫn lưu riêng theo trình duyệt và địa chỉ. Trước khi chuyển link, mở trang cũ → Sao lưu JSON → mở trang mới → Nhập sao lưu. Ngưỡng theo dõi cần tạo lại ở địa chỉ mới.

Không cần tên miền trả phí cho địa chỉ GitHub Pages. Đây là địa chỉ của nền tảng, chưa phải tên miền riêng thuộc nhóm.

UI/analytics ở `app/`, `lib/coffee/analytics.mjs`; source parsing, history và sync tách module, có unit tests. Không lưu khóa trong mã hoặc tệp hosting. Mọi POST tới `/api/market` chỉ yêu cầu kiểm tra nguồn cố định, không nhận URL hay dữ liệu giá do người gọi nhập.

Kiểm tra bổ sung giao diện và sao lưu: `node tests/polish-browser.mjs` (đặt `TEST_URL` để thử link Pages). Thư mục `test-results/` chỉ chứa báo cáo/ảnh cục bộ, không phát hành. Đã loại 60 component mẫu không dùng và 14 dependency trực tiếp; giữ phần tích hợp hosting/connector cần thiết.

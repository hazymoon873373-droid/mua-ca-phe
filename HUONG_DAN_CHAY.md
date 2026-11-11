# Chạy mã nguồn Mùa Cà Phê

Giải nén ZIP, mở terminal trong thư mục `mua-ca-phe` có `package.json`.
Cần Node.js 24 và kết nối Internet khi cài thư viện/đối chiếu giá.
Không cần cài Python để mở web: kết quả nghiên cứu đã xuất thành JSON.

## Cài và dựng web

```powershell
npm ci
npm run build
```

## Khởi tạo cơ sở dữ liệu trên máy mới (mỗi câu chạy một lần)

```powershell
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_dusty_wolverine.sql
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0001_refresh_attempts.sql
```

Đây là cơ sở dữ liệu cục bộ mới; không chứa dữ liệu vận hành trên hosting.

## Mở web

```powershell
npm start -- --port 4182
```

Mở http://127.0.0.1:4182 . Sửa giao diện trong lúc phát triển bằng
`npm run dev -- --port 5182 --hostname 127.0.0.1`.

## Kiểm tra

```powershell
npm test
npm run typecheck
```

Các bài kiểm tra trình duyệt cần Chrome và web đang chạy. Huấn luyện Python là bước tùy chọn riêng, xem `tools/forecasting/study-README.md`.

## Tệp và giới hạn

- `app/`, `lib/`: giao diện, công cụ lô hàng, đọc nguồn giá và kiểm tra dữ liệu.
- `public/data/`, `public/images/`, `public/fonts/`: dữ liệu đã xuất, ảnh và font.
- `db/`, `drizzle/`: schema và các migration.
- `tools/forecasting/`: mã nghiên cứu Prophet/XGBoost và kiểm thử.
- `static/`, `vite.pages.config.ts`: giao diện GitHub Pages; cấu hình này dùng API công khai hiện tại. Để chạy đủ API trên máy, dùng hướng dẫn Worker ở trên.
- `public/field-kit/`: tài liệu chuẩn bị khảo sát được giữ cho nhóm, không còn mục quảng bá trên trang chính.
- `.openai/hosting.json`: định danh hosting hiện tại, không phải khóa bí mật. Triển khai thành dự án mới cần cấu hình hosting, đường dẫn và CORS tương ứng.

ZIP chỉ chứa tệp được quản lý bằng Git; không đóng gói `.git`, `node_modules`, môi trường Python, khóa/token, cơ sở dữ liệu máy hoặc sổ lô lưu trong trình duyệt. Chuyển sổ lô bằng Sao lưu JSON/Nhập sao lưu trên web.

Nguồn giá có thể chậm hoặc lỗi; web giữ ngày nguồn và bản gần nhất. Kết quả mô hình là nghiên cứu lịch sử, chưa phải dự báo giá hiện tại. Ảnh/dữ liệu phải giữ nguồn và giấy phép khi chia sẻ.

Repo: https://github.com/hazymoon873373-droid/mua-ca-phe
Web: https://hazymoon873373-droid.github.io/mua-ca-phe/

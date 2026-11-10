# Kết quả huấn luyện Prophet và XGBoost thực tế

Ngày chạy: **10/11/2026**, Windows, Python **3.13.5**. Đã cài và chạy thư viện thật: **Prophet 1.5.0, XGBoost 3.4.1, pandas 3.1.1, NumPy 2.5.4**, CmdStanPy 1.3.2. Toàn bộ phiên bản phụ thuộc đã khóa tại `tools/forecasting/requirements.txt`; môi trường nằm trong `.cache/ml-venv` được Git bỏ qua.

**Trong thí nghiệm cố định này, cả Prophet và XGBoost đều thua dự báo giữ nguyên giá gần nhất ở cả hai vùng và hai horizon.** Không chọn lại tham số sau khi thấy kết quả. Không nên trình bày các mô hình này là đã cải thiện độ chính xác.

## Dữ liệu và cách đo

Chỉ đọc `public/data/history.json`, nguồn [Mendeley V3](https://data.mendeley.com/datasets/p8fhcw59b7/3), SHA-256 `312166dbee46f7d7bcdc80e513f68c69344512a7ac54547a66f76ecdeb569fab`. Tách riêng Đắk Lắk (**1.613 quan sát**) và Lâm Đồng (**1.616 quan sát**), cùng khoảng 01/01/2020–22/05/2026. Không nối nguồn khác, điền ngày thiếu hay tạo nhãn giả.

Mỗi vùng dùng **24 rolling origins** được chọn cách đều theo chỉ số các ngày đủ điều kiện trong 180 ngày lịch cuối; origin đầu 24/11/2025, cuối 14/05/2026. Mỗi origin có ít nhất 730 ngày lịch sử và đồng thời có giá thật đúng origin+1 và origin+7 **ngày lịch**. Cả ba mô hình dùng chung origin/nhãn ở từng horizon; hai vùng tình cờ có cùng danh sách origin. Cửa sổ huấn luyện mở rộng qua thời gian; mỗi lần chỉ dùng dữ liệu đến origin. Các nhãn XGBoost phải có ngày đích không sau origin đang chấm.

Prophet dùng xu hướng tuyến tính, 25 changepoints, prior changepoint 0,05, prior mùa vụ 1, Fourier năm/tuần bậc 3 cố định, tắt mùa vụ ngày. Khoảng danh nghĩa 80% dùng 400 mẫu mô phỏng. XGBoost dùng hai mô hình direct riêng cho +1/+7 ngày, học phần thay đổi giá từ origin: 140 vòng, depth 3, learning rate 0,05, min child weight 8, histogram, toàn bộ hàng/đặc trưng, 2 luồng. Seed cố định 20261110. Không tìm tham số trên tập chấm.

Đặc trưng XGBoost: giá hiện tại; trễ 1/2/5/10 **quan sát**; trung bình 5/20 quan sát; số ngày lịch cách quan sát trước và cách 5 quan sát; thứ/tháng/ngày trong năm tại origin. Không dùng biến ngoại sinh. Chi tiết và lệnh tái lập: `tools/forecasting/README.md`.

## Sai số ngoài mẫu thực đo

MAE/RMSE: **đồng/kg**, mỗi hàng **n=24**. Coverage là tỷ lệ giá thật nằm trong khoảng Prophet; dấu “—” nghĩa là mô hình không xuất khoảng, không phải coverage bằng 0.

| Vùng | Ngày | Mô hình | MAE | RMSE | Coverage khoảng 80% |
|---|---:|---|---:|---:|---:|
| Đắk Lắk | 1 | Giữ giá | 1.106,92 | 1.469,28 | — |
| Đắk Lắk | 1 | Prophet | 8.003,08 | 8.627,13 | 41,67% |
| Đắk Lắk | 1 | XGBoost | 1.445,08 | 1.904,56 | — |
| Đắk Lắk | 7 | Giữ giá | 2.502,77 | 3.217,82 | — |
| Đắk Lắk | 7 | Prophet | 8.634,40 | 9.285,23 | 41,67% |
| Đắk Lắk | 7 | XGBoost | 3.992,36 | 4.986,30 | — |
| Lâm Đồng | 1 | Giữ giá | 991,67 | 1.308,63 | — |
| Lâm Đồng | 1 | Prophet | 7.879,20 | 8.554,31 | 41,67% |
| Lâm Đồng | 1 | XGBoost | 1.317,38 | 1.674,07 | — |
| Lâm Đồng | 7 | Giữ giá | 2.402,08 | 3.140,15 | — |
| Lâm Đồng | 7 | Prophet | 8.420,13 | 9.058,51 | 50,00% |
| Lâm Đồng | 7 | XGBoost | 4.106,56 | 5.414,28 | — |

Khoảng Prophet chưa hiệu chỉnh và coverage thực tế thấp hơn đáng kể mức danh nghĩa 80%. Mẫu nhỏ, có thể phụ thuộc thời gian; chỉ chấm được các ngày đích có quan sát. Đây là kết quả của cấu hình cố định trên dữ liệu này, không phải kết luận rằng mọi cấu hình Prophet/XGBoost đều kém.

## Artifact và kiểm chứng

`public/data/forecast.json` được sinh từ **50 lần fit Prophet và 100 lần fit XGBoost**: 24 origins cùng một lần fit cuối cho mỗi vùng; mỗi fit Prophet dùng chung hai horizon, XGBoost tách theo horizon. Artifact **18.901 byte**, schemaVersion 1, lưu phiên bản, tham số, SHA-256 nguồn, từng dự báo backtest và metric thực đo. Các mô hình cuối chỉ fit đến **22/05/2026**, dự báo lịch sử cho **23/05/2026** và **29/05/2026**. Hai ngày này chưa có nhãn trong nguồn; không phải giá hoặc dự báo thị trường hiện tại vào 10/11/2026.

Lệnh đã chạy từ thư mục gốc dự án:

```powershell
py -3.13 -m venv .cache/ml-venv
.cache/ml-venv/Scripts/python.exe -m pip install prophet xgboost pandas numpy
.cache/ml-venv/Scripts/python.exe -m pip freeze | Set-Content tools/forecasting/requirements.txt -Encoding utf8
.cache/ml-venv/Scripts/python.exe tools/forecasting/train.py
.cache/ml-venv/Scripts/python.exe -m unittest discover -s tools/forecasting -v
npm test
```

TDD: đã quan sát **5 assertion thất bại** khi chưa có pipeline; sau triển khai, 4 kiểm tra qua và kiểm tra artifact tạm skip trước huấn luyện; sau huấn luyện **5/5 qua, không skip**. Kiểm tra gồm prefix invariance khi sửa giá tương lai; nhãn training đúng ngày và không vượt cutoff; origin chung; metric chỉ nhận đủ ba dự báo; checksum, nhãn thật, khoảng ngày, giá hữu hạn/dương, metric/coverage tính lại khớp artifact. Bộ kiểm tra JavaScript hiện tại **25/25 qua**; `validateForecastArtifact` trong `lib/coffee/forecast.mjs` đã nhận artifact thật thành công.

Lần chạy có thông báo dựng font cache của Matplotlib, cảnh báo Plotly tùy chọn chưa cài và log tiến độ CmdStan; không ảnh hưởng fit/predict và không cần cài Plotly để tạo artifact. Không lưu model binary, không thay NPM, app hay CSS; kiểm tra UI, triển khai và công bố thuộc phần tích hợp.

Tài liệu API chính thức đã tham khảo: [Prophet quick start](https://meta.github.io/prophet/docs/quick_start.html), [Prophet uncertainty intervals](https://meta.github.io/prophet/docs/uncertainty_intervals.html), [XGBoost native train/DMatrix](https://xgboost.readthedocs.io/en/stable/python/python_api.html#xgboost.train). Đánh giá trước huấn luyện nằm tại `docs/research/2026-11-10-prophet-assessment.md`; ghi chú này bổ sung kết quả thực nghiệm.

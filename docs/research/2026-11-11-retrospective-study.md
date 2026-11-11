# Kết quả nghiên cứu dự báo hồi cứu — 11/11/2026

**Chưa có mô hình đủ bằng chứng để dùng làm dự báo giá hiện tại.** Lợi thế MAE tốt nhất so với giữ nguyên giá chỉ 2,68%, trên 12 mốc đánh giá mỗi vùng/kỳ hạn. Dữ liệu Mendeley V3 kết thúc ngày 22/05/2026; nghiên cứu này không bổ sung giá thị trường mới và không ngoại suy thành dự báo hôm nay.

Đã chạy thật Prophet 1.5.0 và XGBoost 3.4.1 bằng môi trường hiện có, không thêm gói. [Mã và cách tái lập](../../tools/forecasting/study-README.md); [artifact đầy đủ](../../public/data/forecast-study.json).

## Các kết quả đo được

Đơn vị MAE/RMSE là đồng/kg. Mỗi dòng có cùng **12 mốc**, ngày dự báo gốc từ 23/02–14/05/2026, nhãn thực tế đúng ngày lịch +1 hoặc +7. Coverage là tỷ lệ giá thực nằm trong khoảng danh nghĩa 80%, hiệu chỉnh từ **8 mốc cũ hơn**, không dùng nhãn trong đoạn đánh giá để hiệu chỉnh.

| Vùng | Kỳ hạn | Phương pháp | MAE | RMSE | Coverage |
|---|---:|---|---:|---:|---:|
| Đắk Lắk | +1 | Giữ giá gần nhất | 916,67 | 1.004,16 | 100% |
| Đắk Lắk | +1 | Giá cùng thứ tuần trước | 2.216,67 | 2.777,59 | 100% |
| Đắk Lắk | +1 | Prophet | 924,42 | 985,81 | 100% |
| Đắk Lắk | +1 | XGBoost | 901,82 | 983,38 | 100% |
| Đắk Lắk | +7 | Giữ giá gần nhất | 2.575,00 | 3.080,18 | 100% |
| Đắk Lắk | +7 | Giá cùng thứ tuần trước | 2.575,00 | 3.080,18 | 100% |
| Đắk Lắk | +7 | Prophet | 2.575,00 | 3.080,18 | 100% |
| Đắk Lắk | +7 | XGBoost | 2.845,47 | 3.344,11 | 91,67% |
| Lâm Đồng | +1 | Giữ giá gần nhất | 925,00 | 1.003,74 | 100% |
| Lâm Đồng | +1 | Giá cùng thứ tuần trước | 2.258,33 | 2.761,79 | 100% |
| Lâm Đồng | +1 | Prophet | 900,19 | 992,26 | 100% |
| Lâm Đồng | +1 | XGBoost | 955,64 | 1.030,35 | 100% |
| Lâm Đồng | +7 | Giữ giá gần nhất | 2.591,67 | 3.106,58 | 91,67% |
| Lâm Đồng | +7 | Giá cùng thứ tuần trước | 2.591,67 | 3.106,58 | 91,67% |
| Lâm Đồng | +7 | Prophet | 2.591,67 | 3.106,58 | 91,67% |
| Lâm Đồng | +7 | XGBoost | 2.735,94 | 3.206,02 | 83,33% |

XGBoost +1 Đắk Lắk giảm MAE 1,62%; Prophet +1 Lâm Đồng giảm 2,68%. Các trường hợp còn lại hòa hoặc kém giữ giá. **Prophet flat được neo vào giá cuối, với mùa vụ tuần, cho thay đổi +7 bằng 0: hòa baseline là đặc tính toán học của ứng viên này, không chứng minh khả năng dự báo mới.** Baseline mùa vụ tuần tại +7 cũng chính là giá tại mốc gốc.

Các khoảng trung bình rộng khoảng 4.985–6.865 đồng/kg cho mô hình +1, khoảng 11.584–13.800 đồng/kg cho mô hình +7; baseline mùa vụ +1 rộng 23.400–24.000 đồng/kg. Coverage cao phải đọc cùng độ rộng, không gọi là “độ chính xác 100%”. Mẫu nhỏ và phụ thuộc thời gian không đảm bảo coverage tương lai.

## Cách chọn và chẩn đoán

Chọn giữa hai cấu hình mỗi họ bằng MAE tại **6 mốc validation** 22/05–16/10/2025. Nhãn cuối validation trước calibration; nhãn cuối calibration trước mốc đánh giá đầu. Mỗi lần fit chỉ dùng đặc trưng và nhãn đã có đến mốc gốc. Sau validation, khóa ứng viên và khoảng hiệu chỉnh; không sửa tham số khi thấy kết quả đánh giá.

Prophet thử xu hướng linear regularization mạnh hơn và flat, dùng 365 ngày gần nhất, mùa vụ tuần nhẹ, neo thay đổi dự báo vào giá đã quan sát cuối. XGBoost học tỷ lệ thay đổi giá, đặc trưng lợi suất và biến động, thử hệ số giảm thay đổi 0,25 hoặc 1. Lựa chọn thực tế:

| Vùng | Kỳ hạn | Prophet | XGBoost |
|---|---:|---|---|
| Đắk Lắk | +1 | anchoredLinear | returnQuarter |
| Đắk Lắk | +7 | anchoredFlat | returnFull |
| Lâm Đồng | +1 | anchoredFlat | returnQuarter |
| Lâm Đồng | +7 | anchoredFlat | returnQuarter |

Artifact cũ cho thấy Prophet dự báo cao hơn thực tế trung bình khoảng 7.832–8.479 đồng/kg; XGBoost khoảng 738–3.492 đồng/kg. Đây phù hợp với giả thuyết mức/xu hướng dài hạn chưa bắt kịp giá giảm và đặc trưng mức giá khó chuyển giữa các chế độ giá. Không có thí nghiệm tách riêng từng thay đổi nên không kết luận quan hệ nhân quả. Tài liệu chính thức hỗ trợ [flat trend](https://github.com/meta/prophet/blob/main/docs/_docs/additional_topics.md#flat-trend), [regularization changepoint](https://github.com/meta/prophet/blob/main/docs/_docs/trend_changepoints.md) và [tham số XGBoost](https://xgboost.readthedocs.io/en/stable/parameter.html); việc neo và giảm lợi suất là thiết kế thí nghiệm này.

Đoạn lịch sử cũ đã được xem trong phiên trước. Vì vậy đây là **nghiên cứu hồi cứu**, không phải test chưa từng nhìn thấy. Các mốc của artifact cũ và mới khác nhau; không so hai MAE tổng hợp rồi tuyên bố cải thiện trên cùng mẫu. Kết quả hiện tại chỉ cho phép so các phương pháp trên đúng các mốc chung trong bảng này.

## Kiểm chứng tiếp theo đã đặc tả, chưa có kết quả

Giữ riêng quan sát Giacaphe mới và lịch sử Mendeley. Chỉ bắt đầu khi cùng một nguồn đã xác minh có ít nhất 365 ngày lịch và 200 quan sát mỗi vùng; nếu thiếu thì thu thập tiếp hoặc xin nguồn lịch sử tương thích có thể kiểm chứng. Khóa ứng viên từ artifact này. Lưu dự báo, phiên bản/hash nguồn, cutoff và thời điểm tạo **trước khi có giá đích**. Dùng 20 mốc tương lai đầu để hiệu chỉnh, đợi đủ nhãn +7, rồi 40 mốc tiếp để đánh giá.

Ngưỡng xem xét là giảm MAE ít nhất 5% so với **cả hai baseline**, có ít nhất 40 mốc chung và coverage khoảng danh nghĩa 80% đạt ít nhất 75%. Đây là quy tắc xem xét trước khi sử dụng, không phải chứng minh thống kê hay hướng dẫn giao dịch. Thay đổi cấu hình/quy trình phải tạo phiên bản và bắt đầu đợt kiểm chứng mới. Hiện chưa có dữ liệu hay kết quả tương lai nào trong báo cáo này.

Kiểm tra thực thi: 10/10 kiểm thử Python qua, gồm kiểm tra nhãn không vượt cutoff, chia thời gian, chọn bằng validation, lượng vị hiệu chỉnh, nguồn/hash, nhãn thực tế và tính lại toàn bộ metrics từ artifact.

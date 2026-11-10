# Đánh giá Prophet cho dự báo giá Robusta Việt Nam

Ngày đánh giá: **10/11/2026**. Phạm vi: nghiên cứu phương pháp cho cuộc thi sinh viên; **chưa cài Prophet, chưa huấn luyện, chưa có kết quả đo**. Chỉ dùng tài liệu/mã nguồn chính thức Prophet cho các nhận định về mô hình. Số liệu dữ liệu bên dưới do kiểm tra đọc dữ liệu nội bộ của dự án cung cấp.

## Kết luận thực dụng

**Nên đưa Prophet vào thí nghiệm như một ứng viên dễ giải thích; chưa có cơ sở chọn làm mô hình chính hoặc nói tốt hơn XGBoost.** Bắt đầu backtest lịch sử riêng cho Đắk Lắk và Lâm Đồng, so với dự báo giữ nguyên giá gần nhất; đánh giá 1 và 7 ngày, thêm 14 ngày nếu đủ mẫu kiểm tra. Điểm mạnh theo tác giả là phân rã xu hướng, mùa vụ và sự kiện; Prophet phù hợp nhất khi mùa vụ rõ và có nhiều chu kỳ lịch sử. Giá cà phê có đáp ứng điều kiện đó hay không phải kiểm chứng trên dữ liệu này. [README chính thức](https://github.com/meta/prophet/blob/main/README.md)

## Dữ liệu đang cho phép làm gì?

Mendeley V3 có **5.445 quan sát**, thuộc năm chuỗi vùng với độ phủ khác nhau; không phải 5.445 ngày của một chuỗi.

| Vùng | Số quan sát | Ngày đầu–cuối | Độ cũ tại 10/11/2026 |
|---|---:|---|---:|
| Đắk Lắk | 1.613 | 01/01/2020–22/05/2026 | 172 ngày |
| Lâm Đồng | 1.616 | 01/01/2020–22/05/2026 | 172 ngày |
| Gia Lai | 801 | 01/03/2021–22/05/2026 | 172 ngày |
| Đắk Nông | 721 | 01/03/2021–16/01/2026 | 298 ngày |
| Kon Tum | 694 | 01/03/2021–16/01/2026 | 298 ngày |

Đắk Lắk/Lâm Đồng mỗi chuỗi có 241 quan sát trong 365 ngày lịch cuối; khoảng cách lớn nhất giữa hai mốc là 14 ngày, từ 26/09 đến 10/10/2025. Ba vùng còn lại có khoảng cách **711 ngày** từ 01/07/2021 đến 12/06/2023. Đây là khoảng cách giữa timestamp, không phải số ngày thiếu.

**Suy luận cho dự án:** dự báo ngày 11/11/2026 bằng chuỗi kết thúc 22/05 là ngoại suy **173 ngày** từ quan sát cuối, không phải phép thử dự báo trước một ngày. Với chuỗi kết thúc 16/01, con số là 299 ngày. Chuỗi Giacaphe bắt đầu 09/11/2026 phải giữ riêng; không nối nguồn để tạo vẻ có lịch sử cập nhật. Hiện phù hợp làm thí nghiệm hồi cứu hơn là công bố dự báo thị trường hiện tại đã kiểm chứng.

## Các giới hạn cần nói rõ

- **Xu hướng và mùa vụ:** Prophet mô hình hóa xu hướng cùng chu kỳ tuần/năm và hiệu ứng sự kiện; các changepoint giúp đổi độ dốc, không phải khả năng biết trước cú sốc. Mặc định đặt 25 changepoint tiềm năng trong 80% đầu lịch sử, nên cần xem đồ thị phần cuối và kiểm tra độ linh hoạt trên tập validation. [Trend changepoints](https://github.com/meta/prophet/blob/main/docs/_docs/trend_changepoints.md)
- **Ngày không đều khác lịch sử bị đứt dài:** Prophet là mô hình theo thời gian liên tục và có thể fit khi thiếu quan sát. Nhưng nếu một phần chu kỳ chưa từng có dữ liệu, thành phần mùa vụ có thể không xác định tốt; tài liệu khuyên chỉ dự báo các cửa sổ thời gian đã được quan sát. Vì vậy cần kiểm tra lịch công bố từng vùng; không điền giá giả vào ngày thiếu để làm nhãn kiểm thử. Khả năng fit không chứng minh rằng khoảng trống 711 ngày hoặc 172–298 ngày gần hiện tại đã được giải quyết. [Non-daily data](https://github.com/meta/prophet/blob/main/docs/_docs/non-daily_data.md), [Outliers](https://github.com/meta/prophet/blob/main/docs/_docs/outliers.md)
- **Cú sốc và thay đổi chế độ:** tài liệu minh họa cú sốc có thể bị mô hình mặc định hấp thụ sai vào xu hướng. Sự kiện một lần, thay đổi mùa vụ và changepoint có thể cần xử lý riêng. Với dữ liệu này, chỉ sửa lỗi dữ liệu đã xác minh; không xóa biến động giá thật chỉ vì lớn, và không dùng hiểu biết về sự kiện sau cutoff để cải thiện backtest. [Handling shocks](https://github.com/meta/prophet/blob/main/docs/_docs/handling_shocks.md)
- **Khoảng dự báo chưa được hiệu chỉnh:** khoảng mặc định 80% dựa trên giả định tần suất/cường độ đổi xu hướng tương lai giống quá khứ; chính tài liệu cảnh báo không kỳ vọng coverage chính xác. Mặc định chỉ tính bất định xu hướng và nhiễu, chưa gồm bất định ước lượng mùa vụ. Phải đo tỷ lệ giá thật nằm trong khoảng và độ rộng khoảng theo từng horizon; không diễn giải nhãn 80% thành cam kết đúng 80%. [Uncertainty intervals](https://github.com/meta/prophet/blob/main/docs/_docs/uncertainty_intervals.md)
- **Biến ngoại sinh:** mỗi regressor phải có ở cả lịch sử lẫn thời điểm dự báo. Lịch lễ có thể biết trước; giá kỳ hạn, tỷ giá, thời tiết thực tế tương lai thì không. Nếu dùng dự báo của chúng, backtest phải tái tạo đúng thông tin đã biết tại cutoff, đồng thời thừa nhận sai số regressor truyền sang dự báo giá. [Additional regressors](https://github.com/meta/prophet/blob/main/docs/_docs/seasonality%2C_holiday_effects%2C_and_regressors.md#additional-regressors)

## Thí nghiệm nhỏ đủ để quyết định

Đề xuất cho dự án, chưa phải kết quả:

1. Chọn riêng Đắk Lắk/Lâm Đồng; dùng các cutoff tiến dần theo thời gian. Mỗi lần chỉ fit dữ liệu đã có đến cutoff. Prophet có sẵn cơ chế này; đặt `initial` đủ cho chu kỳ cần học, không máy móc dùng mặc định ba lần horizon ngắn. [Cross validation](https://github.com/meta/prophet/blob/main/docs/_docs/diagnostics.md#cross-validation)
2. Thống nhất **ngày lịch** cho horizon 1/7/14. Chỉ chấm tại ngày có giá thật; báo số dự báo chấm được ở từng horizon. Thiếu nhãn ngày thứ 7 không được lấy quan sát thứ 7 làm thay thế. Dành đoạn cuối làm test riêng; chọn tham số trên các cutoff trước đó.
3. So cùng vùng, cutoff và nhãn giữa **giá gần nhất**, **Prophet**, **XGBoost**. Với XGBoost, đặc trưng trễ/tổng hợp chỉ lấy từ dữ liệu có trước cutoff; dự báo nhiều bước phải giữ nguyên điều kiện đó. Không chọn người thắng từ độ khớp trên tập train.
4. Báo MAE theo đồng/kg, RMSE và sai số theo từng horizon; kèm số mẫu và coverage/độ rộng khoảng cho Prophet. Không chỉ gộp một điểm cho mọi vùng hoặc mọi horizon. Tài liệu hỗ trợ đánh giá sai số và coverage theo khoảng cách từ cutoff. [Performance metrics](https://github.com/meta/prophet/blob/main/docs/_docs/diagnostics.md#cross-validation)
5. Chỉ chọn Prophet khi điểm ngoài mẫu và tính ổn định đủ thuyết phục so với giữ nguyên giá. Nếu không thắng baseline, trình bày trung thực kết quả đó. Thu thập thêm lịch sử gần hiện tại, kiểm chứng định nghĩa/đơn vị giữa các nguồn trước khi bàn về mô hình dự báo dùng hằng ngày.

Không có bằng chứng hiệu năng trên bộ dữ liệu này trong ghi chú; các đề xuất trên cần thực nghiệm. Không thay đổi ứng dụng, dependency hay chuỗi dữ liệu.

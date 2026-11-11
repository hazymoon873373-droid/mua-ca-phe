# Đánh giá dự án theo góc nhìn giám khảo — 11/11/2026

Đề tài: Hệ thống theo dõi, cảnh báo biến động và hỗ trợ dự báo ngắn hạn giá cà phê Robusta cho người trồng và cơ sở thu mua.

Đây là nhận định tư vấn, không phải kết quả chấm hay xác suất vào vòng trong. Đã đối chiếu mẫu thuyết minh AE2026 do nhóm cung cấp; chưa có bảng điểm, trọng số chính thức và hồ sơ đối thủ. Mẫu vòng ý tưởng cho phép chưa có code, không yêu cầu huấn luyện từ đầu; yêu cầu giải thích vai trò AI, kiểm chứng, hạn chế, nguồn dữ liệu và khai báo sử dụng AI.

## Kết luận

Có cơ sở dự vòng ý tưởng vì bài toán rõ đối tượng, có dữ liệu và nguyên mẫu công khai chạy được. Chưa đủ bằng chứng để đề xuất vào chung kết: hiệu quả AI chưa vượt đối chứng, dữ liệu huấn luyện cách xa hiện tại, khác biệt và tác động với người dùng chưa được kiểm chứng. Giao diện đẹp giúp trình bày; không thay thế được ba thiếu hụt này.

## Đối chiếu tên đề tài với sản phẩm

| Thành phần | Hiện có | Khoảng thiếu |
|---|---|---|
| Theo dõi | Bốn vùng giá, ngày nguồn/lần kiểm tra, D1, lịch thu thập, lịch sử thật | Quyền dùng feed và độ bền nguồn cần xác nhận, nhật ký vận hành dài hơn |
| Cảnh báo | Ngưỡng giá và tỷ lệ biến động khi mở web | Chưa gửi khi người dùng đóng web; quy tắc ngưỡng không phải AI |
| Dự báo ngắn hạn | Pipeline Prophet/XGBoost, kiểm định cuốn chiếu theo thời gian, đối chứng naive | Chưa đủ điều kiện phát hành dự báo hiện tại; cần dữ liệu mới cùng định nghĩa và bằng chứng ngoài mẫu |
| Người dùng | Luồng trên điện thoại, tính tiền lô, sổ và sao lưu | Chưa có kết quả thử thực địa được xác nhận |

## Bằng chứng mô hình đang có

Nguồn: `public/data/forecast.json`, sinh 10/11/2026. Hai vùng được huấn luyện đến 22/05/2026; 24 mốc kiểm định chung mỗi vùng/kỳ hạn, nhãn đúng +1/+7 ngày lịch có quan sát. MAE đơn vị đồng/kg, làm tròn:

| Vùng / kỳ hạn | Giá gần nhất (naive) | Prophet | XGBoost |
|---|---:|---:|---:|
| Đắk Lắk / 1 ngày | 1.107 | 8.003 | 1.445 |
| Đắk Lắk / 7 ngày | 2.503 | 8.634 | 3.992 |
| Lâm Đồng / 1 ngày | 992 | 7.879 | 1.317 |
| Lâm Đồng / 7 ngày | 2.402 | 8.420 | 4.107 |

Cả hai mô hình hiện đều kém naive trên các tập đo này. Không được đổi nhãn kết quả lịch sử thành dự báo hôm nay, lấy trung bình hai mô hình để tuyên bố tốt hơn, hoặc chỉnh tham số trên tập kiểm tra rồi gọi đó là ngoài mẫu.

## Phạm vi sản phẩm nên tập trung

Ba việc chính: xem giá đúng vùng và độ mới → nhận cảnh báo có ngày/bằng chứng → xem dự báo ngắn hạn khi đủ điều kiện. Tính lô và sổ nằm ở vai trò phụ. Đã bỏ bảng so tiền cùng khối lượng theo vùng vì dễ khiến người dùng hiểu rằng có thể chuyển nơi bán mà không tính chất lượng/vận chuyển. Đã bỏ chữ trên hai ảnh theo yêu cầu; giữ nguồn/giấy phép ở trang credits và mô tả ảnh cho người dùng trình đọc màn hình.

Không bổ sung chatbot, chợ giao dịch, thanh toán, bản đồ hay thêm mô hình chỉ để tăng số tính năng. Giữ thông tin ngày nguồn, nguồn lỗi, điều kiện dự báo và giới hạn lưu sổ.

## Lộ trình ưu tiên để tăng sức cạnh tranh

1. **Bằng chứng nhu cầu.** Nhóm phỏng vấn khoảng 5 người trồng và 3 cơ sở thu mua nếu tiếp cận được; ghi ngày, cách chọn mẫu, đồng ý tham gia, câu trả lời thật và hạn chế. Đây là cỡ mẫu thăm dò đề xuất, chưa phải khảo sát đã làm. Đo thời gian tra giá, cách nhận tin và hậu quả của giá cũ. Chọn một khó khăn quan trọng được xác nhận.
2. **Dữ liệu đáng tin.** Xin xác nhận phương án dùng nguồn/feed; theo dõi tỷ lệ lượt đọc thành công, độ trễ, số ngày thiếu. Thu dữ liệu cùng vùng, đơn vị, chất lượng và thời điểm chốt; kiểm tra chồng lấn trước khi nối nguồn. Giá vùng tham khảo khác báo giá có hiệu lực của đại lý. Không tự điền dữ liệu thiếu thành giá thật.
3. **Dự báo có đối chứng.** Đánh giá naive, seasonal naive và các mô hình đang có theo thời gian; cố định tập cuối chưa dùng để chọn mô hình. Tách kết quả từng vùng/kỳ hạn; báo MAE, độ bao phủ và độ rộng khoảng dự báo, số mẫu và giai đoạn. Thử đặc trưng trễ/giá London/tỷ giá chỉ khi có dữ liệu hợp lệ tại thời điểm dự báo. Không cam kết AI sẽ thắng. Nếu mô hình chưa cải thiện ngoài mẫu, giữ naive làm đối chứng và báo chưa đủ điều kiện dùng AI.
4. **Kết quả dễ hiểu.** Khi đạt điều kiện, màn hình dự báo cần có ngày phát hành, ngày đích, khoảng dự báo, ngày dữ liệu và mức sai số kiểm định. Cảnh báo hiển thị lý do, ngày và giá gốc; chống gửi trùng. Thông báo khi đóng web cần một kênh đăng ký và thử việc nhận thực tế; hiện chưa có.
5. **Thí điểm trước/sau.** Cùng người dùng thực hiện tra giá, đọc cảnh báo và giải thích độ không chắc chắn trên nguồn hiện có và prototype; ghi thời gian, tỷ lệ hoàn thành, lỗi hiểu nhầm. Công bố trung vị và cỡ mẫu; chưa có bằng chứng thì ghi mục tiêu, không ghi kết quả. Không suy diễn tiết kiệm tiền từ mô phỏng thành lợi nhuận thực tế.

## Câu chuyện bài thi và demo 90 giây

Thông điệp đề xuất: “Giúp người trồng và cơ sở thu mua theo dõi giá Robusta đúng ngày, nhận biết biến động và tham khảo dự báo ngắn hạn có thể kiểm chứng.”

- 0–15 giây: một khó khăn thật từ khảo sát, kèm bối cảnh và nguồn; chưa khảo sát thì nói giả định.
- 15–40 giây: chọn vùng, xem giá/ngày nguồn và cảnh báo; cho thấy cách xử lý nguồn chưa cập nhật.
- 40–65 giây: trình diễn dự báo lịch sử và sai số đối chứng. Chỉ trình diễn dự báo hiện tại khi vượt điều kiện dữ liệu/chất lượng. Không cần đặt dashboard kiểm định dài vào luồng người dùng; dẫn báo cáo kỹ thuật cho giám khảo.
- 65–90 giây: kết quả thử người dùng nếu có, giới hạn và bước tiếp theo. Nhóm phải tự giải thích được thu thập dữ liệu, chống rò rỉ và phần AI hỗ trợ viết code.

## Mốc sẵn sàng

Vòng ý tưởng: hồ sơ tối đa 15 trang theo mẫu, video 1–2 phút, bài toán hẹp, vai trò AI có lý do, minh chứng và kế hoạch có người phụ trách. Không tự đặt trọng số chấm điểm.

Mục tiêu trước chung kết: người dùng thật đã thử; nguồn và độ mới được theo dõi; kiểm định độc lập có đối chứng; demo hoạt động cả khi nguồn lỗi; người xem hiểu đúng dự báo; khai báo AI và trích nguồn đầy đủ. Các mốc này tăng chất lượng bài thi, không bảo đảm kết quả tuyển chọn.

Tham khảo đối sánh: https://giacaphe.com/gia-ca-phe-noi-dia/ — đã có bảng giá, lịch sử và thông tin thị trường; vì vậy chỉ tổng hợp lại giá chưa tạo khác biệt rõ. Mẫu thuyết minh: PDF AE2026 nhóm cung cấp. Thông tin trên website nguồn và tài liệu là dữ liệu tham khảo, không phải chỉ dẫn thực thi.

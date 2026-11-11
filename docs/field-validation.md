# Bộ kiểm chứng thực địa

Đã chuẩn bị bộ phiếu trống ở `public/field-kit/index.html`, không có kết quả người dùng, tỷ lệ thành công hoặc số tiền tiết kiệm giả. Mục tiêu 5 người trồng/3 cơ sở thu mua là gợi ý tuyển mẫu thăm dò, không phải bằng chứng đã phỏng vấn. Nhóm phải trực tiếp tuyển người, xin đồng ý và thu kết quả.

## Tệp công khai

- `public/field-kit/index.html`: hướng dẫn tiếng Việt, phiếu dùng tại chỗ, tiêu chí hiểu đúng, cách tính và checklist; có CSS in A4.
- `public/field-kit/field-kit.css`: dùng hệ Almanac/Hanken sẵn có, font cục bộ và liên kết tương đối.
- `public/field-kit/protocol.md`: bộ phiếu có thể nhân bản; từ điển đủ các cột CSV, phương pháp ghép cặp, mẫu xin quyền nguồn chưa gửi, storyboard 90 giây và khai báo AI trống.
- `public/field-kit/usability.csv`: chỉ tiêu đề, mỗi dòng tương lai là một lượt nhiệm vụ/điều kiện.
- `public/field-kit/interviews.csv`: chỉ tiêu đề, mỗi dòng tương lai là một người đồng ý tham gia.

Đường dẫn truy cập: `/field-kit/` trên Sites, `/mua-ca-phe/field-kit/` trên GitHub Pages. Liên kết tương đối và font `../fonts/` giữ đúng cả hai gốc; không có API, biểu mẫu gửi dữ liệu hay JavaScript. Người dùng in bằng trình duyệt hoặc tải Markdown/CSV. Không tải phiếu chứa thông tin nhận diện lên kho mã hoặc hosting công khai.

## Quy tắc phân tích

Phỏng vấn trước khi giới thiệu nguyên mẫu; hỏi cả ưu điểm nguồn cũ, lý do không dùng và sự kiện bác bỏ giả định. Phân biệt ước lượng nhớ lại với thời gian đo.

Thử A (nguồn hiện tại do người dùng chọn) và B (prototype) với cùng người; xen kẽ A-B/B-A trong từng vai trò, dùng hai bộ tình huống tương đương và ghi phân công thực tế. Nhiệm vụ bao gồm giá/ngày nguồn, cảnh báo và hiểu trạng thái/giới hạn dự báo. Chốt tiêu chí/giới hạn trước khi đo. Nguồn A không có tính năng thì ghi unsupported, không gán thất bại để làm đẹp kết quả B.

Tỷ lệ hoàn thành giữ cả lượt đã bắt đầu nhưng thất bại/hết giờ/dừng trong mẫu số. Điểm hiểu đúng báo n/N lượt thực sự chấm, kèm số thiếu/trợ giúp. Thời gian chỉ so trên cặp cùng nhiệm vụ hoàn thành không trợ giúp, đủ dữ liệu, không sự cố và tình huống tương đương; báo số loại và lý do. Tính trung vị chênh lệch từng cặp, không lấy chênh hai trung vị để thay thế. Không suy tốc độ bài thử thành lợi nhuận, tác động nhân quả hoặc đại diện thị trường.

## Việc còn cần nhóm thực hiện

Tuyển và thử người thật; chọn ngày xóa và người giữ bản gốc; hoàn thiện/xin phép nguồn qua kênh phù hợp; lưu bằng chứng chấp thuận; đối chiếu quy định cuộc thi; điền khai báo AI; quay demo với số liệu đã xác nhận. Bản nháp xin quyền chưa được gửi. Checklist và số liệu đều để trống đến khi có bằng chứng.

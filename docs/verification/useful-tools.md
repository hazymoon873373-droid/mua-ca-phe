# Kiểm tra công cụ lô hàng ngày 10/11/2026

- Theo yêu cầu, gỡ màn hình kiểm định Prophet/XGBoost khỏi luồng chính và đổi điều hướng sang tính lô hàng. Pipeline, API và kết quả mô hình thật giữ nguyên, thông tin ngắn trong mục nguồn.
- Kiểm tra JavaScript29/29; typecheck;13nhóm browser hồi quy và8nhóm mới: tiền bán/thu mua, kg/tấn, so giá4vùng, giá tự nhập/tham khảo, đóng băng bản lưu, xóa/hoàn tác, CSV thực, đầu vào lỗi,4viewport, quota lưu, dữ liệu hỏng và bản lưu thay đổi ở tab khác.
- CSV dùng helper chung, bảo vệ công thức trong ghi chú kể cả khoảng trắng đầu, giữ số tiền là số. Không đưa ghi chú lên server. Sổ cục bộ tối đa50lô; thông báo rõ không đồng bộ thiết bị.
- Các trường form bị vô hiệu hóa trong lúc khởi tạo để tránh mất thao tác trước khi hydration xong. Không tự ghi đè bản lưu hỏng hoặc bản vừa đổi ở tab khác; dữ liệu trong phiên có thể tải CSV.
- Review độc lập về tính toán, giới hạn số, nguồn giá, lưu trữ, accessibility và tích hợp: không có lỗi cần chặn phát hành. Trình duyệt thực và screenshot360/1440 đã được xem; Hallmark0FAIL/6WARN/1WAIVED (các chú thích và bảng tháng có cuộn ngang, cột năm ghim).
- Không huấn luyện lại mô hình ở thay đổi này; không cung cấp dự báo hiện tại hoặc cam kết giá, hóa đơn, lợi nhuận hay tư vấn giao dịch.

Build và xuất bản theo bằng chứng native Sites của commit đi kèm, sau các kiểm tra trên.

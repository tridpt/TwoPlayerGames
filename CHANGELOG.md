# Changelog

Tất cả thay đổi đáng chú ý của dự án sẽ được ghi lại ở đây.

Định dạng theo [Keep a Changelog](https://keepachangelog.com/vi/1.0.0/),
và dự án tuân theo [Semantic Versioning](https://semver.org/lang/vi/).

## [Chưa phát hành]

### Đã thêm
- Vẽ & Đoán: chơi chung máy hoặc online qua 5 vòng, vẽ bằng chuột/cảm ứng,
  chấm từ Việt/Anh, và khôi phục đáp án riêng cùng bảng vẽ khi kết nối lại.

### Đã sửa
- Giới hạn file HTTP công khai vào tài nguyên giao diện; không phục vụ dữ liệu tài khoản
  hoặc mã nguồn server.
- Bỏ qua tin WebSocket JSON sai dạng để một client không thể làm dừng server.
- Server tự kiểm tra nước đi và kết quả ELO cho Cờ Caro 3x3 và Xếp 4; không nhận
  báo cáo kết quả và số ván do client tự khai. Phòng game khác là chơi thường.
- Khôi phục trạng thái xếp hạng sau khi kết nối lại; hiển thị đúng thắng/thua cho
  từng người chơi ở màn kết thúc.
- Nhận diện thắng đường chéo khi chấm ELO Cờ Caro 3x3.
- Giữ chỗ của người chơi mất mạng và cho phép cả hai kết nối lại trong thời gian
  ân hạn; ẩn phòng đang chờ kết nối lại khỏi danh sách phòng trống.
- Xử lý gói WebSocket quá lớn, trường dữ liệu sai kiểu và lỗi lưu tài khoản mà
  không làm dừng máy chủ; phòng chơi thường vẫn hoạt động khi lưu tài khoản lỗi.
- Cho phép đăng ký các tên người dùng hợp lệ trùng tên thuộc tính JavaScript.
- Dừng đồng hồ và hoạt ảnh khi rời Nối Từ, Bulls and Cows, Pig, Memory và
  Yahtzee; tạm dừng đồng hồ Nối Từ khi xem hướng dẫn ở chế độ chung máy.
- Giữ trạng thái riêng của 5 trò bí mật khi tải lại hoặc kết nối lại giữa ván,
  gồm hạm đội, mìn, vị trí tàu ngầm, danh tính sát thủ và bẫy; dọn instance
  cũ khi bắt đầu ván mới.
- Hủy các lượt AI, chuyển vòng và hiệu ứng còn chờ khi rời hoặc chơi lại;
  ngăn lượt AI của ván cũ tác động lên ván mới.
- Sửa lượt mở màn cho các trò online khi ghế phòng thứ hai được chọn đi trước;
  chặn nước đi sai dữ liệu ở Pentago.

### Đã thay đổi
- Giao diện chuyển sang tông "Cozy Warm" (gỗ & giấy): mặc định là nền gỗ espresso
  ấm với chữ kem sáng, thay cho tông tím than trước đây.
- Nút đổi giao diện (🌙) chuyển giữa "gỗ tối" và "giấy sáng"; khu vực chơi game
  luôn giữ nền gỗ tối để chữ trên bàn cờ dễ đọc ở cả hai chế độ.
- Font tiêu đề đổi sang serif "Fraunces", chữ thân dùng "Nunito Sans".
- Bảng màu nhấn đổi sang tông đất: terracotta, teal cổ, mù tạt, olive.
- Đồng bộ tông màu cho toàn bộ bàn cờ của các game (nền gỗ ấm thay cho navy tối).
- Cập nhật swatch của preset màu mặc định cho khớp tông gỗ mới.

## [1.1.0]

- Bộ 76 trò chơi 2 người: chơi chung máy, đấu với máy (AI), hoặc online qua mã phòng.

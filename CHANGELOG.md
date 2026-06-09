# Changelog

Tất cả thay đổi đáng chú ý của dự án được ghi ở đây. Định dạng theo tinh thần
[Keep a Changelog](https://keepachangelog.com/), phiên bản theo [SemVer](https://semver.org/).

## [Unreleased]

### Added — Đã thêm
- **Emoji reactions trong phòng online**: bấm emote để gửi cảm xúc bay nổi thoáng qua trên màn cả hai
  (kênh `react` qua WebSocket, có rate-limit). Test tích hợp trong `tests/chat-it.js`.
- **Song ngữ Việt / Anh hoàn chỉnh**: ngoài khung giao diện và tên/mô tả/hướng dẫn 47 game,
  nay dịch cả **trạng thái khi đang chơi** của từng game (thông báo lượt, nhãn HUD, nút trong game,
  nhật ký/log, chú giải). Dùng helper `ctx.t(vi, en)`.
- **Test bảo vệ i18n** (`tests/i18n-runtime.test.js`): nạp từng game ở chế độ tiếng Anh, render
  rồi quét output — báo lỗi nếu còn sót chữ Việt. Phủ cả 47 game.
- **Phòng công khai**: danh sách phòng đang mở (kèm tên chủ phòng), tự làm mới, nút "Vào chơi"
  một chạm; ẩn phòng riêng và phòng đã đủ người. Test tích hợp `tests/publicrooms-it.js`.
- **Tự kết nối lại (reconnect)**: rớt mạng giữa ván vẫn giữ phòng trong **45 giây** nhờ token phiên,
  khi vào lại được **phát lại lịch sử nước đi**; báo trạng thái "đối thủ mất kết nối / đã kết nối lại".
  Test tích hợp `tests/reconnect-it.js`.
- **Test tích hợp chat** (`tests/chat-it.js`): xác minh chat chỉ relay đúng đối thủ, cắt 200 ký tự, không lọt ra ngoài phòng.
- **CHANGELOG.md** này.

### Changed — Đã đổi
- `npm test` nay chạy thêm: quét i18n runtime (47 game), test reconnect, phòng công khai và chat
  (tổng 83 unit test + 3 test tích hợp online + smoke test).

### Fixed — Đã sửa
- **UX điều hướng**: cuộn lên đầu trang khi đổi màn / bấm "Về danh sách" để không bị kẹt ở vị trí cuộn cũ.
- **Trang Hồ sơ**: `openProfile` được bọc chống lỗi — chip 🎮 luôn mở được trang Hồ sơ dù một widget con
  (bảng xếp hạng / biểu đồ / lịch sử) gặp lỗi dữ liệu.
- **Yêu thích / Chơi gần đây** cập nhật ngay sau khi bấm ♥ hoặc sau khi chơi, không cần tải lại trang.

---

> Các phiên bản trước đó (xây dựng 47 game, 3 chế độ chơi gồm AI, PWA, hồ sơ/thành tích,
> daily challenge, chat online, replay, xuất/nhập dữ liệu, accessibility...) chưa được ghi
> tách bạch ở đây; xem `README.md` để biết đầy đủ tính năng hiện có.

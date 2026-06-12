# Changelog

Tất cả thay đổi đáng chú ý của dự án được ghi ở đây. Định dạng theo tinh thần
[Keep a Changelog](https://keepachangelog.com/), phiên bản theo [SemVer](https://semver.org/).

## [Unreleased]

### Added — Đã thêm
- **Mở rộng từ 47 lên 62 trò chơi** với 15 game mới:
  - **Đối kháng theo lượt / online** (qua relay, đồng bộ tất định từ seed chung): **Rắn & Thang** (🪜),
    **Cá Ngựa Nói Dối** (🎲 bịp bợm), **Phá Mã Đối Kháng** (🧩 Mastermind suy luận),
    **Xì Dách Đối Kháng** (🃏 21 điểm), **20 Câu Hỏi** (❓ đoán vật qua Có/Không),
    **Ghép Từ Đối Kháng** (🔤 đua vốn từ tiếng Việt, dùng từ điển `VI_DICT` làm trọng tài),
    **Chọn Số Né Nhau** (🔢), **Tù Nhân Song Đề** (⚖️ hợp tác/phản bội kiểu Con Gà),
    **Oẳn Tù Tì Nâng Cao** (✊ có chiêu Đại bác), **Cờ Tỷ Phú** (🎩 Monopoly rút gọn), **Lan Màu** (🎨 chiếm vùng kiểu Filler).
  - **Game phản xạ / nhanh tay (chung máy)**: **Đua Bấm Nút** (⚡ đếm ngược + kỷ lục phản xạ),
    **Đua Né Chướng Ngại** (🏃 particle va chạm + tốc độ tăng dần), **Kéo Co Bằng Phím** (🪢), **Đua Gõ Phím** (⌨️ gõ từ tiếng Việt).
  - Mỗi game đều có i18n VI/EN đầy đủ, AI (nếu phù hợp) và CSS riêng làm kỹ.
- **Ghép Từ Đối Kháng — chiều sâu chiến thuật**: điểm theo độ hiếm âm tiết, ô nhân điểm ×2/×3,
  thưởng từ dài, combo chuỗi 🔥, đổi kho khi bí, nút gợi ý, đồng hồ mỗi lượt và chế độ giới hạn lượt.
  Kho luôn được đảm bảo có ít nhất một cặp ghép được (`ensurePlayable`).
- **Test đồng bộ online** (`tests/online-sync-it.js`): mô phỏng 2 client cho các game online,
  xác minh nước đi relay sang đối thủ giữ nguyên payload.
- **Lá chắn chất lượng**: test toàn vẹn metadata/i18n-key/DOM-id (`integrity`), phủ build+AI cho mọi
  game (`games-coverage`), test luồng xem lại ván (`replay`), quét chuỗi Việt hardcode (`i18n-source-guard`).
- **PWA**: nút "Cài app" (beforeinstallprompt) + trang `offline.html`. **SEO**: `robots.txt`, `sitemap.xml`, canonical/OG.
- **Sẵn sàng deploy GitHub Pages**: thêm `.nojekyll` + hướng dẫn deploy trong README (tĩnh = chơi chung máy/AI; host Node = có online).
- **Emoji reactions trong phòng online**: bấm emote để gửi cảm xúc bay nổi thoáng qua trên màn cả hai
  (kênh `react` qua WebSocket, có rate-limit) kèm **tiếng "pop" nhẹ**. Test tích hợp trong `tests/chat-it.js`.
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
- **Responsive ≤480px**: bố cục lại header (chip hồ sơ + 3 nút toggle + logo) không còn chồng nhau;
  tăng vùng chạm cho nút ♥ yêu thích và nút emote chat trên điện thoại.
- **UX điều hướng**: cuộn lên đầu trang khi đổi màn / bấm "Về danh sách" để không bị kẹt ở vị trí cuộn cũ.
- **Trang Hồ sơ**: `openProfile` được bọc chống lỗi — chip 🎮 luôn mở được trang Hồ sơ dù một widget con
  (bảng xếp hạng / biểu đồ / lịch sử) gặp lỗi dữ liệu.
- **Yêu thích / Chơi gần đây** cập nhật ngay sau khi bấm ♥ hoặc sau khi chơi, không cần tải lại trang.

---

> Các phiên bản trước đó (xây dựng 47 game, 3 chế độ chơi gồm AI, PWA, hồ sơ/thành tích,
> daily challenge, chat online, replay, xuất/nhập dữ liệu, accessibility...) chưa được ghi
> tách bạch ở đây; xem `README.md` để biết đầy đủ tính năng hiện có.

# Changelog

Tất cả thay đổi đáng chú ý của dự án được ghi ở đây. Định dạng theo tinh thần
[Keep a Changelog](https://keepachangelog.com/), phiên bản theo [SemVer](https://semver.org/).

## [1.1.0] - 2026-06-26

### Added — Đã thêm
- **2 game mới (nâng tổng lên 76 trò chơi)**: **♟️ Cờ Đột Phá (Breakthrough)** — cờ đua quân tinh gọn, chỉ ăn theo đường chéo; và **🔴 Cờ Gánh** — cờ dân gian Việt Nam (Đà Nẵng) trên bàn 5×5 với cơ chế "gánh" (đi vào giữa 2 quân địch để lật) và "vây". Cả hai đều có AI 3 mức, chơi online tất định, i18n VI/EN và CSS riêng.
- **Phòng riêng tư có mật khẩu**: khi tạo phòng online có thể đặt mật khẩu tùy chọn; người vào phải nhập đúng mới được join (so khớp an toàn theo thời gian, mật khẩu băm SHA-256 + salt phía server, không lưu thô). Phòng công khai có khóa hiện icon 🔒 và hỏi mật khẩu khi vào nhanh. Test tích hợp `tests/password-it.js`.
- **Lưu replay ván để xem lại sau**: mỗi ván chơi xong được lưu trọn chuỗi nước đi (seed + options + moves) vào `localStorage` (`tpg_replays`, giữ 20 ván gần nhất). Trong trang Hồ sơ, mỗi mục lịch sử có nút **▶ Xem lại** để phát lại đúng ván đó — không chỉ giới hạn trong phiên đang chơi như trước. Logic tách thành module `ReplayStore` có unit test.
- **Chat phòng online phong phú hơn**: thêm 3 câu nhắn nhanh và 6 emoji reaction mới.

### Security — Bảo mật
- **Content-Security-Policy + Permissions-Policy** cho static server (script-src 'self', whitelist Google Fonts, connect-src cho WebSocket...). Tách script đăng ký service worker ra file riêng để CSP không cần `unsafe-inline`.

### Changed — Đã đổi
- **Accessibility**: cơ chế `data-i18n-aria` cho aria-label song ngữ, gắn tên truy cập cho các ô nhập còn thiếu, `aria-live`/`role` cho trạng thái và lỗi ở sảnh online.
- **SEO/chia sẻ**: canonical/OG/sitemap trỏ về URL bản live (Render), ảnh OG dùng đường dẫn tuyệt đối; README thêm badge **▶ Chơi ngay**.
- **Kiểm thử & CI**: phủ test AI động cho mọi game hỗ trợ AI (7 → 37), đưa self-play soak vào CI để bắt treo/lỗi luật; tổng cộng 217 unit test + 7 bộ test tích hợp online. Đồng bộ tài liệu (số game 68 → 76, yêu cầu Node 20+).

## [1.0.0] - 2026-06-13

### Added — Đã thêm
- **Mở rộng từ 47 lên 68 trò chơi** với 21 game mới (gồm **💣 Gỡ Bom Song Phương** — co-op bất đối xứng kiểu *Keep Talking*):
  - **Đối kháng theo lượt / online** (qua relay, đồng bộ tất định từ seed chung): **Rắn & Thang** (🪜),
    **Cá Ngựa Nói Dối** (🎲 bịp bợm), **Phá Mã Đối Kháng** (🧩 Mastermind suy luận),
    **Xì Dách Đối Kháng** (🃏 21 điểm), **20 Câu Hỏi** (❓ đoán vật qua Có/Không),
    **Ghép Từ Đối Kháng** (🔤 đua vốn từ tiếng Việt, dùng từ điển `VI_DICT` làm trọng tài),
    **Chọn Số Né Nhau** (🔢), **Tù Nhân Song Đề** (⚖️ hợp tác/phản bội kiểu Con Gà),
    **Oẳn Tù Tì Nâng Cao** (✊ có chiêu Đại bác), **Cờ Tỷ Phú** (🎩 Monopoly rút gọn), **Lan Màu** (🎨 chiếm vùng kiểu Filler).
  - **Game phản xạ / nhanh tay**: **Đua Bấm Nút** (⚡ đếm ngược + kỷ lục phản xạ),
    **Đua Né Chướng Ngại** (🏃 particle va chạm + tốc độ tăng dần), **Kéo Co Bằng Phím** (🪢), **Đua Gõ Phím** (⌨️ gõ từ tiếng Việt).
  - **Cờ trí tuệ mới**: **Tam Giác Cấm** (🔺 Sim — không bao giờ hòa), **Cờ Vua Mini 5×5** (♟️ Gardner, AI minimax), **Mầm Cây** (🌱 Sprouts).
  - **Co-op (hai người cùng phe)**: **Đẩy Thùng Đôi** (📦 Sokoban co-op, robot kho hàng), **Mê Cung Hợp Sức** (🗝️ nút sàn + cần gạt). Màn chơi đều được kiểm chứng giải được bằng BFS.
  - Mỗi game đều có i18n VI/EN đầy đủ, AI (nếu phù hợp) và CSS riêng làm kỹ.
- **Hỗ trợ online cho game phản xạ**: **Đua Gõ Phím** và **Đua Bấm Nút** nay chơi online được —
  relay tiến độ/kết quả, đo cục bộ nên độ trễ mạng không ảnh hưởng ai nhanh hơn.
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
- **Đợt nâng cấp giao diện sâu** cho nhiều game: **Cờ Vua Mini** (quân viền nét, highlight chiếu/nước đi),
  **Tic-Tac-Toe** (X/O vẽ nét SVG), **Connect Four** (quân bóng), **Reversi** (đồng xu 2 mặt lật xoay đổi màu, lan sóng),
  **Pig / Yahtzee** (xúc xắc lăn nhào 3D trên bàn nỉ), **Mancala** (bàn gỗ khắc sâu), **Bốc Sỏi** (đá bóng),
  **Domino** (quân ngà bevel, pip khắc), **Memory** (mặt lưng hoa văn, ghép đúng phát sáng),
  **Hangman** (người treo cổ vẽ nét SVG hiện dần), **Nối Từ** (chuỗi chip nối mũi tên), **Đoán Số** (ô số + peg màu),
  **Submarine Hunt** (hiệu ứng dưới nước: tia sáng, bọt khí, radar quét, sóng sonar, tàu ngầm chi tiết). Đều tôn trọng `prefers-reduced-motion`.
- **Nối Từ**: bỏ cơ chế "Phản đối" + phạt giờ; nay **chấm từ điển ngay khi nhập** — từ không có trong từ điển thì báo lỗi cho nhập lại (không phạt).
- **Cờ Quân Úp (Stratego)**: bàn gọn còn **10×8** (giữ nguyên 20 quân mỗi bên); ô xanh **chỉ đánh dấu nước đi gần nhất** thay vì mọi quân đã đi.
- `npm test` nay chạy **169 unit test + 4 bộ test tích hợp online** (online-sync / reconnect / publicrooms / chat) + smoke test.

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

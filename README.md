# 🎮 Game 2 Người

Bộ trò chơi đối kháng cho 2 người chơi, hỗ trợ **chơi chung một máy** (hot-seat) hoặc **chơi online qua mạng** bằng mã phòng. Viết bằng HTML/CSS/JavaScript thuần ở phía client, server Node.js nhỏ gọn lo phần phục vụ web và relay nước đi qua WebSocket.

## ✨ Tính năng

- **46 trò chơi** trong cùng một ứng dụng
- **2 chế độ chơi**: chung máy hoặc online (2 máy khác nhau)
- **Phòng online bằng mã 4 chữ số** — tạo phòng, gửi mã, vào chơi
- **Khung chat** trong phòng online kèm các câu nhắn nhanh
- **Âm thanh** cho nước đi, thắng/thua và thông báo khi đối thủ chat (có nút bật/tắt 🔊)
- **Tùy chỉnh ván chơi** cho một số game (kích thước bàn, số quân thắng, tốc độ...) — đồng bộ giữa 2 máy khi chơi online
- **Hướng dẫn chơi** riêng cho từng game (nút ❓)
- **Bảng điểm** tích lũy qua nhiều ván
- Giao diện responsive, chơi được trên điện thoại

## 🕹️ Danh sách game

| Game | Chế độ | Mô tả |
|------|--------|-------|
| Cờ Caro 3x3 | Chung máy, online | Xếp 3 ký hiệu thẳng hàng (ngang, dọc, chéo) để chiến thắng. |
| Xếp 4 (Connect Four) | Chung máy, online | Thả quân xuống cột, ai nối được 4 quân thẳng hàng trước sẽ thắng. |
| Cờ Lật (Reversi) | Chung máy, online | Kẹp quân đối thủ để lật thành quân mình. Ai nhiều quân hơn khi hết bàn sẽ thắng. |
| Lật Hình Tìm Cặp | Chung máy, online | Lật tìm các cặp hình giống nhau. Ai tìm được nhiều cặp hơn sẽ thắng. |
| Cờ Caro 15×15 | Chung máy, online | Cờ caro cỡ lớn: nối được 5 quân liên tiếp (ngang, dọc, chéo) là thắng. |
| Nối Ô (Dots & Boxes) | Chung máy, online | Nối các cạnh giữa chấm. Hoàn thành một ô vuông thì chiếm ô đó và được đi tiếp. |
| Caro Tối Thượng | Chung máy, online | 9 bàn caro lồng nhau. Ô bạn đánh ép đối thủ phải đánh ở bàn tương ứng. Cực kỳ đấu trí! |
| Bốc Sỏi (Nim) | Chung máy, online | Cờ trí tuệ kinh điển: bốc sỏi từ các hàng, ai bốc viên cuối cùng sẽ thắng. |
| Hex | Chung máy, online | Cờ kết nối trên lưới lục giác. Tạo một đường quân nối hai cạnh đối diện của mình. |
| Mancala (Ô Ăn Quan) | Chung máy, online | Gieo sỏi vòng quanh các hốc, bắt sỏi đối thủ. Ai gom nhiều sỏi về kho hơn sẽ thắng. |
| Order & Chaos | Chung máy, online | Biến thể caro độc đáo: cả hai cùng đặt X/O, nhưng hai người có mục tiêu trái ngược nhau. |
| Cờ Đam (Checkers) | Chung máy, online | Cờ ăn quân nhảy chéo kinh điển. Bắt hết quân đối thủ hoặc chặn không cho đi sẽ thắng. |
| Cờ Cô Lập | Chung máy, online | Di chuyển quân rồi khóa ô vừa rời. Ai làm đối thủ hết đường đi trước sẽ thắng. |
| Laser Chess | Chung máy, online | Xoay gương để phản xạ tia laser. Bắn trúng lõi đối thủ là thắng. |
| Mê Cung Ghép Đường | Chung máy, online | Đặt tile đường, xoay tile và khóa ô để nối tuyến của mình trước khi đối thủ phá. |
| Pong | Chỉ chung máy | Game phản xạ thời gian thực: điều khiển vợt đỡ bóng. Ai đạt 5 điểm trước sẽ thắng. |
| Pool Battle | Chung máy, online | Bi-a đối kháng mini: chọc bi theo lượt, ăn điểm qua hố và dùng bóng nổ, nam châm, đổi trọng lực. |
| Slingshot Battle | Chung máy, online | Kéo thả để bắn đá hoặc phép qua chướng ngại, tính gió, bật tường và nổ gây sát thương. |
| Time Loop Duel | Chung máy, online | Lập trình chuỗi hành động, replay đồng thời và dùng bóng ma các vòng trước để phá lõi đối thủ. |
| Thủ Thành Hợp Tác | Chung máy, online | Hai người cùng thủ đường: chọn nhiều map, mua nhiều loại súng, chặn nhiều loại quái và vẫn xây được khi wave đang chạy. |
| Base Defense Duel | Chung máy, online | Vừa thủ nhà bằng tháp, vừa gửi nhiều loại lính sang phá nhà đối thủ. Vàng và sức lính tăng dần theo thời gian. |
| Robot Factory War | Chung máy, online | Hai bên xây dây chuyền, ghép module đầu-thân-vũ khí-chân để robot tự động ra lane đánh nhau. |
| Dungeon Rival | Chung máy, online | Hai người đi dungeon riêng, nhặt đồ, lên cấp và dùng bóng tối gửi quái hoặc bẫy sang phá đối thủ. |
| Bắn Tàu (Battleship) | Chỉ online | Giấu hạm đội và bắn tọa độ vào bàn đối thủ. Ai bắn chìm hết tàu địch trước sẽ thắng. |
| Sea Battle Nâng Cấp | Chỉ online | Battleship online có radar 3x3, mìn ẩn, torpedo và các tàu đặc biệt như tàu ngầm, trinh sát, thiết giáp. |
| Submarine Hunt | Chỉ online | Một bên lái tàu ngầm ẩn, bên kia săn bằng sonar, drone dò âm và mìn sâu. |
| Hidden Assassin | Chỉ online | Suy luận sát thủ trong đám đông với theo dõi, hồ sơ, mồi nhử, cải trang, bẫy và tố cáo rủi ro. |
| Trap Mansion | Chỉ online | Hai người dò đường trong biệt thự ẩn phòng, tự thấy bẫy của mình nhưng không thấy bẫy đối thủ. |
| Pentago | Chung máy, online | Đặt bi rồi xoay một góc bàn 90°. Tạo 5 bi thẳng hàng để thắng — xoay khéo để vừa công vừa thủ. |
| Cờ Ba Quân (Morris) | Chung máy, online | Đặt 3 quân rồi di chuyển chúng để xếp thành hàng. Cờ caro phiên bản có di chuyển. |
| Bắn Tăng (Artillery) | Chung máy, online | Chỉnh góc và lực bắn, tính cả sức gió, để nã trúng xe tăng đối thủ. Theo lượt, chơi cả online. |
| Tank Arena Theo Lượt | Chung máy, online | Đấu xe tăng trên map lưới có tường, thùng vật phẩm, mìn, rocket và điểm hành động theo lượt. |
| Dice Battle | Chung máy, online | Điều khiển đội quân xúc xắc trên lưới. Di chuyển, chiếm ô năng lượng và đánh nhau bằng roll. |
| Territory War | Chung máy, online | Mở rộng lãnh thổ, xây tường phòng thủ và tấn công vùng đối thủ trên bản đồ chiến thuật. |
| Crystal Conquest | Chung máy, online | Điều khiển pháp sư chiếm tinh thể để tạo mana, rồi cast sét, khiên, dịch chuyển và đóng băng. |
| Dò Mìn Đối Kháng | Chung máy, online | Chung một bãi mìn, thay nhau lật ô. Trúng mìn được ghi điểm và đi tiếp. Ai nhiều mìn hơn thắng. |
| Đoán Số (Bulls & Cows) | Chung máy, online | Đặt dãy số bí mật, thay nhau đoán dãy của đối thủ. Ai đoán đúng trước sẽ thắng. |
| Cờ Quân Úp (Stratego) | Chung máy, online | Stratego gọn: bàn 10x10 rộng, mỗi bên 2 hàng quân úp, bắt Cờ đối thủ để thắng. |
| Quoridor (Đặt Tường) | Chung máy, online | Đua quân sang bờ đối diện, đặt tường chặn đường đối thủ. Cờ chiến thuật chiều sâu lớn. |
| Auction War | Chung máy, online | Đấu giá kín tài sản, bluff giá, quản lý tiền và ăn bonus bộ sưu tập. Trả quá tay là mua hớ. |
| Pig (Heo Cờ Xúc Xắc) | Chung máy, online | Gieo xúc xắc cộng dồn điểm, nhưng ra 1 là chuyển hết điểm tạm cho đối thủ. Biết dừng đúng lúc để thắng. |
| Yahtzee | Chung máy, online | Gieo 5 xúc xắc, ghi điểm theo 13 tổ hợp (cù lũ, sảnh, Yahtzee...). Ai tổng điểm cao hơn thắng. |
| Domino (Đô-mi-nô) | Chung máy, online | Nối các quân domino khớp số chấm ở hai đầu. Hết quân trước sẽ thắng. |
| Nối Từ | Chung máy, online | Nối từ ghép 2 tiếng theo tiếng cuối của từ trước. Hết giờ hoặc bí thì thua. |
| Đoán Chữ (Hangman) | Chung máy, online | Một người ra từ bí mật, người kia đoán từng chữ cái. Sai quá 6 lần là thua. |
| Trộm Kho Báu | Chung máy, online | Giấu kho báu trên lưới, đào tìm kho báu đối thủ theo gợi ý nóng/lạnh. Ai tìm thấy trước thì thắng. |

## 🚀 Cách chạy

Yêu cầu: [Node.js](https://nodejs.org/) 18 trở lên.

```bash
# 1. Cài thư viện
npm install

# 2. Chạy server
npm start

# 3. Mở trình duyệt
# http://localhost:8777
```

### Kiểm tra nhanh

```bash
npm test
```

Lệnh này kiểm tra cú pháp JS, đối chiếu `index.html` với các file trong `js/games/`,
load registry đủ game, kiểm tra nhóm game trong menu, rồi chạy smoke test HTTP +
WebSocket tạo/vào phòng.

### Chơi online cùng mạng LAN

Người chơi thứ hai mở `http://<IP-máy-chủ>:8777` (ví dụ `http://192.168.1.10:8777`),
một người **Tạo phòng** rồi gửi mã 4 chữ số, người kia **Vào phòng** bằng mã đó.

> Muốn chơi qua Internet (khác mạng) thì cần expose server ra ngoài, ví dụ bằng [ngrok](https://ngrok.com/).

## 📁 Cấu trúc dự án

```
TwoPlayerGames/
├── index.html          # Trang chính + menu + sảnh online + khung chat
├── styles.css          # Toàn bộ giao diện
├── server.js           # Server Node: phục vụ web + WebSocket relay
├── package.json
├── scripts/
│   └── smoke-test.js   # Kiểm tra nhanh cú pháp, registry, HTTP và WebSocket
└── js/
    ├── registry.js     # Registry game + RNG có hạt giống (nạp đầu tiên)
    ├── net.js          # Client WebSocket cho chế độ online
    ├── main.js         # Khung điều khiển: menu, chế độ, vòng chơi, chat
    └── games/          # Mỗi file là một game tự đăng ký vào registry
        ├── tictactoe.js
        ├── connectfour.js
        ├── ...
        └── treasure.js
```

## ➕ Thêm game mới

Tạo một file trong `js/games/`, gọi `window.GameRegistry.register({...})` với một
hàm `create(ctx)` trả về `{ applyMove }`, rồi thêm một thẻ `<script>` vào `index.html`.
Không cần sửa code cũ.

## 📡 Giao thức online (tóm tắt)

Client ↔ server trao đổi message JSON qua WebSocket: `create`, `join`, `start`,
`move`, `restart`, `chat`, `leave`. Các game được thiết kế tất định (dùng RNG có
hạt giống chung) nên hai máy luôn đồng bộ trạng thái.

## ⚠️ Lưu ý

Server không có xác thực — ai có mã phòng đều vào được. Chỉ nên chạy cục bộ hoặc
trong mạng tin cậy, đừng mở công khai ra Internet lâu dài mà chưa thêm lớp bảo vệ.

## 📄 Giấy phép

MIT

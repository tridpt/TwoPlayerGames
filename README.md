# 🎮 Game 2 Người

Bộ trò chơi đối kháng cho 2 người chơi, hỗ trợ **chơi chung một máy** (hot-seat) hoặc **chơi online qua mạng** bằng mã phòng. Viết bằng HTML/CSS/JavaScript thuần ở phía client, server Node.js nhỏ gọn lo phần phục vụ web và relay nước đi qua WebSocket.

## ✨ Tính năng

- **11 trò chơi** trong cùng một ứng dụng
- **2 chế độ chơi**: chung máy hoặc online (2 máy khác nhau)
- **Phòng online bằng mã 4 chữ số** — tạo phòng, gửi mã, vào chơi
- **Khung chat** trong phòng online kèm các câu nhắn nhanh
- **Hướng dẫn chơi** riêng cho từng game (nút ❓)
- **Bảng điểm** tích lũy qua nhiều ván
- Giao diện responsive, chơi được trên điện thoại

## 🕹️ Danh sách game

| Game | Mô tả |
|------|-------|
| ❌ Cờ Caro 3×3 | Xếp 3 ký hiệu thẳng hàng |
| 🔴 Xếp 4 (Connect Four) | Thả quân, nối 4 quân cùng màu |
| ⚫ Cờ Lật (Reversi) | Kẹp quân đối thủ để lật, nhiều quân hơn thì thắng |
| 🧠 Lật Hình Tìm Cặp | Tìm các cặp hình giống nhau |
| ⚪ Cờ Caro 15×15 (Gomoku) | Nối 5 quân liên tiếp |
| 🔲 Nối Ô (Dots & Boxes) | Hoàn thành ô vuông để chiếm và đi tiếp |
| 🎯 Caro Tối Thượng | 9 bàn caro lồng nhau, cực kỳ đấu trí |
| 🪨 Bốc Sỏi (Nim) | Bốc sỏi từ các hàng, ai bốc viên cuối cùng thắng |
| ⬡ Hex | Cờ kết nối trên lưới lục giác, không bao giờ hòa |
| 🫘 Mancala (Ô Ăn Quan) | Gieo sỏi vòng quanh, bắt sỏi đối thủ, gom nhiều về kho hơn thì thắng |
| 🔀 Order & Chaos | Cả hai cùng đặt X/O nhưng mục tiêu trái ngược nhau |

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
└── js/
    ├── registry.js     # Registry game + RNG có hạt giống (nạp đầu tiên)
    ├── net.js          # Client WebSocket cho chế độ online
    ├── main.js         # Khung điều khiển: menu, chế độ, vòng chơi, chat
    └── games/          # Mỗi file là một game tự đăng ký vào registry
        ├── tictactoe.js
        ├── connectfour.js
        ├── reversi.js
        ├── memory.js
        ├── gomoku.js
        ├── dotsandboxes.js
        ├── ultimate.js
        ├── nim.js
        ├── hex.js
        ├── mancala.js
        └── orderchaos.js
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

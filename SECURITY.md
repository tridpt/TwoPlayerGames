# Chính sách bảo mật / Security Policy

## Phạm vi / Scope

Đây là bộ trò chơi 2 người chạy phía client (HTML/CSS/JS) kèm server Node cho chế độ
online. Tài khoản có xác thực riêng cho đồng bộ dữ liệu và ELO; phòng chơi vẫn
vào được bằng mã phòng hoặc mật khẩu phòng nếu chủ phòng đặt mật khẩu.
Chỉ các tệp giao diện được phục vụ qua HTTP; thư mục `data/` không được công khai.

This is a client-side (HTML/CSS/JS) two-player game suite with a Node server for
online play. Accounts are authenticated for cloud data and ELO; game rooms are
accessible with a room code or a room password when the host sets one. HTTP
serves only browser assets and does not expose the `data/` directory.

## Báo lỗi bảo mật / Reporting a vulnerability

Nếu phát hiện lỗ hổng, vui lòng mở một issue riêng tư (GitHub Security Advisory)
hoặc liên hệ chủ repo. Đừng công khai chi tiết khai thác trước khi có bản vá.

If you find a vulnerability, please open a private report (GitHub Security
Advisory) or contact the repository owner. Do not publicly disclose exploit
details before a fix is available.

## Phiên bản được hỗ trợ / Supported versions

Chỉ nhánh `main` mới nhất được hỗ trợ. Only the latest `main` branch is supported.

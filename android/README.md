# Ứng dụng Android

Đây là ứng dụng Android của Game 2 Người. Mã giao diện, 77 trò chơi và từ điển được đóng gói từ thư mục gốc khi build, nên chơi chung máy và đấu máy không cần mạng. WebView giữ địa chỉ `https://two-player-games-rnu3.onrender.com/`: phòng online, bảng xếp hạng và tài khoản kết nối tới máy chủ Render qua HTTPS/WebSocket khi có Internet. Không cần cấu hình CORS hay đổi địa chỉ API.

## Build và cài trên điện thoại

Yêu cầu JDK 17 và Android SDK Platform 35. Mở **thư mục `android`** bằng Android Studio để chương trình cài Build Tools phù hợp tự động, hoặc chạy:

```powershell
cd android
.\gradlew.bat assembleDebug
```

APK nằm tại `android/app/build/outputs/apk/debug/app-debug.apk`. Cài bằng Android Studio hoặc `adb install -r app/build/outputs/apk/debug/app-debug.apk` sau khi bật USB debugging. Điện thoại cần Android 7.0 (API 24) trở lên và Android System WebView được cập nhật.

Để phát hành, tăng `versionCode` và `versionName` trong `app/build.gradle.kts`, build bản release có chữ ký bằng **Build > Generate Signed Bundle / APK** trong Android Studio. Giữ keystore bên ngoài repository. Bản debug chỉ phù hợp để thử/cài thủ công.

## Cách hoạt động

- Tác vụ `syncWebAssets` lấy trực tiếp `index.html`, CSS, icon, manifest và toàn bộ `js/` từ repository vào APK; mỗi lần sửa giao diện hoặc trò chơi cần build APK mới.
- WebView phục vụ các tệp đó từ APK trên đúng HTTPS origin của máy chủ. API `/api/*` và WebSocket vẫn đi qua mạng. Nếu server Render đang ngủ, lần kết nối online đầu có thể chờ khởi động.
- Nút Back đóng màn/overlay hiện tại. Nhập JSON dùng trình chọn tệp Android; xuất JSON dùng trình lưu tệp Android; chia sẻ mở bảng chia sẻ Android.
- Dữ liệu cá nhân nằm trong vùng lưu trữ riêng của ứng dụng Android, tách khỏi dữ liệu của trình duyệt/PWA. Có thể chuyển dữ liệu bằng chức năng Xuất/Nhập trong Hồ sơ hoặc đăng nhập để đồng bộ.

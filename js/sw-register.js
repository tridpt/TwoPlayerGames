/* Đăng ký service worker (PWA / chạy offline).
   Tách khỏi index.html để Content-Security-Policy có thể dùng script-src 'self'
   mà không cần 'unsafe-inline'. */
// Android đóng gói sẵn toàn bộ tài nguyên và phục vụ từ APK qua cùng HTTPS origin.
// SW của bản web không nên che phiên bản tài nguyên đi kèm APK.
if (!window.AndroidApp && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => { /* offline không khả dụng */ });
  });
}

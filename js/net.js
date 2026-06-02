/* ============================================================
   Net: quản lý kết nối WebSocket cho chế độ chơi online
   ============================================================ */
window.Net = (function () {
  let ws = null;
  const handlers = {};

  function url() {
    const proto = location.protocol === "https:" ? "wss" : "ws";
    return `${proto}://${location.host}`;
  }

  function connect() {
    return new Promise((resolve, reject) => {
      if (ws && ws.readyState === WebSocket.OPEN) return resolve();
      ws = new WebSocket(url());
      ws.onopen = () => resolve();
      ws.onerror = () => reject(new Error("Không kết nối được tới server."));
      ws.onclose = () => emit("disconnected");
      ws.onmessage = (ev) => {
        let msg;
        try { msg = JSON.parse(ev.data); } catch { return; }
        emit(msg.type, msg);
      };
    });
  }

  function emit(type, payload) {
    (handlers[type] || []).forEach((fn) => fn(payload));
  }

  function on(type, fn) {
    (handlers[type] = handlers[type] || []).push(fn);
  }

  function off(type) { delete handlers[type]; }

  function send(type, payload = {}) {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type, ...payload }));
    }
  }

  return { connect, on, off, send, emit };
})();

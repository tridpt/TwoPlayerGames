/* Pong 2 người — chơi chung máy (thời gian thực, dùng bàn phím)
   Người chơi 1: phím W (lên) / S (xuống). Người chơi 2: mũi tên ↑ / ↓.
   Ai đạt 5 điểm trước sẽ thắng. */
(function () {
  const W = 700, H = 420;
  const PADDLE_H = 80, PADDLE_W = 12, BALL = 12;
  const PADDLE_SPEED = 6;
  const WIN_SCORE = 5;

  function create(ctx) {
    const canvas = document.createElement("canvas");
    canvas.width = W; canvas.height = H;
    canvas.className = "pong-canvas";
    ctx.boardEl.appendChild(canvas);
    const g = canvas.getContext("2d");

    let p1y = H / 2 - PADDLE_H / 2;
    let p2y = H / 2 - PADDLE_H / 2;
    let score = [0, 0];
    let over = false;
    let running = false;
    let raf = null;

    const ball = { x: W / 2, y: H / 2, vx: 0, vy: 0 };
    const keys = {};

    function resetBall(dir) {
      ball.x = W / 2; ball.y = H / 2;
      const angle = (Math.random() * 0.5 - 0.25) * Math.PI; // -45..45 độ
      const speed = 5;
      ball.vx = dir * speed * Math.cos(angle);
      ball.vy = speed * Math.sin(angle);
    }

    function onKey(e, down) {
      const k = e.key.toLowerCase();
      if (["w", "s", "arrowup", "arrowdown"].includes(k)) {
        keys[k] = down;
        e.preventDefault();
        if (down && !running && !over) startLoop();
      }
    }
    const kd = (e) => onKey(e, true);
    const ku = (e) => onKey(e, false);
    window.addEventListener("keydown", kd);
    window.addEventListener("keyup", ku);

    function update() {
      // di chuyển vợt
      if (keys["w"]) p1y -= PADDLE_SPEED;
      if (keys["s"]) p1y += PADDLE_SPEED;
      if (keys["arrowup"]) p2y -= PADDLE_SPEED;
      if (keys["arrowdown"]) p2y += PADDLE_SPEED;
      p1y = Math.max(0, Math.min(H - PADDLE_H, p1y));
      p2y = Math.max(0, Math.min(H - PADDLE_H, p2y));

      ball.x += ball.vx;
      ball.y += ball.vy;

      // nảy trên/dưới
      if (ball.y <= 0) { ball.y = 0; ball.vy *= -1; }
      if (ball.y >= H - BALL) { ball.y = H - BALL; ball.vy *= -1; }

      // va vợt trái (P1)
      if (ball.x <= PADDLE_W && ball.y + BALL >= p1y && ball.y <= p1y + PADDLE_H && ball.vx < 0) {
        ball.vx *= -1.06;
        const hit = (ball.y + BALL / 2 - (p1y + PADDLE_H / 2)) / (PADDLE_H / 2);
        ball.vy += hit * 2;
        ball.x = PADDLE_W;
        ctx.sound("place");
      }
      // va vợt phải (P2)
      if (ball.x + BALL >= W - PADDLE_W && ball.y + BALL >= p2y && ball.y <= p2y + PADDLE_H && ball.vx > 0) {
        ball.vx *= -1.06;
        const hit = (ball.y + BALL / 2 - (p2y + PADDLE_H / 2)) / (PADDLE_H / 2);
        ball.vy += hit * 2;
        ball.x = W - PADDLE_W - BALL;
        ctx.sound("place");
      }

      // ghi điểm
      if (ball.x < -BALL) { score[1]++; ctx.sound("miss"); afterScore(-1); }
      else if (ball.x > W) { score[0]++; ctx.sound("miss"); afterScore(1); }
    }

    function afterScore(dir) {
      if (score[0] >= WIN_SCORE || score[1] >= WIN_SCORE) {
        over = true; running = false;
        const winner = score[0] > score[1] ? 0 : 1;
        ctx.incScore(winner); // chỉ ghi vào bảng điểm khi thắng cả ván
        ctx.setStatus(`🎉 Người chơi ${winner + 1} thắng ${score[0]}–${score[1]}!`);
        ctx.setTurn(-1);
        return;
      }
      running = false;
      resetBall(dir);
      ctx.setStatus(`Tỉ số ${score[0]} – ${score[1]}. Nhấn phím để tiếp tục.`);
    }

    function draw() {
      g.fillStyle = "#0f1226";
      g.fillRect(0, 0, W, H);
      // lưới giữa
      g.strokeStyle = "rgba(255,255,255,0.2)";
      g.setLineDash([8, 12]);
      g.beginPath(); g.moveTo(W / 2, 0); g.lineTo(W / 2, H); g.stroke();
      g.setLineDash([]);
      // điểm
      g.fillStyle = "rgba(255,255,255,0.25)";
      g.font = "bold 60px Segoe UI, sans-serif";
      g.textAlign = "center";
      g.fillText(score[0], W / 2 - 60, 70);
      g.fillText(score[1], W / 2 + 60, 70);
      // vợt
      g.fillStyle = "#ff5d73";
      g.fillRect(0, p1y, PADDLE_W, PADDLE_H);
      g.fillStyle = "#4dd0e1";
      g.fillRect(W - PADDLE_W, p2y, PADDLE_W, PADDLE_H);
      // bóng
      g.fillStyle = "#ffd166";
      g.fillRect(ball.x, ball.y, BALL, BALL);
    }

    function loop() {
      if (running) update();
      draw();
      if (!over) raf = requestAnimationFrame(loop);
    }

    function startLoop() {
      if (over) return;
      running = true;
      ctx.setStatus("Đang chơi! P1: W/S — P2: ↑/↓");
    }

    // dọn dẹp khi rời game
    function applyMove() {} // Pong không dùng relay online

    // gắn cleanup vào canvas để main có thể bỏ listener khi đổi game
    const cleanup = () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", kd);
      window.removeEventListener("keyup", ku);
    };
    // tự hủy listener khi boardEl bị xóa (đổi game / chơi lại)
    const observer = new MutationObserver(() => {
      if (!document.body.contains(canvas)) { cleanup(); observer.disconnect(); }
    });
    observer.observe(ctx.boardEl.parentNode || document.body, { childList: true, subtree: true });

    resetBall(Math.random() < 0.5 ? -1 : 1);
    ctx.setTurn(0);
    ctx.setStatus("Nhấn W/S (P1) hoặc ↑/↓ (P2) để bắt đầu. Ai đạt 5 điểm trước thắng!");
    draw();
    raf = requestAnimationFrame(loop);
    return { applyMove };
  }

  window.GameRegistry.register({
    id: "pong",
    name: "Pong",
    emoji: "🏓",
    description: "Game phản xạ thời gian thực: điều khiển vợt đỡ bóng. Ai đạt 5 điểm trước sẽ thắng.",
    onlineReady: false,
    howTo: [
      "Game chơi chung trên một bàn phím (không hỗ trợ online).",
      "Người chơi 1 điều khiển vợt bên trái: phím W (lên) và S (xuống).",
      "Người chơi 2 điều khiển vợt bên phải: mũi tên ↑ (lên) và ↓ (xuống).",
      "Đỡ bóng bằng vợt; bóng đập vào mép vợt sẽ bay chếch theo hướng đó.",
      "Nếu để bóng lọt qua vợt mình, đối thủ được 1 điểm. Ai đạt 5 điểm trước sẽ thắng.",
    ],
    create,
  });
})();

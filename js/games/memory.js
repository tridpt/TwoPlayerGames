/* Lật Hình Tìm Cặp (Memory) — hỗ trợ chơi chung máy & online
   Online dùng RNG có hạt giống (ctx.rng) để hai máy xáo bài giống nhau. */
(function () {
  const EMOJIS = ["🍎", "🚀", "🐱", "🌸", "⚽", "🎸", "🍕", "🎲"]; // 8 cặp = 16 thẻ

  function shuffle(arr, rng) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function create(ctx) {
    const deck = shuffle([...EMOJIS, ...EMOJIS], ctx.rng);
    let turn = 0;
    let firstIdx = null;
    let lock = false;
    let matchedCount = 0;
    const matchedBy = [0, 0];

    const boardEl = document.createElement("div");
    boardEl.className = "mem-board";
    boardEl.style.gridTemplateColumns = "repeat(4, auto)";
    ctx.boardEl.appendChild(boardEl);

    const cards = deck.map((emoji, i) => {
      const card = document.createElement("div");
      card.className = "mem-card hidden-face";
      const face = document.createElement("span");
      face.className = "mem-face";
      face.textContent = emoji;
      card.appendChild(face);
      card.addEventListener("click", () => onClick(i));
      boardEl.appendChild(card);
      return { el: card, emoji, matched: false };
    });

    function showFace(i, show) {
      cards[i].el.classList.toggle("flipped", show);
      cards[i].el.classList.toggle("hidden-face", !show);
    }

    function onClick(i) {
      if (lock) return;
      if (ctx.isOnline && turn !== ctx.mySeat) return;
      const card = cards[i];
      if (card.matched || i === firstIdx) return;
      applyMove(i, false);
    }

    function applyMove(i, fromRemote) {
      if (lock) return;
      const card = cards[i];
      if (card.matched || i === firstIdx) return;

      if (!fromRemote && ctx.isOnline) ctx.sendMove(i);

      showFace(i, true);

      if (firstIdx === null) {
        firstIdx = i;
        return;
      }

      if (cards[firstIdx].emoji === card.emoji) {
        cards[firstIdx].matched = true;
        card.matched = true;
        cards[firstIdx].el.classList.add("matched");
        card.el.classList.add("matched");
        matchedBy[turn]++;
        matchedCount++;
        firstIdx = null;
        ctx.incScore(turn);
        if (matchedCount === EMOJIS.length) return finish();
        ctx.setStatus(`✅ Người chơi ${turn + 1} tìm được một cặp — được đi tiếp!`);
      } else {
        lock = true;
        const a = firstIdx, b = i;
        firstIdx = null;
        setTimeout(() => {
          showFace(a, false);
          showFace(b, false);
          lock = false;
          turn = 1 - turn;
          ctx.setTurn(turn);
          ctx.setStatus(`❌ Không khớp. Đến lượt Người chơi ${turn + 1}.`);
        }, 800);
      }
    }

    function finish() {
      ctx.setTurn(-1);
      const [a, b] = matchedBy;
      if (a > b) ctx.setStatus(`🎉 Người chơi 1 thắng với ${a} cặp!`);
      else if (b > a) ctx.setStatus(`🎉 Người chơi 2 thắng với ${b} cặp!`);
      else ctx.setStatus(`🤝 Hòa! Mỗi người ${a} cặp.`);
    }

    ctx.setTurn(0);
    ctx.setStatus("Lật 2 thẻ giống nhau để ghi điểm. Tìm đúng được đi tiếp.");
    return { applyMove };
  }

  window.GameRegistry.register({
    id: "memory",
    name: "Lật Hình Tìm Cặp",
    emoji: "🧠",
    description: "Lật tìm các cặp hình giống nhau. Ai tìm được nhiều cặp hơn sẽ thắng.",
    onlineReady: true,
    create,
  });
})();

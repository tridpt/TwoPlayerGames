/* Lật Hình Tìm Cặp (Memory) — hỗ trợ chơi chung máy & online
   Online dùng RNG có hạt giống (ctx.rng) để hai máy xáo bài giống nhau. */
(function () {
  const POOL = ["🍎", "🚀", "🐱", "🌸", "⚽", "🎸", "🍕", "🎲",
                "🐶", "🌟", "🍔", "🎯", "🦊", "🍩", "🎈", "🐧",
                "🍉", "🚗"]; // tối đa 18 cặp

  function shuffle(arr, rng) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  // chọn số cột để lưới gần vuông nhất (ưu tiên rộng hơn cao một chút)
  function bestCols(total) {
    let bestC = Math.round(Math.sqrt(total));
    let bestScore = Infinity;
    for (let c = 2; c <= total; c++) {
      const rows = Math.ceil(total / c);
      const empty = c * rows - total;          // số ô thừa
      const aspect = Math.abs(c - rows);        // lệch vuông
      const score = aspect + empty * 3 + (c < rows ? 0.5 : 0); // phạt ô thừa + thiên về rộng
      if (score < bestScore) { bestScore = score; bestC = c; }
    }
    return bestC;
  }

  function create(ctx) {
    const PAIRS = (ctx.options && ctx.options.pairs) || 8;
    const EMOJIS = POOL.slice(0, PAIRS);
    const deck = shuffle([...EMOJIS, ...EMOJIS], ctx.rng);
    const cols = bestCols(deck.length); // tự động cho gần vuông
    let turn = 0;
    let firstIdx = null;
    let lock = false;
    let matchedCount = 0;
    const matchedBy = [0, 0];

    const boardEl = document.createElement("div");
    boardEl.className = "mem-board";
    boardEl.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
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
      ctx.sound("select");

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
        ctx.sound("capture");
        if (matchedCount === EMOJIS.length) return finish();
        ctx.setStatus(`✅ Người chơi ${turn + 1} tìm được một cặp — được đi tiếp!`);
      } else {
        lock = true;
        const a = firstIdx, b = i;
        firstIdx = null;
        ctx.sound("error");
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
    options: [
      {
        id: "pairs", label: "Số cặp", default: 8,
        choices: [
          { value: 6, label: "6 cặp (dễ)" },
          { value: 8, label: "8 cặp (vừa)" },
          { value: 12, label: "12 cặp (khó)" },
          { value: 18, label: "18 cặp (siêu khó)" },
        ],
      },
    ],
    howTo: [
      "Bàn có 16 thẻ úp xuống, gồm 8 cặp hình giống nhau.",
      "Đến lượt mình, lật 2 thẻ bất kỳ để xem hình.",
      "Nếu 2 thẻ giống nhau: bạn ghi được 1 điểm và được đi tiếp.",
      "Nếu 2 thẻ khác nhau: chúng úp lại và chuyển lượt cho đối thủ.",
      "Khi tìm hết các cặp, ai có nhiều cặp hơn sẽ thắng.",
    ],
    create,
  });
})();

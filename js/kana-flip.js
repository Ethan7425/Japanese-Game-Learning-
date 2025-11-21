// =====================================
// Kana Flip Cards - kana-flip.js
// Memory game: kana <-> romaji
// =====================================

(function () {
  const {
    $,
    $$,
    shuffleArray,
    addXp,
    bootstrap
  } = JVT;

  let allKana = [];
  let currentPairs = [];
  let totalPairs = 0;
  let pairsFound = 0;
  let flipCount = 0;

  let firstCard = null;
  let secondCard = null;
  let lockBoard = false;

  // -----------------------------
  // Load alphabet JSON
  // -----------------------------
  async function loadAlphabet() {
    try {
      const res = await fetch("alphabet.json");
      if (!res.ok) throw new Error("Failed to load alphabet.json");
      const data = await res.json();
      if (!Array.isArray(data)) throw new Error("alphabet.json must be an array");
      allKana = data;
    } catch (err) {
      console.error(err);
      alert(
        "Could not load alphabet.json.\nIf you're running this locally, try a simple local server (e.g. `npx serve`)."
      );
    }
  }

  // -----------------------------
  // Build deck based on options
  // -----------------------------
  function buildPairs() {
    const script = ($('input[name="kana-script"]:checked') || {}).value || "hiragana";
    const difficulty = $("#kana-difficulty")?.value || "4x4";

    let maxPairs = 8; // default for 4x4
    if (difficulty === "5x4") maxPairs = 10;
    if (difficulty === "6x4") maxPairs = 12;

    let pool;
    if (script === "hiragana") {
      pool = allKana.filter((k) => k.type === "hiragana");
    } else if (script === "katakana") {
      pool = allKana.filter((k) => k.type === "katakana");
    } else {
      // mixed
      pool = allKana.slice();
    }

    pool = shuffleArray(pool).slice(0, maxPairs);

    // Each pair: kana card + romaji card
    currentPairs = [];
    pool.forEach((entry, index) => {
      const pairId = `pair-${index}`;
      currentPairs.push({
        pairId,
        type: "kana",
        display: entry.kana,
        base: entry
      });
      currentPairs.push({
        pairId,
        type: "romaji",
        display: entry.romaji,
        base: entry
      });
    });

    currentPairs = shuffleArray(currentPairs);
    totalPairs = maxPairs;
    pairsFound = 0;
    flipCount = 0;

    updateStats();
  }

  // -----------------------------
  // Render grid
  // -----------------------------
  function renderGrid() {
    const grid = $("#kana-grid");
    if (!grid) return;

    grid.innerHTML = "";

    currentPairs.forEach((cardData, index) => {
      const card = document.createElement("button");
      card.className = "kana-card";
      card.dataset.pairId = cardData.pairId;
      card.dataset.index = String(index);

      const inner = document.createElement("div");
      inner.className = "kana-card-inner";

      const front = document.createElement("div");
      front.className = "kana-card-face kana-card-front";
      front.textContent = "?";

      const back = document.createElement("div");
      back.className = "kana-card-face kana-card-back";
      back.textContent = cardData.display;

      inner.appendChild(front);
      inner.appendChild(back);
      card.appendChild(inner);

      card.addEventListener("click", () => handleCardClick(card));

      grid.appendChild(card);
    });

    // Apply grid layout based on difficulty
    const difficulty = $("#kana-difficulty")?.value || "4x4";
    if (difficulty === "4x4") {
      grid.style.gridTemplateColumns = "repeat(4, minmax(0, 1fr))";
    } else if (difficulty === "5x4") {
      grid.style.gridTemplateColumns = "repeat(5, minmax(0, 1fr))";
    } else {
      grid.style.gridTemplateColumns = "repeat(6, minmax(0, 1fr))";
    }
  }

  // -----------------------------
  // Click / flip logic
  // -----------------------------
  function handleCardClick(card) {
    if (lockBoard) return;
    if (card.classList.contains("matched")) return;

    const inner = card.querySelector(".kana-card-inner");
    if (!inner) return;

    // If clicking the same card again
    if (firstCard === card) return;

    inner.classList.add("is-flipped");

    if (!firstCard) {
      firstCard = card;
      flipCount += 1;
      updateStats();
      return;
    }

    // second card
    secondCard = card;
    flipCount += 1;
    updateStats();
    lockBoard = true;

    const id1 = firstCard.dataset.pairId;
    const id2 = secondCard.dataset.pairId;

    if (id1 === id2) {
      // Match!
      setTimeout(() => {
        handleMatch();
      }, 350);
    } else {
      // Not a match
      setTimeout(() => {
        handleMismatch();
      }, 700);
    }
  }

  function handleMatch() {
    if (!firstCard || !secondCard) return;

    firstCard.classList.add("matched");
    secondCard.classList.add("matched");

    pairsFound += 1;
    updateStats();

    resetTurn();

    if (pairsFound >= totalPairs) {
      handleGameComplete();
    }
  }

  function handleMismatch() {
    if (!firstCard || !secondCard) return;

    const inner1 = firstCard.querySelector(".kana-card-inner");
    const inner2 = secondCard.querySelector(".kana-card-inner");

    if (inner1) inner1.classList.remove("is-flipped");
    if (inner2) inner2.classList.remove("is-flipped");

    resetTurn();
  }

  function resetTurn() {
    [firstCard, secondCard] = [null, null];
    lockBoard = false;
  }

  // -----------------------------
  // Stats & feedback
  // -----------------------------
  function updateStats() {
    const pairsEl = $("#kana-pairs-found");
    const flipsEl = $("#kana-flip-count");

    if (pairsEl) {
      pairsEl.textContent = `Pairs: ${pairsFound} / ${totalPairs}`;
    }
    if (flipsEl) {
      flipsEl.textContent = `Flips: ${flipCount}`;
    }
  }

  function handleGameComplete() {
    const feedback = $("#kana-flip-feedback");
    if (!feedback) return;

    // New XP formula (buffed but still fair)
    const baseXp = totalPairs * 4;  
    // +33% from your original

    // Efficiency now counts cleaner:
    //   perfect = 1.0
    //   ok      = 0.6
    //   sloppy  = minimum 0.45
    const efficiency = Math.max(0.45, (totalPairs * 2.5) / Math.max(flipCount, 1));

    // Small end-bonus for clearing the board
    const clearBonus = totalPairs >= 8 ? 5 : 2;

    // Final XP
    const xpGain = Math.round(baseXp * efficiency + clearBonus);


    addXp(xpGain);

    feedback.textContent = `Nice! You cleared the board with ${flipCount} flips. You gained ${xpGain} XP.`;
    feedback.className = "quiz-feedback correct";

    const restartBtn = $("#kana-restart-btn");
    if (restartBtn) restartBtn.disabled = false;
  }

  // -----------------------------
  // Start / restart
  // -----------------------------
  function startGame() {
    if (!allKana.length) return;

    const feedback = $("#kana-flip-feedback");
    if (feedback) {
      feedback.textContent = "";
      feedback.className = "quiz-feedback";
    }

    pairsFound = 0;
    flipCount = 0;
    resetTurn();

    buildPairs();
    renderGrid();

    const restartBtn = $("#kana-restart-btn");
    if (restartBtn) restartBtn.disabled = false;
  }

  // -----------------------------
  // Init
  // -----------------------------
  async function initKanaFlip() {
    await loadAlphabet();

    const startBtn = $("#kana-start-btn");
    const restartBtn = $("#kana-restart-btn");

    if (startBtn) {
      startBtn.addEventListener("click", () => {
        startGame();
      });
    }

    if (restartBtn) {
      restartBtn.addEventListener("click", () => {
        startGame();
      });
    }

    // No game auto-start: wait for user to choose options & click Start
  }

  bootstrap(initKanaFlip);
})();

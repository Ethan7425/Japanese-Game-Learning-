// =====================================
// Kana Sequence Memory Game - kana-sequence.js
// Mixed hiragana/katakana memory game
// One wrong tap = game over
// Countdown + romaji-only sequence + animated placeholders
// =====================================

(function () {
  const { $, addXp, bootstrap } = window.JVT;

  // -----------------------------
  // Data: basic kana + romaji
  // -----------------------------
  const KANA_POOL = [
    { romaji: "a",  hira: "あ", kata: "ア" },
    { romaji: "i",  hira: "い", kata: "イ" },
    { romaji: "u",  hira: "う", kata: "ウ" },
    { romaji: "e",  hira: "え", kata: "エ" },
    { romaji: "o",  hira: "お", kata: "オ" },

    { romaji: "ka", hira: "か", kata: "カ" },
    { romaji: "ki", hira: "き", kata: "キ" },
    { romaji: "ku", hira: "く", kata: "ク" },
    { romaji: "ke", hira: "け", kata: "ケ" },
    { romaji: "ko", hira: "こ", kata: "コ" },

    { romaji: "sa",  hira: "さ", kata: "サ" },
    { romaji: "shi", hira: "し", kata: "シ" },
    { romaji: "su",  hira: "す", kata: "ス" },
    { romaji: "se",  hira: "せ", kata: "セ" },
    { romaji: "so",  hira: "そ", kata: "ソ" },

    { romaji: "ta",  hira: "た", kata: "タ" },
    { romaji: "chi", hira: "ち", kata: "チ" },
    { romaji: "tsu", hira: "つ", kata: "ツ" },
    { romaji: "te",  hira: "て", kata: "テ" },
    { romaji: "to",  hira: "と", kata: "ト" },

    { romaji: "na", hira: "な", kata: "ナ" },
    { romaji: "ni", hira: "に", kata: "ニ" },
    { romaji: "nu", hira: "ぬ", kata: "ヌ" },
    { romaji: "ne", hira: "ね", kata: "ネ" },
    { romaji: "no", hira: "の", kata: "ノ" },

    { romaji: "ha", hira: "は", kata: "ハ" },
    { romaji: "hi", hira: "ひ", kata: "ヒ" },
    { romaji: "fu", hira: "ふ", kata: "フ" },
    { romaji: "he", hira: "へ", kata: "ヘ" },
    { romaji: "ho", hira: "ほ", kata: "ホ" },

    { romaji: "ma", hira: "ま", kata: "マ" },
    { romaji: "mi", hira: "み", kata: "ミ" },
    { romaji: "mu", hira: "む", kata: "ム" },
    { romaji: "me", hira: "め", kata: "メ" },
    { romaji: "mo", hira: "も", kata: "モ" },

    { romaji: "ya", hira: "や", kata: "ヤ" },
    { romaji: "yu", hira: "ゆ", kata: "ユ" },
    { romaji: "yo", hira: "よ", kata: "ヨ" },

    { romaji: "ra", hira: "ら", kata: "ラ" },
    { romaji: "ri", hira: "り", kata: "リ" },
    { romaji: "ru", hira: "る", kata: "ル" },
    { romaji: "re", hira: "れ", kata: "レ" },
    { romaji: "ro", hira: "ろ", kata: "ロ" },

    { romaji: "wa", hira: "わ", kata: "ワ" },
    { romaji: "wo", hira: "を", kata: "ヲ" },
    { romaji: "n",  hira: "ん", kata: "ン" }
  ];

  function randomFrom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function generateSequenceItem() {
    const kana = randomFrom(KANA_POOL);
    const script = Math.random() < 0.5 ? "hiragana" : "katakana";
    return { kana, script };
  }

  function generateSequenceOfLength(len) {
    const seq = [];
    for (let i = 0; i < len; i++) {
      seq.push(generateSequenceItem());
    }
    return seq;
  }

  function shuffleArray(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // -----------------------------
  // State
  // -----------------------------
  const state = {
    sequence: [],
    round: 1,
    bestRound: 0,
    inputIndex: 0,
    inInput: false,
    gameOver: false
  };

  // -----------------------------
  // UI helpers
  // -----------------------------
  function updateStatus() {
    const bestEl = $("#kana-seq-best");
    const roundEl = $("#kana-seq-round");
    const cleared = Math.max(0, state.round - 1);

    if (bestEl) {
      bestEl.textContent = `Best: ${state.bestRound}`;
    }
    if (roundEl) {
      roundEl.textContent = `Round ${state.round} · Cleared ${cleared}`;
    }
  }

  function buildPlaceholders() {
    const container = $("#kana-seq-placeholders");
    if (!container) return;
    container.innerHTML = "";

    state.sequence.forEach(() => {
      const slot = document.createElement("div");
      slot.className = "kana-seq-placeholder";
      slot.textContent = "";
      container.appendChild(slot);
    });
  }

  function getMemoriseTimeMs() {
    const len = state.sequence.length;
    // Base + small increase with sequence length
    return Math.max(900, 1700 + (len - 2) * 220);
  }

  function runCountdown(onDone) {
    const displayEl = $("#kana-seq-display");
    if (!displayEl) {
      onDone();
      return;
    }

    let count = 3;
    displayEl.textContent = `Memorise in… ${count}`;
    displayEl.classList.add("kana-seq-countdown");

    const intervalId = setInterval(() => {
      count -= 1;
      if (count <= 0) {
        clearInterval(intervalId);
        displayEl.classList.remove("kana-seq-countdown");
        onDone();
      } else {
        displayEl.textContent = `Memorise in… ${count}`;
      }
    }, 650);
  }

  function showSequenceForMemorise() {
    const displayEl = $("#kana-seq-display");
    if (!displayEl) return;

    displayEl.innerHTML = "";
    displayEl.classList.remove("kana-seq-countdown");

    // Romaji-only row, bigger for readability
    const wrapper = document.createElement("div");
    wrapper.className = "kana-seq-romaji-row";

    state.sequence.forEach((item) => {
      const token = document.createElement("div");
      token.className = "kana-seq-token-romaji-only";
      token.textContent = item.kana.romaji;
      wrapper.appendChild(token);
    });

    displayEl.appendChild(wrapper);

    const ms = getMemoriseTimeMs();
    setTimeout(() => {
      hideSequenceShowPrompt();
      state.inInput = true;
    }, ms);
  }

  function hideSequenceShowPrompt() {
    const displayEl = $("#kana-seq-display");
    if (!displayEl) return;
    displayEl.innerHTML =
      '<span class="kana-seq-remember">Tap the kana tiles in the same order.</span>';
  }

  function buildTileBank() {
    const grid = $("#kana-seq-grid");
    if (!grid) return;
    grid.innerHTML = "";

    // All romaji in the sequence
    const neededRomaji = new Set(state.sequence.map((item) => item.kana.romaji));
    const romajiList = Array.from(neededRomaji);

    // Add some extra distractors up to ~9 romaji
    while (romajiList.length < 9 && romajiList.length < KANA_POOL.length) {
      const candidate = randomFrom(KANA_POOL).romaji;
      if (!romajiList.includes(candidate)) {
        romajiList.push(candidate);
      }
    }

    // Build tile objects (with both scripts), then shuffle all tiles
    const tiles = [];
    romajiList.forEach((romaji) => {
      const kana = KANA_POOL.find((k) => k.romaji === romaji);
      if (!kana) return;

      if (kana.hira) {
        tiles.push({
          romaji,
          script: "hiragana",
          char: kana.hira
        });
      }
      if (kana.kata) {
        tiles.push({
          romaji,
          script: "katakana",
          char: kana.kata
        });
      }
    });

    const shuffledTiles = shuffleArray(tiles);

    shuffledTiles.forEach((tile) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "kana-seq-tile";
      btn.dataset.romaji = tile.romaji;
      btn.dataset.script = tile.script;
      btn.textContent = tile.char;

      btn.addEventListener("click", () => {
        handleTileClick(btn);
      });

      grid.appendChild(btn);
    });
  }

  function setFeedback(message, type) {
    const el = $("#kana-seq-feedback");
    if (!el) return;
    el.textContent = message || "";
    el.className = "quiz-feedback";
    if (type === "correct") {
      el.classList.add("correct");
    } else if (type === "wrong") {
      el.classList.add("wrong");
    }
  }

  // -----------------------------
  // Game flow
  // -----------------------------
  function showRound() {
    state.inInput = false;
    state.inputIndex = 0;
    state.gameOver = false;
    setFeedback("", null);

    buildPlaceholders();
    buildTileBank();
    updateStatus();

    runCountdown(() => {
      showSequenceForMemorise();
    });
  }

  function advanceToNextRound() {
    state.round += 1;

    // Best is based on cleared rounds
    if (state.round - 1 > state.bestRound) {
      state.bestRound = state.round - 1;
    }

    // NEW: each round = brand new sequence, not previous + 1
    const length = 2 + (state.round - 1); // 2, 3, 4, 5, ...
    state.sequence = generateSequenceOfLength(length);

    showRound();
  }

  function handleTileClick(btn) {
    if (!state.inInput || state.gameOver) return;

    const romaji = btn.dataset.romaji;
    const chosenScript = btn.dataset.script; // what the user actually clicked
    const expected = state.sequence[state.inputIndex];

    // Only romaji must match. Script (hiragana vs katakana) can be either.
    if (!expected || expected.kana.romaji !== romaji) {
      btn.classList.add("wrong");
      handleGameOver();
      return;
    }

    // Correct tap: pop the tile and fill the corresponding placeholder
    btn.classList.add("correct-step");
    btn.disabled = true;

    const placeholders = document.querySelectorAll(".kana-seq-placeholder");
    const slot = placeholders[state.inputIndex];
    if (slot) {
      // Use the script the player actually tapped
      const char =
        chosenScript === "hiragana"
          ? expected.kana.hira
          : expected.kata || expected.kana.kata;
      slot.textContent = char;
      slot.classList.add("filled", "pop-in");
      setTimeout(() => {
        slot.classList.remove("pop-in");
      }, 220);
    }

    state.inputIndex += 1;

    if (state.inputIndex >= state.sequence.length) {
      state.inInput = false;
      setFeedback("Nice! Sequence complete.", "correct");

      setTimeout(() => {
        advanceToNextRound();
      }, 650);
    }
  }

  function handleGameOver() {
    state.gameOver = true;
    state.inInput = false;

    const clearedRounds = Math.max(0, state.round - 1);
    if (clearedRounds > state.bestRound) {
      state.bestRound = clearedRounds;
    }

    // XP: small but scales with how far you got
    const xpGain = clearedRounds > 0 ? clearedRounds * 6 : 3;
    addXp(xpGain);

    setFeedback(
      `Game over. You cleared ${clearedRounds} round${clearedRounds === 1 ? "" : "s"} and earned ${xpGain} XP.`,
      "wrong"
    );

    updateStatus();
  }

  // Restart behaviour: reroll a new sequence with the same length & same round
  function restartCurrentRound() {
    const length = state.sequence.length || 2;
    state.sequence = generateSequenceOfLength(length);
    state.inputIndex = 0;
    state.gameOver = false;
    showRound();
  }

  function startNewGame() {
    state.round = 1;
    state.bestRound = state.bestRound || 0;
    state.inputIndex = 0;
    state.inInput = false;
    state.gameOver = false;

    // Start with length 2
    state.sequence = generateSequenceOfLength(2);

    showRound();
  }

  function initPage() {
    const restartBtn = $("#kana-seq-restart");
    if (restartBtn) {
      restartBtn.addEventListener("click", () => {
        if (state.gameOver) {
          startNewGame(); // full reset if already lost
        } else {
          restartCurrentRound(); // reroll same length, same round, new sequence
        }
      });
    }

    startNewGame();
  }

  bootstrap(initPage);
})();

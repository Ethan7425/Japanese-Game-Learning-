// =====================================
// Kanji Reaction - Rewritten
// =====================================

(function () {
  const { $, bootstrap, addXp } = window.JVT;

  const KANJI_JSON_PATH = "../data/kanji-words.json";
  const STORAGE_KEY = "jvt_kanji_reaction_stats";

  const localStats = {
    sessions: 0,
    bestAvgMs: null,
    bestSingleMs: null
  };

  // -----------------------------
  // Utilities
  // -----------------------------
  function formatMs(ms) {
    if (!Number.isFinite(ms)) return "–";
    return `${(ms / 1000).toFixed(3)} s`;
  }

  function randomFrom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // -----------------------------
  // Data loading
  // -----------------------------
  let WORDS = [];
  let ALL_KANJI = [];

  const FALLBACK_WORDS = [
    { kanji: "日", reading: "ひ", meaning: "day; sun" },
    { kanji: "水", reading: "みず", meaning: "water" },
    { kanji: "山", reading: "やま", meaning: "mountain" },
    { kanji: "人", reading: "ひと", meaning: "person" },
    { kanji: "学校", reading: "がっこう", meaning: "school" },
    { kanji: "先生", reading: "せんせい", meaning: "teacher" },
    { kanji: "日本", reading: "にほん", meaning: "Japan" },
    { kanji: "友達", reading: "ともだち", meaning: "friend" },
    { kanji: "図書館", reading: "としょかん", meaning: "library" },
    { kanji: "新幹線", reading: "しんかんせん", meaning: "bullet train" }
  ];

  function prepareWords(raw) {
    const cleaned = raw
      .filter(
        (w) =>
          w &&
          typeof w.kanji === "string" &&
          w.kanji.trim().length > 0 &&
          typeof w.reading === "string" &&
          typeof w.meaning === "string"
      )
      .map((w) => {
        const chars = Array.from(w.kanji.trim());
        const unique = Array.from(new Set(chars));
        return {
          kanji: w.kanji.trim(),
          reading: w.reading.trim(),
          meaning: w.meaning.trim(),
          kanjiChars: unique,
          kanjiCount: unique.length
        };
      });

    if (!cleaned.length) return;
    WORDS = cleaned;
    ALL_KANJI = Array.from(new Set(WORDS.flatMap((w) => w.kanjiChars)));
  }

  function loadKanjiWords() {
    return fetch(KANJI_JSON_PATH)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load kanji-words.json");
        return res.json();
      })
      .then((data) => {
        if (!Array.isArray(data)) throw new Error("kanji-words.json must be an array");
        prepareWords(data);
        if (!WORDS.length) prepareWords(FALLBACK_WORDS);
      })
      .catch(() => {
        prepareWords(FALLBACK_WORDS);
      });
  }

  function getWordsForLength(len) {
    const pool = WORDS.filter((w) => w.kanjiCount === len);
    return pool.length ? pool : WORDS;
  }

  // -----------------------------
  // State
  // -----------------------------
  const state = {
    difficultyLength: null,
    totalRounds: 5,
    currentRound: 0,
    currentWord: null,
    targetSet: new Set(),
    selectedSet: new Set(),
    roundStartTime: null,
    roundFinished: false,
    timerIntervalId: null,
    countdownId: null,
    countdownRemaining: 0,
    results: [],
    mistakes: 0,
    sessionActive: false
  };

  // -----------------------------
  // UI helpers
  // -----------------------------
  function setStatusMessage(msg) {
    const prompt = $("#kanji-react-prompt");
    if (prompt) prompt.textContent = msg || "";
  }

  function setTimerText(ms) {
    const t = $("#kanji-react-timer");
    if (t) t.textContent = formatMs(ms);
  }

  function setTimerVisible(visible) {
    const t = $("#kanji-react-timer");
    if (t) t.hidden = !visible;
  }

  function setMistakesLabel() {
    const el = $("#kanji-react-mistakes");
    if (el) el.textContent = `Mistakes: ${state.mistakes}`;
  }

  function setMistakesVisible(visible) {
    const el = $("#kanji-react-mistakes");
    if (el) el.hidden = !visible;
  }

  function setFeedback(msg, type) {
    const el = $("#kanji-react-feedback");
    if (!el) return;
    el.textContent = msg || "";
    el.className = "quiz-feedback";
    if (type === "correct") el.classList.add("correct");
    if (type === "wrong") el.classList.add("wrong");
  }

  function showGameplayUI(visible) {
    const grid = $("#kanji-react-grid");
    if (grid) grid.hidden = !visible;
  }

  function setBestRowVisible(visible) {
    const bestRow = document.querySelector(".kanji-react-best-row");
    if (bestRow) bestRow.hidden = !visible;
  }

  function resetGrid() {
    const grid = $("#kanji-react-grid");
    if (grid) grid.innerHTML = "";
  }

  function setMainCardVisible(visible) {
    const card = $("#kanji-react-main-card");
    if (card) card.hidden = !visible;
  }

  function disableGrid() {
    document.querySelectorAll(".kanji-react-option").forEach((btn) => {
      btn.disabled = true;
    });
  }

  // -----------------------------
  // Local stats
  // -----------------------------
  function loadLocalStats() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Number.isFinite(parsed.sessions)) localStats.sessions = parsed.sessions;
      if (Number.isFinite(parsed.bestAvgMs)) localStats.bestAvgMs = parsed.bestAvgMs;
      if (Number.isFinite(parsed.bestSingleMs)) localStats.bestSingleMs = parsed.bestSingleMs;
    } catch {
      /* ignore */
    }
  }

  function saveLocalStats() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(localStats));
  }

  function updateBestStatsUI() {
    const avg = $("#kanji-react-best-avg");
    const single = $("#kanji-react-best-single");
    if (avg) avg.textContent = `Best avg: ${formatMs(localStats.bestAvgMs)}`;
    if (single) single.textContent = `Best single: ${formatMs(localStats.bestSingleMs)}`;
  }

  // -----------------------------
  // Rounds
  // -----------------------------
  function clearTimerInterval() {
    if (state.timerIntervalId != null) {
      clearInterval(state.timerIntervalId);
      state.timerIntervalId = null;
    }
  }

  function startLiveTimer() {
    clearTimerInterval();
    state.timerIntervalId = setInterval(() => {
      if (!state.roundStartTime || state.roundFinished) return;
      setTimerText(performance.now() - state.roundStartTime);
    }, 40);
  }

  function buildPrompt() {
    const prompt = $("#kanji-react-prompt");
    if (!prompt || !state.currentWord) return;
    const { reading, meaning } = state.currentWord;
    prompt.innerHTML = `<div class="kanji-react-reading">${reading}</div><div class="kanji-react-meaning">${meaning}</div>`;
  }

  function buildGrid() {
    const grid = $("#kanji-react-grid");
    if (!grid || !state.currentWord) return;
    const targets = state.currentWord.kanjiChars;
    const maxTiles = 12;
    const distractPool = ALL_KANJI.filter((c) => !targets.includes(c));
    const distractors = shuffle(distractPool).slice(0, Math.max(0, maxTiles - targets.length));
    const options = shuffle([...targets, ...distractors]);

    grid.innerHTML = "";
    options.forEach((ch) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "quiz-answer-btn kanji-react-option";
      btn.textContent = ch;
      btn.dataset.kanji = ch;
      btn.addEventListener("click", () => handleOptionClick(btn, ch));
      grid.appendChild(btn);
    });
  }

  function startRound() {
    showGameplayUI(true);
    setTimerVisible(true);
    setMistakesVisible(true);
    setBestRowVisible(false);

    if (!WORDS.length) {
      setStatusMessage("No kanji data loaded.");
      return;
    }

    const pool = getWordsForLength(state.difficultyLength);
    state.currentWord = randomFrom(pool);
    state.targetSet = new Set(state.currentWord.kanjiChars);
    state.selectedSet = new Set();
    state.roundFinished = false;
    state.roundStartTime = performance.now();

    setMistakesLabel();
    setTimerText(0);
    setFeedback("", null);
    buildPrompt();
    buildGrid();
    startLiveTimer();
  }

  function highlightCorrectTiles() {
    document.querySelectorAll(".kanji-react-option").forEach((btn) => {
      if (state.targetSet.has(btn.dataset.kanji)) {
        btn.classList.add("kanji-react-option--correct");
      }
    });
  }

  function endRound(timeMs, correct) {
    state.roundFinished = true;
    clearTimerInterval();
    disableGrid();
    const recordedTime = correct ? timeMs : null;
    setTimerText(recordedTime);
    highlightCorrectTiles();

    const roundNumber = state.currentRound + 1;
    if (!correct) {
      state.mistakes += 1;
      setMistakesLabel();
    }

    setFeedback(
      correct ? `Round ${roundNumber}: ✓ (${formatMs(recordedTime)})` : `Round ${roundNumber}: ✗`,
      correct ? "correct" : "wrong"
    );

    state.results.push({
      round: roundNumber,
      word: state.currentWord,
      correct,
      timeMs: recordedTime
    });

    if (state.currentRound + 1 >= state.totalRounds) {
      setTimeout(finishSession, 600);
    } else {
      state.currentRound += 1;
      setTimeout(startRound, 600);
    }
  }

  function handleOptionClick(btn, ch) {
    if (state.roundFinished || !state.roundStartTime) return;
    const now = performance.now();
    const timeMs = now - state.roundStartTime;

    btn.classList.add("kanji-react-option--selected");

    if (!state.targetSet.has(ch) || state.selectedSet.has(ch)) {
      btn.classList.add("wrong");
      endRound(timeMs, false);
      return;
    }

    state.selectedSet.add(ch);
    btn.classList.add("correct-step");

    if (state.selectedSet.size >= state.targetSet.size) {
      endRound(timeMs, true);
    }
  }

  // -----------------------------
  // Countdown + session control
  // -----------------------------
  function clearCountdown() {
    if (state.countdownId != null) {
      clearInterval(state.countdownId);
      state.countdownId = null;
    }
    state.countdownRemaining = 0;
  }

  function startCountdown() {
    const startBtn = $("#kanji-react-start-btn");
    if (startBtn) startBtn.hidden = true;
    setDifficultyCollapsed(true);

    state.sessionActive = true;
    clearCountdown();
    state.countdownRemaining = 3;
    setStatusMessage(`Starting in ${state.countdownRemaining}...`);
    showGameplayUI(false);
    setTimerVisible(false);
    setMistakesVisible(false);
    setPlayAreaVisibility(true);

    state.countdownId = setInterval(() => {
      state.countdownRemaining -= 1;
      if (state.countdownRemaining > 0) {
        setStatusMessage(`Starting in ${state.countdownRemaining}...`);
      } else {
        clearCountdown();
        setStatusMessage("Go!");
        state.currentRound = 0;
        state.results = [];
        state.mistakes = 0;
        startRound();
      }
    }, 1000);
  }

  function setPlayAreaVisibility(visible) {
    const prompt = $("#kanji-react-prompt");
    const grid = $("#kanji-react-grid");
    const feedback = $("#kanji-react-feedback");
    if (prompt) prompt.hidden = !visible;
    if (grid) grid.hidden = !visible;
    if (feedback) feedback.hidden = !visible;
  }

  function resetSession(showStart = true) {
    clearTimerInterval();
    clearCountdown();
    state.currentRound = 0;
    state.currentWord = null;
    state.targetSet = new Set();
    state.selectedSet = new Set();
    state.roundStartTime = null;
    state.roundFinished = false;
    state.results = [];
    state.mistakes = 0;
    state.sessionActive = false;

    setStatusMessage("Choose a word length, then press Start.");
    setTimerText(0);
    setTimerVisible(false);
    setMistakesLabel();
    setMistakesVisible(false);
    setFeedback("", null);
    resetGrid();
    hideSummary();
    hideGameOverPopup();
    setMainCardVisible(true);
    showGameplayUI(false);
    setBestRowVisible(false);
    setPlayAreaVisibility(false);

    const startBtn = $("#kanji-react-start-btn");
    if (startBtn) {
      startBtn.hidden = !showStart;
      startBtn.disabled = !Number.isFinite(state.difficultyLength);
    }

    setDifficultyCollapsed(false);
  }

  // -----------------------------
  // Summary & sharing
  // -----------------------------
  function buildShareCard(avgMs, bestSingle, xpGain, mistakes) {
    const lines = [];
    lines.push("⚡ Kanji Reaction – 5 Round Session");
    lines.push(`Difficulty: ${state.difficultyLength}-kanji words`);
    lines.push("");
    state.results.forEach((res) => {
      const mark = res.correct ? "✓" : "✗";
      const time = res.correct ? ` · ${formatMs(res.timeMs)}` : "";
      lines.push(`Round ${res.round}: ${res.word.reading} (${res.word.meaning}) · ${mark}${time}`);
    });
    lines.push("");
    lines.push(`Average (correct only): ${formatMs(avgMs)}`);
    lines.push(`Best this run: ${formatMs(bestSingle)}`);
    lines.push(`Mistakes: ${mistakes}`);
    lines.push(`XP gained: ${xpGain}`);
    lines.push("");
    lines.push("Share your times and compare with friends!");
    return lines.join("\n");
  }

  function buildSummaryUI(avgMs, bestSingle, xpGain) {
    const summaryCard = $("#kanji-react-summary-card");
    const headline = $("#kanji-react-summary-headline");
    const list = $("#kanji-react-results-list");
    const avgEl = $("#kanji-react-summary-avg");

    const correctCount = state.results.filter((r) => r.correct).length;
    const mistakes = state.mistakes;

    if (headline) {
      headline.innerHTML = `
        <span class="recap-label">Difficulty:</span> ${state.difficultyLength}<br>
        <span class="recap-label">Rounds:</span> ${state.totalRounds}<br>
        <span class="recap-label">Correct:</span> ${correctCount}<br>
        <span class="recap-label">Mistakes:</span> ${mistakes}<br>
      `;
    }

    if (list) {
      list.innerHTML = "";
      state.results.forEach((res) => {
        const row = document.createElement("div");
        row.className = "kanji-react-result-row";

        const left = document.createElement("div");
        left.className = "kanji-react-result-left";
        left.textContent = `Round ${res.round}: ${res.word.reading} (${res.word.meaning})`;

        const right = document.createElement("div");
        right.className = "kanji-react-result-right";
        right.textContent = res.correct ? `✓ ${formatMs(res.timeMs)}` : "✗";

        row.appendChild(left);
        row.appendChild(right);
        list.appendChild(row);
      });
    }

    if (avgEl) {
      avgEl.textContent = `Average (correct only): ${formatMs(avgMs)} · Best: ${formatMs(
        bestSingle
      )}`;
    }

    const shareText = buildShareCard(avgMs, bestSingle, xpGain, mistakes);
    const shareArea = $("#kanji-react-share-output");
    if (shareArea) shareArea.value = shareText;

    if (summaryCard) summaryCard.hidden = false;
  }

  function hideSummary() {
    const summaryCard = $("#kanji-react-summary-card");
    if (summaryCard) summaryCard.hidden = true;
  }

  function showGameOverPopup() {
    const popup = $("#kanji-react-popup");
    if (popup) popup.hidden = false;
  }

  function hideGameOverPopup() {
    const popup = $("#kanji-react-popup");
    if (popup) popup.hidden = true;
  }

  function finishSession() {
    if (!state.results.length) return;
    localStats.sessions += 1;

    const correctTimes = state.results
      .filter((r) => r.correct && Number.isFinite(r.timeMs))
      .map((r) => r.timeMs);
    const avgMs = correctTimes.length
      ? correctTimes.reduce((acc, v) => acc + v, 0) / correctTimes.length
      : null;
    const bestSingle = correctTimes.length ? Math.min(...correctTimes) : null;

    if (avgMs != null && (localStats.bestAvgMs == null || avgMs < localStats.bestAvgMs)) {
      localStats.bestAvgMs = avgMs;
    }
    if (bestSingle != null && (localStats.bestSingleMs == null || bestSingle < localStats.bestSingleMs)) {
      localStats.bestSingleMs = bestSingle;
    }
    saveLocalStats();
    updateBestStatsUI();
    setBestRowVisible(false);

    const correctCount = state.results.filter((r) => r.correct).length;
    const xpGain = Math.max(5, correctCount * 7);
    addXp(xpGain);

    buildSummaryUI(avgMs, bestSingle, xpGain);
    state.sessionActive = false;
    setMainCardVisible(false);
    showGameplayUI(false);
    setPlayAreaVisibility(false);
    setTimeout(showGameOverPopup, 50);
  }

  // -----------------------------
  // Difficulty & buttons
  // -----------------------------
  function setDifficultyCollapsed(collapsed) {
    const row = document.querySelector(".kanji-react-difficulty-row");
    if (!row) return;
    if (collapsed) row.classList.add("is-collapsed");
    else row.classList.remove("is-collapsed");
  }

  function initDifficultyControls() {
    const buttons = document.querySelectorAll(".kanji-react-difficulty-buttons .chip-toggle");
    const startBtn = $("#kanji-react-start-btn");

    const applySelection = (btn, len) => {
      state.difficultyLength = len;
      buttons.forEach((b) => b.classList.remove("is-active"));
      btn.classList.add("is-active");
      if (startBtn) startBtn.disabled = false;
    };

    buttons.forEach((btn) => {
      btn.addEventListener("click", () => {
        const len = parseInt(btn.dataset.length, 10);
        if (!Number.isFinite(len) || len < 1) return;
        applySelection(btn, len);
      });
    });

    if (buttons[0]) {
      const len = parseInt(buttons[0].dataset.length, 10);
      if (Number.isFinite(len)) applySelection(buttons[0], len);
    }
  }

  function initButtons() {
    const startBtn = $("#kanji-react-start-btn");
    if (startBtn) {
      startBtn.addEventListener("click", () => {
        if (!Number.isFinite(state.difficultyLength)) {
          setFeedback("Pick a word length first.", "wrong");
          return;
        }
        resetSession(false);
        setFeedback("", null);
        startCountdown();
      });
    }

    const restartBtn = $("#kanji-react-restart-session");
    if (restartBtn) {
      restartBtn.addEventListener("click", () => {
        resetSession(true);
      });
    }

    const copyBtn = $("#kanji-react-share-copy");
    if (copyBtn) {
      copyBtn.addEventListener("click", () => {
        const area = $("#kanji-react-share-output");
        if (!area) return;
        const text = area.value || "";
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).catch(() => {});
        } else {
          area.focus();
          area.select();
          document.execCommand("copy");
        }
      });
    }

    const popupClose = $("#kanji-react-popup-close");
    if (popupClose) {
      popupClose.addEventListener("click", () => hideGameOverPopup());
    }
  }

  // -----------------------------
  // Init
  // -----------------------------
  function initPage() {
    loadLocalStats();
    updateBestStatsUI();
    setMistakesLabel();
    setTimerText(0);
    setStatusMessage("Choose a word length, then press Start.");
    setFeedback("", null);
    hideSummary();
    hideGameOverPopup();
    showGameplayUI(false);
    setPlayAreaVisibility(false);

    loadKanjiWords().then(() => {
      initDifficultyControls();
      initButtons();
      resetSession(true);
    });
  }

  bootstrap(initPage);
})();

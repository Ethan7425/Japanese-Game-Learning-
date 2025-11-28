// =====================================
// Kanji Reaction - kanji-reaction.js
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

  function loadLocalStats() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Number.isFinite(parsed.sessions)) localStats.sessions = parsed.sessions;
      if (Number.isFinite(parsed.bestAvgMs)) localStats.bestAvgMs = parsed.bestAvgMs;
      if (Number.isFinite(parsed.bestSingleMs)) localStats.bestSingleMs = parsed.bestSingleMs;
    } catch (e) {
      console.warn("Failed to parse kanji reaction stats:", e);
    }
  }

  function saveLocalStats() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(localStats));
  }

  function formatMs(ms) {
    if (!Number.isFinite(ms)) return "–";
    const seconds = ms / 1000;
    return `${seconds.toFixed(3)} s`;
  }

  function updateBestStatsUI() {
    const avgEl = $("#kanji-react-best-avg");
    const singleEl = $("#kanji-react-best-single");
    if (avgEl) {
      avgEl.textContent = `Best avg: ${
        localStats.bestAvgMs != null ? formatMs(localStats.bestAvgMs) : "–"
      }`;
    }
    if (singleEl) {
      singleEl.textContent = `Best single: ${
        localStats.bestSingleMs != null ? formatMs(localStats.bestSingleMs) : "–"
      }`;
    }
  }

  // -----------------------------
  // Data: words + kanji chars
  // -----------------------------
  let WORDS = [];
  let ALL_KANJI_CHARS = [];

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

  function prepareWords(rawList) {
    const cleaned = rawList
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
        const uniqueChars = Array.from(new Set(chars));
        return {
          kanji: w.kanji.trim(),
          reading: w.reading.trim(),
          meaning: w.meaning.trim(),
          kanjiChars: uniqueChars,
          kanjiCount: uniqueChars.length
        };
      });

    if (!cleaned.length) return;

    WORDS = cleaned;
    ALL_KANJI_CHARS = Array.from(
      new Set(WORDS.flatMap((w) => w.kanjiChars))
    );
  }

  function useFallbackWords() {
    prepareWords(FALLBACK_WORDS);
  }

  function loadKanjiWords() {
    return fetch(KANJI_JSON_PATH)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load kanji-words.json");
        return res.json();
      })
      .then((data) => {
        if (!Array.isArray(data)) {
          throw new Error("kanji-words.json must contain an array");
        }
        prepareWords(data);
        if (!WORDS.length) {
          console.warn("kanji-words.json loaded but contains no usable entries, falling back.");
          useFallbackWords();
        }
      })
      .catch((err) => {
        console.warn("Could not load kanji-words.json, using fallback.", err);
        useFallbackWords();
      });
  }

  function randomFrom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function shuffleArray(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function getWordsForLength(len) {
    const candidates = WORDS.filter((w) => w.kanjiCount === len);
    if (candidates.length) return candidates;
    return WORDS.slice();
  }

  // -----------------------------
  // Game state
  // -----------------------------
  const state = {
    difficultyLength: 1,
    totalRounds: 5,
    currentRoundIndex: 0,
    currentWord: null,
    targetKanjiSet: new Set(),
    selectedKanjiSet: new Set(),
    roundStartTime: null,
    roundFinished: false,
    results: [],
    mistakes: 0,
    countdownTimerId: null,
    countdownRemaining: 0,
    timerIntervalId: null
  };

  // -----------------------------
  // UI helpers
  // -----------------------------
  function setFeedback(msg, type) {
    const el = $("#kanji-react-feedback");
    if (!el) return;
    el.textContent = msg || "";
    el.className = "quiz-feedback";
    if (type === "correct") el.classList.add("correct");
    if (type === "wrong") el.classList.add("wrong");
  }

  function setTimer(ms) {
    const el = $("#kanji-react-timer");
    if (!el) return;
    el.textContent = formatMs(ms);
  }

  function updateMistakesLabel() {
    const el = $("#kanji-react-mistakes");
    if (!el) return;
    el.textContent = `Mistakes: ${state.mistakes}`;
  }

  function buildPrompt() {
    const promptEl = $("#kanji-react-prompt");
    if (!promptEl || !state.currentWord) return;

    const { reading, meaning } = state.currentWord;

    promptEl.innerHTML = "";

    const readingDiv = document.createElement("div");
    readingDiv.className = "kanji-react-reading";
    readingDiv.textContent = reading;

    const meaningDiv = document.createElement("div");
    meaningDiv.className = "kanji-react-meaning";
    meaningDiv.textContent = meaning;

    promptEl.appendChild(readingDiv);
    promptEl.appendChild(meaningDiv);
  }

  function buildGrid() {
    const grid = $("#kanji-react-grid");
    if (!grid || !state.currentWord) return;

    const targets = state.currentWord.kanjiChars;
    const maxTiles = 12;
    const neededDistractors = Math.max(0, maxTiles - targets.length);

    const distractPool = ALL_KANJI_CHARS.filter(
      (ch) => !targets.includes(ch)
    );
    const distractors = shuffleArray(distractPool).slice(0, neededDistractors);

    const options = shuffleArray([...targets, ...distractors]);

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

  function disableGrid() {
    const buttons = document.querySelectorAll(".kanji-react-option");
    buttons.forEach((btn) => {
      btn.disabled = true;
    });
  }

  // -----------------------------
  // Timer helpers (live timer)
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
      const now = performance.now();
      const elapsed = now - state.roundStartTime;
      setTimer(elapsed);
    }, 50);
  }

  // -----------------------------
  // Round logic
  // -----------------------------
  function startRound() {
    if (!WORDS.length) {
      const promptEl = $("#kanji-react-prompt");
      if (promptEl) {
        promptEl.textContent = "No kanji data loaded.";
      }
      return;
    }

    const length = state.difficultyLength;
    const pool = getWordsForLength(length);

    state.currentWord = randomFrom(pool);
    state.targetKanjiSet = new Set(state.currentWord.kanjiChars);
    state.selectedKanjiSet = new Set();
    state.roundFinished = false;
    state.roundStartTime = performance.now();

    setTimer(0);
    setFeedback("", null);
    buildPrompt();
    buildGrid();
    startLiveTimer();
  }

    function highlightCorrectTiles() {
    const buttons = document.querySelectorAll(".kanji-react-option");
    buttons.forEach((btn) => {
        const ch = btn.dataset.kanji;
        if (state.targetKanjiSet.has(ch)) {
        btn.classList.add("kanji-react-option--correct");
        }
    });
    }


  function endRound(timeMs, correct) {
    state.roundFinished = true;
    clearTimerInterval();
    disableGrid();
    setTimer(timeMs);

    highlightCorrectTiles();

    const roundNumber = state.currentRoundIndex + 1;

    if (!correct) {
      state.mistakes += 1;
      updateMistakesLabel();
    }

    if (correct) {
      setFeedback(`Round ${roundNumber}: ✓ (${formatMs(timeMs)})`, "correct");
    } else {
      setFeedback(`Round ${roundNumber}: ✗ (${formatMs(timeMs)})`, "wrong");
    }

    state.results.push({
      round: roundNumber,
      word: state.currentWord,
      correct,
      timeMs
    });

    if (state.currentRoundIndex + 1 >= state.totalRounds) {
      setTimeout(() => {
        finishSession();
      }, 600);
    } else {
      state.currentRoundIndex += 1;
      setTimeout(() => {
        startRound();
      }, 600);
    }
  }

  function handleOptionClick(btn, ch) {
    if (state.roundFinished || !state.roundStartTime) return;

    const now = performance.now();
    const timeMs = now - state.roundStartTime;

    if (!state.targetKanjiSet.has(ch) || state.selectedKanjiSet.has(ch)) {
      btn.classList.add("wrong");
      endRound(timeMs, false);
      return;
    }

    state.selectedKanjiSet.add(ch);
    btn.classList.add("correct-step");

    if (state.selectedKanjiSet.size >= state.targetKanjiSet.size) {
      endRound(timeMs, true);
    }
  }

  function clearCountdown() {
    if (state.countdownTimerId != null) {
      clearInterval(state.countdownTimerId);
      state.countdownTimerId = null;
    }
    state.countdownRemaining = 0;
  }

  function resetSessionState() {
    state.currentRoundIndex = 0;
    state.currentWord = null;
    state.targetKanjiSet = new Set();
    state.selectedKanjiSet = new Set();
    state.roundStartTime = null;
    state.roundFinished = false;
    state.results = [];
    state.mistakes = 0;
    clearCountdown();
    clearTimerInterval();
    setTimer(0);
    updateMistakesLabel();
    setFeedback("", null);

    const promptEl = $("#kanji-react-prompt");
    if (promptEl) {
      promptEl.textContent = "Choose a word length to start.";
    }
    const grid = $("#kanji-react-grid");
    if (grid) grid.innerHTML = "";

    hideSummary(); // make sure recap is gone while playing
  }

  function startSessionWithCountdown() {
    const promptEl = $("#kanji-react-prompt");
    if (!promptEl) return;

    hideSummary();
    resetSessionState();
    setDifficultyCollapsed(true);

    state.countdownRemaining = 3;
    promptEl.textContent = `Get ready… starting in ${state.countdownRemaining} s`;

    state.countdownTimerId = setInterval(() => {
      state.countdownRemaining -= 1;
      if (state.countdownRemaining > 0) {
        promptEl.textContent = `Get ready… starting in ${state.countdownRemaining} s`;
      } else {
        clearCountdown();
        promptEl.textContent = "Go!";
        startRound();
      }
    }, 1000);
  }

  // -----------------------------
  // Session summary
  // -----------------------------
  function finishSession() {
    if (!state.results.length) return;

    localStats.sessions += 1;

    const times = state.results.map((r) => r.timeMs);
    const avgMs = times.reduce((acc, v) => acc + v, 0) / times.length;
    const bestSingle = Math.min(...times);

    if (localStats.bestAvgMs == null || avgMs < localStats.bestAvgMs) {
      localStats.bestAvgMs = avgMs;
    }
    if (localStats.bestSingleMs == null || bestSingle < localStats.bestSingleMs) {
      localStats.bestSingleMs = bestSingle;
    }
    saveLocalStats();
    updateBestStatsUI();

    const correctCount = state.results.filter((r) => r.correct).length;
    const xpGain = Math.max(5, correctCount * 7);
    addXp(xpGain);

    buildSummaryUI(avgMs, bestSingle, xpGain);
  }

  function buildSummaryUI(avgMs, bestSingle, xpGain) {
    const summaryCard = $("#kanji-react-summary-card");
    const headline = $("#kanji-react-summary-headline");
    const list = $("#kanji-react-results-list");
    const avgEl = $("#kanji-react-summary-avg");

    const correctCount = state.results.filter((r) => r.correct).length;
    const mistakes = state.mistakes;

    if (headline) {
      headline.textContent = `Difficulty: ${state.difficultyLength}-kanji words · Rounds: ${state.totalRounds} · Correct: ${correctCount} · Mistakes: ${mistakes}`;
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
        right.textContent = `${res.correct ? "✓" : "✗"} ${formatMs(res.timeMs)}`;

        row.appendChild(left);
        row.appendChild(right);
        list.appendChild(row);
      });
    }

    if (avgEl) {
      avgEl.textContent = `Average: ${formatMs(avgMs)} · Best this run: ${formatMs(
        bestSingle
      )} · Mistakes: ${mistakes} · XP gained: ${xpGain}`;
    }

    const shareText = buildShareCard(avgMs, bestSingle, xpGain, mistakes);
    const shareArea = $("#kanji-react-share-output");
    if (shareArea) {
      shareArea.value = shareText;
    }

    if (summaryCard) summaryCard.hidden = false; // only show at end
  }

  function hideSummary() {
    const summaryCard = $("#kanji-react-summary-card");
    if (summaryCard) summaryCard.hidden = true;
  }

  function buildShareCard(avgMs, bestSingle, xpGain, mistakes) {
    const lines = [];
    lines.push("⚡ Kanji Reaction – 5 Round Session");
    lines.push("");
    lines.push(`Difficulty: ${state.difficultyLength}-kanji words`);
    lines.push("");

    state.results.forEach((res) => {
      const mark = res.correct ? "✓" : "✗";
      lines.push(
        `Round ${res.round}: ${res.word.reading} (${res.word.meaning}) · ${mark} ${formatMs(
          res.timeMs
        )}`
      );
    });

    lines.push("");
    lines.push(`Average: ${formatMs(avgMs)}`);
    lines.push(`Best this run: ${formatMs(bestSingle)}`);
    lines.push(`Mistakes: ${mistakes}`);
    lines.push(`XP gained: ${xpGain}`);
    lines.push("");
    lines.push("Share your times and compare with friends!");

    return lines.join("\n");
  }

  // -----------------------------
  // Difficulty UI & buttons
  // -----------------------------
  function setDifficultyCollapsed(collapsed) {
    const row = document.querySelector(".kanji-react-difficulty-row");
    if (!row) return;
    if (collapsed) row.classList.add("is-collapsed");
    else row.classList.remove("is-collapsed");
  }

  function initDifficultyControls() {
    const buttons = document.querySelectorAll(
      ".kanji-react-difficulty-buttons .chip-toggle"
    );
    buttons.forEach((btn) => {
      btn.addEventListener("click", () => {
        const len = parseInt(btn.dataset.length, 10);
        if (!Number.isFinite(len) || len < 1) return;

        state.difficultyLength = len;

        buttons.forEach((b) => b.classList.remove("is-active"));
        btn.classList.add("is-active");

        clearCountdown();
        startSessionWithCountdown();
      });
    });
  }

  function initButtons() {
    const restartBtn = $("#kanji-react-restart-session");
    if (restartBtn) {
      restartBtn.addEventListener("click", () => {
        setDifficultyCollapsed(false);
        hideSummary();
        clearCountdown();
        resetSessionState();
      });
    }

    const copyBtn = $("#kanji-react-share-copy");
    if (copyBtn) {
      copyBtn.addEventListener("click", () => {
        const area = $("#kanji-react-share-output");
        if (!area) return;
        area.focus();
        area.select();
        const text = area.value || "";
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).catch(() => {});
        }
      });
    }
  }

  function initPage() {
    loadLocalStats();
    updateBestStatsUI();
    updateMistakesLabel();
    hideSummary(); // hidden by default

    loadKanjiWords().then(() => {
      initDifficultyControls();
      initButtons();
    });
  }

  bootstrap(initPage);
})();

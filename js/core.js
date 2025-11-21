// =====================================
// Japanese Verb Trainer - core.js
// Shared state, settings, stats, verbs, helpers & bootstrap
// =====================================

(function () {
  // -----------------------------
  // State
  // -----------------------------

  let allVerbs = [];

  const settings = {
    theme: "neon-dark", // "neon-dark" | "cool-light" | "warm-light" | "violet-dark"
    difficulty: "N5",   // N5 or N4
    quizMode: "sameVerb", // "sameVerb" | "sameForm" | "mixed"
    xp: 0
  };

  const stats = {
    quizGames: 0,
    quizBestScore: 0,

    endlessGames: 0,
    endlessBestScore: 0,
    endlessBestStreak: 0,

    recognitionCorrect: 0,
    groupCorrect: 0
  };

  const STORAGE_KEYS = {
    SETTINGS: "jvt_settings",
    HIGHSCORE: "jvt_quiz_highscore",
    STATS: "jvt_stats"
  };

  const FORM_CONFIG = {
    masu: "ます form",
    negative: "ない form",
    te: "て form",
    past: "た form"
  };

  const FORM_LABELS = {
    dictionary: "Dictionary",
    masu: "Polite (〜ます)",
    negative: "Negative (〜ない)",
    te: "Te-form (〜て)",
    past: "Past (〜た)"
  };

  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => document.querySelectorAll(selector);

  // -----------------------------
  // Motivational lines for level ups
  // -----------------------------

  const LEVEL_UP_QUOTES = [
    "Nice! One step closer to Japanese mastery ✨",
    "Your verbs are getting stronger 💪",
    "Tiny reps, big progress. Keep going!",
    "Future you says: ありがとう。",
    "More XP, less confusion. Great job!",
    "You’re building real muscle memory here.",
    "Another level unlocked. Don’t stop now.",
    "One more step on your JLPT journey.",
    "Consistency beats intensity. Proud of you.",
    "You’re making your future Japan trip easier already."
  ];

  function getRandomLevelQuote() {
    const idx = Math.floor(Math.random() * LEVEL_UP_QUOTES.length);
    return LEVEL_UP_QUOTES[idx];
  }

  // -----------------------------
  // Furigana
  // -----------------------------

  /** Furigana renderer: <ruby>食べる<rt>たべる</rt></ruby> */
  function renderFurigana(kanji, reading) {
    const ruby = document.createElement("ruby");
    const rt = document.createElement("rt");
    ruby.textContent = kanji;
    rt.textContent = reading;
    ruby.appendChild(rt);
    return ruby;
  }

  // -----------------------------
  // Settings / stats / localStorage
  // -----------------------------

  function loadSettingsFromStorage() {
    const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw);

      if (typeof parsed.theme === "string") {
        settings.theme = parsed.theme;
      } else if (typeof parsed.darkMode === "boolean") {
        // old boolean darkMode
        settings.theme = parsed.darkMode ? "neon-dark" : "cool-light";
      }

      if (parsed.difficulty === "N4" || parsed.difficulty === "N5") {
        settings.difficulty = parsed.difficulty;
      }

      if (
        parsed.quizMode === "sameVerb" ||
        parsed.quizMode === "sameForm" ||
        parsed.quizMode === "mixed"
      ) {
        settings.quizMode = parsed.quizMode;
      }

      if (typeof parsed.xp === "number" && parsed.xp >= 0) {
        settings.xp = parsed.xp;
      }
    } catch (e) {
      console.warn("Failed to parse settings:", e);
    }
  }

  function saveSettingsToStorage() {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  }

  function loadStatsFromStorage() {
    const raw = localStorage.getItem(STORAGE_KEYS.STATS);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw);
      stats.quizGames = Number.isFinite(parsed.quizGames) ? parsed.quizGames : 0;
      stats.quizBestScore = Number.isFinite(parsed.quizBestScore)
        ? parsed.quizBestScore
        : 0;

      stats.endlessGames = Number.isFinite(parsed.endlessGames)
        ? parsed.endlessGames
        : 0;
      stats.endlessBestScore = Number.isFinite(parsed.endlessBestScore)
        ? parsed.endlessBestScore
        : 0;
      stats.endlessBestStreak = Number.isFinite(parsed.endlessBestStreak)
        ? parsed.endlessBestStreak
        : 0;

      stats.recognitionCorrect = Number.isFinite(parsed.recognitionCorrect)
        ? parsed.recognitionCorrect
        : 0;
      stats.groupCorrect = Number.isFinite(parsed.groupCorrect)
        ? parsed.groupCorrect
        : 0;
    } catch (e) {
      console.warn("Failed to parse stats:", e);
    }
  }

  function saveStatsToStorage() {
    localStorage.setItem(STORAGE_KEYS.STATS, JSON.stringify(stats));
  }

  function getHighScore() {
    const raw = localStorage.getItem(STORAGE_KEYS.HIGHSCORE);
    const n = parseInt(raw, 10);
    return Number.isFinite(n) ? n : 0;
  }

  function setHighScore(score) {
    const current = getHighScore();
    if (score > current) {
      localStorage.setItem(STORAGE_KEYS.HIGHSCORE, String(score));
    }
  }

  // -----------------------------
  // Theme + XP + header meta
  // -----------------------------

  function applyTheme() {
    const body = document.body;
    body.classList.remove("light-theme", "dark-theme"); // old classes cleanup
    const theme = settings.theme || "neon-dark";
    body.setAttribute("data-theme", theme);
  }

  /**
   * Exponential-ish level system.
   * Level 1 -> 50 XP to next
   * Each level requires ~1.4x more XP than the previous.
   */
  function getLevelInfo(xp) {
    let level = 1;
    let requirement = 50;
    let remaining = xp || 0;

    while (remaining >= requirement) {
      remaining -= requirement;
      level += 1;
      requirement = Math.floor(requirement * 1.4);
    }

    return {
      level,
      intoLevel: remaining,
      perLevel: requirement
    };
  }

  function updateXpLabel() {
    const xp = settings.xp || 0;
    const { level, intoLevel, perLevel } = getLevelInfo(xp);
    const el = $("#xp-label");
    if (el) {
      el.textContent = `Lv. ${level} · ${intoLevel}/${perLevel} XP`;
    }

    const optionsXp = $("#options-xp-label");
    if (optionsXp) {
      optionsXp.textContent = String(xp);
    }
  }

  // -----------------------------
  // Level-up overlay / animation
  // -----------------------------

  function ensureLevelUpOverlay() {
    if (document.getElementById("levelup-overlay")) return;

    const overlay = document.createElement("div");
    overlay.id = "levelup-overlay";
    overlay.className = "levelup-overlay";

    overlay.innerHTML = `
      <div class="levelup-backdrop"></div>
      <div class="levelup-card">
        <div class="levelup-icon">✨</div>
        <h2 class="levelup-title">Level Up!</h2>
        <p id="levelup-level-text" class="levelup-level"></p>
        <p id="levelup-quote-text" class="levelup-quote"></p>
        <button id="levelup-close-btn" class="primary-btn levelup-close-btn">
          Nice!
        </button>
      </div>
    `;

    document.body.appendChild(overlay);

    const close = () => {
      overlay.classList.remove("is-visible");
    };

    const backdrop = overlay.querySelector(".levelup-backdrop");
    const closeBtn = overlay.querySelector("#levelup-close-btn");

    if (backdrop) backdrop.addEventListener("click", close);
    if (closeBtn) closeBtn.addEventListener("click", close);
  }

  function showLevelUp(level) {
    ensureLevelUpOverlay();

    const overlay = document.getElementById("levelup-overlay");
    if (!overlay) return;

    const levelTextEl = document.getElementById("levelup-level-text");
    const quoteTextEl = document.getElementById("levelup-quote-text");

    if (levelTextEl) {
      levelTextEl.textContent = `You reached level ${level}!`;
    }
    if (quoteTextEl) {
      quoteTextEl.textContent = getRandomLevelQuote();
    }

    overlay.classList.add("is-visible");
  }

  function addXp(amount) {
    if (!Number.isFinite(amount) || amount <= 0) return;

    const beforeXp = settings.xp || 0;
    const beforeInfo = getLevelInfo(beforeXp);

    settings.xp = beforeXp + amount;
    saveSettingsToStorage();
    updateXpLabel();

    const afterInfo = getLevelInfo(settings.xp || 0);

    // Level up check
    if (afterInfo.level > beforeInfo.level) {
      showLevelUp(afterInfo.level);
    }
  }

  function syncSettingsToUI() {
    const difficultyLabel = $("#current-difficulty-label");
    if (difficultyLabel) {
      difficultyLabel.textContent = `Level: ${settings.difficulty}`;
    }

    const highscore = getHighScore();
    const highscoreHeader = $("#highscore-label");
    const highscoreOptions = $("#options-highscore-label");
    if (highscoreHeader) {
      highscoreHeader.textContent = `Best Quiz: ${highscore} / 10`;
    }
    if (highscoreOptions) {
      highscoreOptions.textContent = `${highscore} / 10`;
    }

    // Theme radios
    $$('input[name="theme"]').forEach((input) => {
      input.checked = input.value === settings.theme;
    });

    // Difficulty radios
    $$('input[name="difficulty"]').forEach((input) => {
      input.checked = input.value === settings.difficulty;
    });

    // Quiz mode radios
    $$('input[name="quizMode"]').forEach((input) => {
      input.checked = input.value === settings.quizMode;
    });

    updateXpLabel();
  }

  // -----------------------------
  // Verb pool & helpers
  // -----------------------------

  function getCurrentVerbPool() {
    if (!allVerbs.length) return [];
    let pool = allVerbs.filter((v) => v.level === settings.difficulty);
    if (!pool.length) {
      pool = allVerbs.slice();
    }
    return pool;
  }

  function shuffleArray(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function pickRandomFormKey() {
    const keys = Object.keys(FORM_CONFIG);
    const index = Math.floor(Math.random() * keys.length);
    return keys[index];
  }

  // -----------------------------
  // Load verbs
  // -----------------------------

    function resolveDataUrl(fileName) {
    const path = window.location.pathname;

    // If HTML is inside /pages/, we need ../data/...
    if (path.includes("/pages/")) {
        return `../data/${fileName}`;
    }

    // If we're at the project root (index.html), just use data/...
    return `data/${fileName}`;
    }

    function loadVerbs() {
    const url = resolveDataUrl("verbs.json");

    return fetch(url)
        .then((res) => {
        if (!res.ok) throw new Error("Failed to load verbs.json");
        return res.json();
        })
        .then((data) => {
        if (!Array.isArray(data)) {
            throw new Error("verbs.json must contain an array of verbs");
        }
        allVerbs = data;
        })
        .catch((err) => {
        console.error(err);
        alert(
            "Could not load verbs.json.\nTip: If your browser blocks fetch() for local files, try serving this folder with a simple local server (e.g. `npx serve`)."
        );
        });
    }


  // -----------------------------
  // Bootstrap helper
  // -----------------------------
  // Each page calls: JVT.bootstrap(initFn)
  // This:
  //  - waits for DOMContentLoaded
  //  - loads settings & stats
  //  - applies theme & syncs header
  //  - creates level-up overlay
  //  - loads verbs.json
  //  - then calls initFn()

  function bootstrap(pageInit) {
    document.addEventListener("DOMContentLoaded", async () => {
      loadSettingsFromStorage();
      loadStatsFromStorage();
      applyTheme();
      syncSettingsToUI();

      // Make sure level-up overlay exists on every page
      ensureLevelUpOverlay();

      await loadVerbs();
      if (typeof pageInit === "function") {
        pageInit();
      }
    });
  }

  // -----------------------------
  // Expose API
  // -----------------------------

  window.JVT = {
    // state
    settings,
    stats,

    // constants
    STORAGE_KEYS,
    FORM_CONFIG,
    FORM_LABELS,

    // utils
    $,
    $$,
    renderFurigana,
    loadSettingsFromStorage,
    saveSettingsToStorage,
    loadStatsFromStorage,
    saveStatsToStorage,
    getHighScore,
    setHighScore,
    applyTheme,
    getLevelInfo,
    updateXpLabel,
    addXp,
    syncSettingsToUI,
    getCurrentVerbPool,
    shuffleArray,
    pickRandomFormKey,
    loadVerbs,
    bootstrap
  };
})();

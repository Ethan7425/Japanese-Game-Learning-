// =====================================
// Options Page - options.js
// =====================================

(function () {
  const {
    $,
    $$,
    settings,
    stats,
    STORAGE_KEYS,
    applyTheme,
    saveSettingsToStorage,
    saveStatsToStorage,
    syncSettingsToUI,
    bootstrap
  } = JVT;

  function initOptionsPage() {
    // Theme radios
    $$('input[name="theme"]').forEach((input) => {
      input.addEventListener("change", (e) => {
        if (!e.target.checked) return;
        settings.theme = e.target.value;
        saveSettingsToStorage();
        applyTheme();
        syncSettingsToUI();
      });
    });

    // Difficulty radios
    $$('input[name="difficulty"]').forEach((input) => {
      input.addEventListener("change", (e) => {
        if (!e.target.checked) return;
        settings.difficulty = e.target.value;
        saveSettingsToStorage();
        syncSettingsToUI();
      });
    });

    // Quiz mode radios
    $$('input[name="quizMode"]').forEach((input) => {
      input.addEventListener("change", (e) => {
        if (!e.target.checked) return;
        settings.quizMode = e.target.value;
        saveSettingsToStorage();
        syncSettingsToUI();
      });
    });

    const resetBtn = $("#reset-progress-btn");
    if (resetBtn) {
      resetBtn.addEventListener("click", () => {
        if (
          !confirm(
            "This will reset your settings, XP, stats and quiz high score stored in localStorage. Continue?"
          )
        ) {
          return;
        }

        localStorage.removeItem(STORAGE_KEYS.SETTINGS);
        localStorage.removeItem(STORAGE_KEYS.HIGHSCORE);
        localStorage.removeItem(STORAGE_KEYS.STATS);

        Object.assign(settings, {
          theme: "neon-dark",
          difficulty: "N5",
          quizMode: "sameVerb",
          xp: 0
        });

        Object.assign(stats, {
          quizGames: 0,
          quizBestScore: 0,
          endlessGames: 0,
          endlessBestScore: 0,
          endlessBestStreak: 0,
          recognitionCorrect: 0,
          groupCorrect: 0
        });

        applyTheme();
        saveSettingsToStorage();
        saveStatsToStorage();
        syncSettingsToUI();
      });
    }

    syncSettingsToUI();
  }

  JVT.initOptionsPage = initOptionsPage;
  bootstrap(initOptionsPage);
})();

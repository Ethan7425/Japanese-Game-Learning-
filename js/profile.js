// =====================================
// Profile Page - profile.js
// =====================================

(function () {
  const {
    $,
    settings,
    stats,
    getLevelInfo,
    bootstrap
  } = JVT;

  function syncStatsToProfile() {
    const xp = settings.xp || 0;
    const { level } = getLevelInfo(xp);

    const levelEl = $("#profile-level");
    if (levelEl) {
      levelEl.textContent = `Lv. ${level}`;
    }

    const xpEl = $("#profile-total-xp");
    if (xpEl) {
      xpEl.textContent = String(xp);
    }

    const quizGamesEl = $("#profile-quiz-games");
    if (quizGamesEl) {
      quizGamesEl.textContent = String(stats.quizGames);
    }

    const quizBestEl = $("#profile-quiz-best");
    if (quizBestEl) {
      quizBestEl.textContent = `${stats.quizBestScore} / 10`;
    }

    const endlessGamesEl = $("#profile-endless-games");
    if (endlessGamesEl) {
      endlessGamesEl.textContent = String(stats.endlessGames);
    }

    const endlessBestScoreEl = $("#profile-endless-best-score");
    if (endlessBestScoreEl) {
      endlessBestScoreEl.textContent = String(stats.endlessBestScore);
    }

    const endlessBestStreakEl = $("#profile-endless-best-streak");
    if (endlessBestStreakEl) {
      endlessBestStreakEl.textContent = String(stats.endlessBestStreak);
    }

    const recogCorrectEl = $("#profile-recog-correct");
    if (recogCorrectEl) {
      recogCorrectEl.textContent = String(stats.recognitionCorrect);
    }

    const groupCorrectEl = $("#profile-group-correct");
    if (groupCorrectEl) {
      groupCorrectEl.textContent = String(stats.groupCorrect);
    }
  }

  function buildShareCardText() {
    const xp = settings.xp || 0;
    const { level } = getLevelInfo(xp);

    const lines = [];
    lines.push("╔══════════════════════════════╗");
    lines.push("║  Japanese Verb Trainer Card  ║");
    lines.push("╚══════════════════════════════╝");
    lines.push("");
    lines.push(`Level: ${level}`);
    lines.push(`XP: ${xp}`);
    lines.push("");
    lines.push("Quick Quiz:");
    lines.push(`  Best Score: ${stats.quizBestScore} / 10`);
    lines.push(`  Games Played: ${stats.quizGames}`);
    lines.push("");
    lines.push("Endless Mode:");
    lines.push(`  Best Score: ${stats.endlessBestScore}`);
    lines.push(`  Best Streak: ${stats.endlessBestStreak}`);
    lines.push(`  Games Played: ${stats.endlessGames}`);
    lines.push("");
    lines.push("Mini Games:");
    lines.push(`  Form Game Correct: ${stats.recognitionCorrect}`);
    lines.push(`  Group Game Correct: ${stats.groupCorrect}`);
    lines.push("");
    lines.push("Share your card and compare progress!");

    return lines.join("\n");
  }

  function initProfilePage() {
    syncStatsToProfile();

    const shareBtn = $("#profile-share-btn");
    if (shareBtn) {
      shareBtn.addEventListener("click", () => {
        const text = buildShareCardText();
        const out = $("#profile-share-output");
        if (out) {
          out.value = text;
          out.focus();
          out.select();
        }
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).catch(() => {
            // ignore
          });
        }
      });
    }
  }

  JVT.initProfilePage = initProfilePage;
  bootstrap(initProfilePage);
})();

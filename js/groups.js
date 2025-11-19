// =====================================
// Verb Group Game - groups.js
// =====================================

(function () {
  const {
    $,
    $$,
    getCurrentVerbPool,
    addXp,
    stats,
    saveStatsToStorage,
    bootstrap
  } = JVT;

  const groupState = {
    currentVerb: null
  };

  function groupStartRound() {
    const pool = getCurrentVerbPool();
    if (!pool.length || !$("#group-verb-furigana")) return;

    const verb = pool[Math.floor(Math.random() * pool.length)];
    groupState.currentVerb = verb;

    const furiganaContainer = $("#group-verb-furigana");
    if (furiganaContainer) {
      furiganaContainer.innerHTML = "";
      furiganaContainer.appendChild(
        JVT.renderFurigana(verb.dictionary, verb.furigana)
      );
    }

    const meaningEl = $("#group-verb-meaning");
    if (meaningEl) {
      meaningEl.textContent = `Meaning: ${verb.meaning}`;
    }

    $$(".group-option-btn").forEach((btn) => {
      btn.disabled = false;
      btn.classList.remove("correct", "wrong");
    });

    const feedbackEl = $("#group-feedback");
    if (feedbackEl) {
      feedbackEl.textContent = "";
      feedbackEl.className = "quiz-feedback";
    }
  }

  function groupHandleAnswer(button, chosenGroupStr) {
    const verb = groupState.currentVerb;
    if (!verb) return;

    const chosen = parseInt(chosenGroupStr, 10);
    const correct = verb.group;

    $$(".group-option-btn").forEach((btn) => {
      btn.disabled = true;
      if (parseInt(btn.dataset.group, 10) === correct) {
        btn.classList.add("correct");
      }
    });

    const feedbackEl = $("#group-feedback");
    if (chosen === correct) {
      addXp(3);
      stats.groupCorrect += 1;
      saveStatsToStorage();
      if (feedbackEl) {
        feedbackEl.textContent = "Correct! ✅ (+3 XP)";
        feedbackEl.className = "quiz-feedback correct";
      }
    } else {
      button.classList.add("wrong");
      if (feedbackEl) {
        feedbackEl.textContent = `Incorrect. This verb is Group ${correct}.`;
        feedbackEl.className = "quiz-feedback wrong";
      }
    }
  }

  function initGroupsPage() {
    $$(".group-option-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const group = btn.getAttribute("data-group");
        groupHandleAnswer(btn, group);
      });
    });

    const nextBtn = $("#group-next-btn");
    if (nextBtn) {
      nextBtn.addEventListener("click", groupStartRound);
    }

    groupStartRound();
  }

  JVT.initGroupsPage = initGroupsPage;
  bootstrap(initGroupsPage);
})();

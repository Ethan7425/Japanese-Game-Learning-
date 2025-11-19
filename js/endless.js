// =====================================
// Endless Mode - endless.js
// =====================================

(function () {
  const {
    $,
    $$,
    FORM_CONFIG,
    getCurrentVerbPool,
    shuffleArray,
    pickRandomFormKey,
    stats,
    saveStatsToStorage,
    addXp,
    bootstrap,
    settings
  } = JVT;

  const endlessState = {
    score: 0,
    streak: 0,
    maxStreak: 0,
    lives: 3,
    currentVerb: null,
    currentFormKey: null,
    answered: false
  };

  function endlessUpdateStatus() {
    const scoreEl = $("#endless-score");
    const streakEl = $("#endless-streak");
    const livesEl = $("#endless-lives");
    if (scoreEl) scoreEl.textContent = String(endlessState.score);
    if (streakEl) streakEl.textContent = String(endlessState.streak);
    if (livesEl) {
      const fullHearts = "♥".repeat(Math.max(0, endlessState.lives));
      const emptyHearts = "♡".repeat(Math.max(0, 3 - endlessState.lives));
      livesEl.textContent = fullHearts + emptyHearts;
    }
  }

  function generateWrongAnswersSameVerb(formKey, verb) {
    const keys = Object.keys(FORM_CONFIG).filter((k) => k !== formKey);
    const wrongs = [];
    for (const k of keys) {
      const candidate = verb.forms?.[k];
      if (candidate) wrongs.push(candidate);
    }
    return wrongs.slice(0, 3);
  }

  function generateWrongAnswersSameForm(correctValue, formKey, pool, questionVerb) {
    const wrongs = new Set();
    const shuffled = shuffleArray(pool);
    for (const verb of shuffled) {
      if (verb === questionVerb) continue;
      const candidate = verb.forms?.[formKey];
      if (candidate && candidate !== correctValue) {
        wrongs.add(candidate);
      }
      if (wrongs.size >= 3) break;
    }

    if (wrongs.size < 3 && questionVerb && questionVerb.forms) {
      for (const key of Object.keys(FORM_CONFIG)) {
        if (key === formKey) continue;
        const candidate = questionVerb.forms[key];
        if (candidate && candidate !== correctValue) {
          wrongs.add(candidate);
        }
        if (wrongs.size >= 3) break;
      }
    }

    return Array.from(wrongs).slice(0, 3);
  }

  function chooseQuizModeForQuestion() {
    let mode = settings.quizMode;
    if (mode === "mixed") {
      mode = Math.random() < 0.5 ? "sameVerb" : "sameForm";
    }
    return mode;
  }

  function endlessLoadNext() {
    if (!$("#endless-answers")) return;

    if (endlessState.lives <= 0) {
      endlessEnd();
      return;
    }

    const feedbackEl = $("#endless-feedback");
    const answersContainer = $("#endless-answers");
    const nextBtn = $("#endless-next-btn");

    const pool = getCurrentVerbPool();
    if (!pool.length) return;

    const verb = pool[Math.floor(Math.random() * pool.length)];
    const formKey = pickRandomFormKey();

    endlessState.currentVerb = verb;
    endlessState.currentFormKey = formKey;
    endlessState.answered = false;

    const furiganaContainer = $("#endless-verb-furigana");
    if (furiganaContainer) {
      furiganaContainer.innerHTML = "";
      furiganaContainer.appendChild(
        JVT.renderFurigana(verb.dictionary, verb.furigana)
      );
    }

    const questionText = $("#endless-question-text");
    if (questionText) {
      questionText.textContent = `Which option is the ${FORM_CONFIG[formKey]} for this verb?`;
    }

    const correctAnswer = verb.forms[formKey];

    let wrongAnswers;
    const mode = chooseQuizModeForQuestion();
    if (mode === "sameForm") {
      wrongAnswers = generateWrongAnswersSameForm(
        correctAnswer,
        formKey,
        pool,
        verb
      );
    } else {
      wrongAnswers = generateWrongAnswersSameVerb(formKey, verb);
    }

    const allAnswers = shuffleArray([correctAnswer, ...wrongAnswers]);

    answersContainer.innerHTML = "";
    allAnswers.forEach((value) => {
      const btn = document.createElement("button");
      btn.className = "quiz-answer-btn";
      btn.textContent = value;
      btn.addEventListener("click", () =>
        endlessHandleAnswer(btn, correctAnswer)
      );
      answersContainer.appendChild(btn);
    });

    if (feedbackEl) {
      feedbackEl.textContent = "";
      feedbackEl.className = "quiz-feedback";
    }
    if (nextBtn) nextBtn.disabled = true;

    endlessUpdateStatus();
  }

  function endlessHandleAnswer(button, correctAnswer) {
    if (endlessState.answered) return;
    endlessState.answered = true;

    const isCorrect = button.textContent === correctAnswer;
    const feedbackEl = $("#endless-feedback");
    const nextBtn = $("#endless-next-btn");

    $$("#endless-answers .quiz-answer-btn").forEach((btn) => {
      btn.disabled = true;
      if (btn.textContent === correctAnswer) {
        btn.classList.add("correct");
      }
    });

    if (isCorrect) {
      endlessState.score += 1;
      endlessState.streak += 1;
      endlessState.maxStreak = Math.max(
        endlessState.maxStreak,
        endlessState.streak
      );
      if (feedbackEl) {
        feedbackEl.textContent = "Correct! ✅";
        feedbackEl.className = "quiz-feedback correct";
      }
    } else {
      button.classList.add("wrong");
      endlessState.lives -= 1;
      endlessState.streak = 0;
      if (feedbackEl) {
        feedbackEl.textContent = `Incorrect. Correct answer: ${correctAnswer}`;
        feedbackEl.className = "quiz-feedback wrong";
      }
    }

    endlessUpdateStatus();

    if (endlessState.lives <= 0) {
      endlessEnd();
      return;
    }

    if (nextBtn) nextBtn.disabled = false;
  }

  function endlessStart() {
    endlessState.score = 0;
    endlessState.streak = 0;
    endlessState.maxStreak = 0;
    endlessState.lives = 3;
    endlessState.answered = false;

    const summaryEl = $("#endless-summary");
    const feedbackEl = $("#endless-feedback");
    const nextBtn = $("#endless-next-btn");

    if (summaryEl) summaryEl.hidden = true;
    if (feedbackEl) {
      feedbackEl.textContent = "";
      feedbackEl.className = "quiz-feedback";
    }
    if (nextBtn) nextBtn.disabled = true;

    endlessUpdateStatus();
    endlessLoadNext();
  }

  function endlessEnd() {
    const summaryEl = $("#endless-summary");
    const summaryTextEl = $("#endless-summary-text");
    const summaryXpEl = $("#endless-summary-xp");

    stats.endlessGames += 1;
    if (endlessState.score > stats.endlessBestScore) {
      stats.endlessBestScore = endlessState.score;
    }
    if (endlessState.maxStreak > stats.endlessBestStreak) {
      stats.endlessBestStreak = endlessState.maxStreak;
    }
    saveStatsToStorage();

    const xpGain = endlessState.score * 5 + endlessState.maxStreak * 2;
    addXp(xpGain);

    if (summaryTextEl) {
      summaryTextEl.textContent = `Final score: ${endlessState.score} · Longest streak: ${endlessState.maxStreak}`;
    }
    if (summaryXpEl) {
      summaryXpEl.textContent = `You gained ${xpGain} XP.`;
    }
    if (summaryEl) summaryEl.hidden = false;
  }

  function initEndlessPage() {
    const nextBtn = $("#endless-next-btn");
    if (nextBtn) {
      nextBtn.addEventListener("click", endlessLoadNext);
    }

    const restartBtn = $("#endless-restart-btn");
    if (restartBtn) {
      restartBtn.addEventListener("click", () => {
        endlessStart();
        const summaryEl = $("#endless-summary");
        if (summaryEl) summaryEl.hidden = true;
      });
    }

    endlessStart();
  }

  JVT.initEndlessPage = initEndlessPage;
  bootstrap(initEndlessPage);
})();

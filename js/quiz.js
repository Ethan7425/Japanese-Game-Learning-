// =====================================
// Quick Quiz - quiz.js
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
    setHighScore,
    saveStatsToStorage,
    addXp,
    syncSettingsToUI,
    bootstrap,
    settings
  } = JVT;

  const quizState = {
    currentQuestion: 0,
    totalQuestions: 10,
    score: 0,
    currentVerb: null,
    currentFormKey: null,
    answered: false
  };

  function quizUpdateStatus() {
    const qNum = $("#quiz-question-number");
    const scoreEl = $("#quiz-score");
    if (qNum) {
      qNum.textContent = String(
        Math.min(quizState.currentQuestion + 1, quizState.totalQuestions)
      );
    }
    if (scoreEl) {
      scoreEl.textContent = String(quizState.score);
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

  function quizLoadNextQuestion() {
    if (!$("#quiz-answers")) return;

    const feedbackEl = $("#quiz-feedback");
    const answersContainer = $("#quiz-answers");
    const nextBtn = $("#quiz-next-btn");

    if (quizState.currentQuestion >= quizState.totalQuestions) {
      quizEnd();
      return;
    }

    const pool = getCurrentVerbPool();
    if (!pool.length) return;

    const verb = pool[Math.floor(Math.random() * pool.length)];
    const formKey = pickRandomFormKey();

    quizState.currentVerb = verb;
    quizState.currentFormKey = formKey;
    quizState.answered = false;

    const furiganaContainer = $("#quiz-verb-furigana");
    if (furiganaContainer) {
      furiganaContainer.innerHTML = "";
      furiganaContainer.appendChild(
        JVT.renderFurigana(verb.dictionary, verb.furigana)
      );
    }

    const questionText = $("#quiz-question-text");
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
        quizHandleAnswer(btn, correctAnswer)
      );
      answersContainer.appendChild(btn);
    });

    if (feedbackEl) {
      feedbackEl.textContent = "";
      feedbackEl.className = "quiz-feedback";
    }
    if (nextBtn) nextBtn.disabled = true;

    quizUpdateStatus();
  }

  function quizHandleAnswer(button, correctAnswer) {
    if (quizState.answered) return;
    quizState.answered = true;

    const userAnswer = button.textContent;
    const isCorrect = userAnswer === correctAnswer;

    const feedbackEl = $("#quiz-feedback");
    const nextBtn = $("#quiz-next-btn");

    $$(".quiz-answer-btn").forEach((btn) => {
      btn.disabled = true;
      if (btn.textContent === correctAnswer) {
        btn.classList.add("correct");
      }
    });

    if (isCorrect) {
      quizState.score += 1;
      if (feedbackEl) {
        feedbackEl.textContent = "Correct! ✅";
        feedbackEl.className = "quiz-feedback correct";
      }
    } else {
      button.classList.add("wrong");
      if (feedbackEl) {
        feedbackEl.textContent = `Incorrect. Correct answer: ${correctAnswer}`;
        feedbackEl.className = "quiz-feedback wrong";
      }
    }

    if (nextBtn) nextBtn.disabled = false;
    quizState.currentQuestion += 1;
    quizUpdateStatus();
  }

  function quizStartNew() {
    quizState.currentQuestion = 0;
    quizState.score = 0;
    quizState.answered = false;

    const summary = $("#quiz-summary");
    const feedbackEl = $("#quiz-feedback");
    const nextBtn = $("#quiz-next-btn");

    if (summary) summary.hidden = true;
    if (feedbackEl) {
      feedbackEl.textContent = "";
      feedbackEl.className = "quiz-feedback";
    }
    if (nextBtn) nextBtn.disabled = true;

    quizUpdateStatus();
    quizLoadNextQuestion();
  }

  function quizEnd() {
    setHighScore(quizState.score);

    stats.quizGames += 1;
    if (quizState.score > stats.quizBestScore) {
      stats.quizBestScore = quizState.score;
    }
    saveStatsToStorage();

    const xpGain = quizState.score * 8; // same as before
    addXp(xpGain);

    syncSettingsToUI();

    const summaryEl = $("#quiz-summary");
    const summaryTextEl = $("#quiz-summary-text");
    const summaryXpEl = $("#quiz-summary-xp");
    if (summaryTextEl) {
      summaryTextEl.textContent = `You scored ${quizState.score} / ${quizState.totalQuestions}.`;
    }
    if (summaryXpEl) {
      summaryXpEl.textContent = `You gained ${xpGain} XP.`;
    }
    if (summaryEl) summaryEl.hidden = false;
  }

  function initQuizPage() {
    const nextQuestionBtn = $("#quiz-next-btn");
    if (nextQuestionBtn) {
      nextQuestionBtn.addEventListener("click", quizLoadNextQuestion);
    }

    const restartBtn = $("#quiz-restart-btn");
    if (restartBtn) {
      restartBtn.addEventListener("click", () => {
        quizStartNew();
        const summaryEl = $("#quiz-summary");
        if (summaryEl) summaryEl.hidden = true;
      });
    }

    quizStartNew();
  }

  JVT.initQuizPage = initQuizPage;
  bootstrap(initQuizPage);
})();

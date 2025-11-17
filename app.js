// =====================================
// Japanese Verb Trainer - app.js
// Multi-page version with quiz modes
// =====================================

let allVerbs = [];
let settings = {
  darkMode: true,
  difficulty: "N5",
  quizMode: "sameVerb" // "sameVerb" or "sameForm"
};
let quizState = {
  currentQuestion: 0,
  totalQuestions: 10,
  score: 0,
  currentVerb: null,
  currentFormKey: null,
  answered: false
};

const STORAGE_KEYS = {
  SETTINGS: "jvt_settings",
  HIGHSCORE: "jvt_quiz_highscore"
};

const FORM_CONFIG = {
  masu: "ます form",
  negative: "ない form",
  te: "て form",
  past: "た form"
};

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => document.querySelectorAll(selector);

/** Furigana renderer */
function renderFurigana(kanji, reading) {
  const ruby = document.createElement("ruby");
  const rt = document.createElement("rt");
  ruby.textContent = kanji;
  rt.textContent = reading;
  ruby.appendChild(rt);
  return ruby;
}

/** Settings / localStorage */
function loadSettingsFromStorage() {
  const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
  if (!raw) return;
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed.darkMode === "boolean") {
      settings.darkMode = parsed.darkMode;
    }
    if (parsed.difficulty === "N4" || parsed.difficulty === "N5") {
      settings.difficulty = parsed.difficulty;
    }
    if (parsed.quizMode === "sameVerb" || parsed.quizMode === "sameForm") {
      settings.quizMode = parsed.quizMode;
    }
  } catch (e) {
    console.warn("Failed to parse settings:", e);
  }
}

function saveSettingsToStorage() {
  localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
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

/** Theme + UI sync */
function applyTheme() {
  const body = document.body;
  body.classList.remove("light-theme", "dark-theme");
  if (settings.darkMode) {
    body.classList.add("dark-theme");
  } else {
    body.classList.add("light-theme");
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

  const darkToggle = $("#dark-mode-toggle");
  if (darkToggle) {
    darkToggle.checked = settings.darkMode;
  }

  $$('input[name="difficulty"]').forEach((input) => {
    input.checked = input.value === settings.difficulty;
  });

  $$('input[name="quizMode"]').forEach((input) => {
    input.checked = input.value === settings.quizMode;
  });
}

/** Verb pool by difficulty */
function getCurrentVerbPool() {
  if (!allVerbs.length) return [];
  let pool = allVerbs.filter((v) => v.level === settings.difficulty);
  if (!pool.length) {
    pool = allVerbs.slice();
  }
  return pool;
}

/** Study mode */
let currentStudyVerb = null;

function loadRandomStudyVerb() {
  const pool = getCurrentVerbPool();
  if (!pool.length) return;

  const randomIndex = Math.floor(Math.random() * pool.length);
  currentStudyVerb = pool[randomIndex];

  const furiganaContainer = $("#study-verb-furigana");
  const infoContainer = $("#study-verb-info");

  if (furiganaContainer) {
    furiganaContainer.innerHTML = "";
    furiganaContainer.appendChild(
      renderFurigana(currentStudyVerb.dictionary, currentStudyVerb.furigana)
    );
  }

  if (infoContainer) {
    infoContainer.innerHTML = `
      <div><strong>Meaning:</strong> ${currentStudyVerb.meaning}</div>
      <div><strong>Group:</strong> ${currentStudyVerb.group}</div>
    `;
  }

  if ($("#study-form-masu")) $("#study-form-masu").textContent = "？？？";
  if ($("#study-form-negative")) $("#study-form-negative").textContent = "？？？";
  if ($("#study-form-te")) $("#study-form-te").textContent = "？？？";
  if ($("#study-form-past")) $("#study-form-past").textContent = "？？？";
}

function revealStudyForm(formKey) {
  if (!currentStudyVerb) return;
  const value = currentStudyVerb.forms?.[formKey];
  if (!value) return;

  switch (formKey) {
    case "masu":
      if ($("#study-form-masu")) $("#study-form-masu").textContent = value;
      break;
    case "negative":
      if ($("#study-form-negative")) $("#study-form-negative").textContent = value;
      break;
    case "te":
      if ($("#study-form-te")) $("#study-form-te").textContent = value;
      break;
    case "past":
      if ($("#study-form-past")) $("#study-form-past").textContent = value;
      break;
  }
}

/** Quiz logic */
function updateQuizStatus() {
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

/**
 * Same verb, different forms:
 * - All options are conjugations of the same verb
 * - Wrong answers: other forms (ます/ない/て/た) of that verb
 */
function generateWrongAnswersSameVerb(formKey, verb) {
  const keys = Object.keys(FORM_CONFIG).filter((k) => k !== formKey);
  const wrongs = [];
  for (const k of keys) {
    const candidate = verb.forms?.[k];
    if (candidate) wrongs.push(candidate);
  }
  // We only need up to 3
  return wrongs.slice(0, 3);
}

/**
 * Same form, different verbs:
 * - All options are e.g. て-form across different verbs
 * - Wrong answers: same form key from other verbs
 */
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

  // Fallback: if not enough, fill from other forms of the same verb
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

function loadNextQuestion() {
  if (!$("#quiz-answers")) return; // not on quiz page

  const feedbackEl = $("#quiz-feedback");
  const answersContainer = $("#quiz-answers");
  const nextBtn = $("#quiz-next-btn");

  if (quizState.currentQuestion >= quizState.totalQuestions) {
    endQuiz();
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
      renderFurigana(verb.dictionary, verb.furigana)
    );
  }

  const questionText = $("#quiz-question-text");
  if (questionText) {
    questionText.textContent = `Which option is the ${FORM_CONFIG[formKey]} for this verb?`;
  }

  const correctAnswer = verb.forms[formKey];

  let wrongAnswers;
  if (settings.quizMode === "sameForm") {
    // Same form, different verbs
    wrongAnswers = generateWrongAnswersSameForm(correctAnswer, formKey, pool, verb);
  } else {
    // Same verb, different forms (default)
    wrongAnswers = generateWrongAnswersSameVerb(formKey, verb);
  }

  const allAnswers = shuffleArray([correctAnswer, ...wrongAnswers]);

  answersContainer.innerHTML = "";
  allAnswers.forEach((value) => {
    const btn = document.createElement("button");
    btn.className = "quiz-answer-btn";
    btn.textContent = value;
    btn.addEventListener("click", () => handleQuizAnswer(btn, correctAnswer));
    answersContainer.appendChild(btn);
  });

  if (feedbackEl) {
    feedbackEl.textContent = "";
    feedbackEl.className = "quiz-feedback";
  }
  if (nextBtn) nextBtn.disabled = true;

  updateQuizStatus();
}

function handleQuizAnswer(button, correctAnswer) {
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
  updateQuizStatus();
}

function startNewQuiz() {
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

  updateQuizStatus();
  loadNextQuestion();
}

function endQuiz() {
  setHighScore(quizState.score);
  syncSettingsToUI();

  const summaryEl = $("#quiz-summary");
  const summaryTextEl = $("#quiz-summary-text");
  if (summaryTextEl) {
    summaryTextEl.textContent = `You scored ${quizState.score} / ${quizState.totalQuestions}.`;
  }
  if (summaryEl) summaryEl.hidden = false;
}

/** Page-specific setup */
function initStudyPage() {
  $$(".study-form-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const formKey = btn.getAttribute("data-form");
      revealStudyForm(formKey);
    });
  });

  const nextVerbBtn = $("#study-next-verb");
  if (nextVerbBtn) {
    nextVerbBtn.addEventListener("click", loadRandomStudyVerb);
  }

  loadRandomStudyVerb();
}

function initQuizPage() {
  const nextQuestionBtn = $("#quiz-next-btn");
  if (nextQuestionBtn) {
    nextQuestionBtn.addEventListener("click", loadNextQuestion);
  }

  const restartBtn = $("#quiz-restart-btn");
  if (restartBtn) {
    restartBtn.addEventListener("click", () => {
      startNewQuiz();
      const summaryEl = $("#quiz-summary");
      if (summaryEl) summaryEl.hidden = true;
    });
  }

  startNewQuiz();
}

function initOptionsPage() {
  const darkToggle = $("#dark-mode-toggle");
  if (darkToggle) {
    darkToggle.addEventListener("change", (e) => {
      settings.darkMode = e.target.checked;
      saveSettingsToStorage();
      applyTheme();
      syncSettingsToUI();
    });
  }

  $$('input[name="difficulty"]').forEach((input) => {
    input.addEventListener("change", (e) => {
      if (!e.target.checked) return;
      settings.difficulty = e.target.value;
      saveSettingsToStorage();
      syncSettingsToUI();
    });
  });

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
          "This will reset your settings and quiz high score stored in localStorage. Continue?"
        )
      ) {
        return;
      }

      localStorage.removeItem(STORAGE_KEYS.SETTINGS);
      localStorage.removeItem(STORAGE_KEYS.HIGHSCORE);

      settings = { darkMode: true, difficulty: "N5", quizMode: "sameVerb" };
      applyTheme();
      syncSettingsToUI();
    });
  }

  syncSettingsToUI();
}

/** Load verbs from JSON */
function loadVerbs() {
  return fetch("verbs.json")
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

/** Boot */
document.addEventListener("DOMContentLoaded", async () => {
  loadSettingsFromStorage();
  applyTheme();
  syncSettingsToUI();

  // Load verbs (needed for study + quiz; harmless for menu/options)
  await loadVerbs();

  const page = document.body.dataset.page;

  if (page === "study") {
    initStudyPage();
  } else if (page === "quiz") {
    initQuizPage();
  } else if (page === "options") {
    initOptionsPage();
  } else {
    // menu: nothing special beyond header meta
    syncSettingsToUI();
  }
});

// =====================================
// Japanese Verb Trainer - app.js
// Multi-page + quiz modes + XP + stats + profile + themes
// =====================================

let allVerbs = [];

// Global settings stored in localStorage
let settings = {
  theme: "neon-dark",      // "neon-dark" | "cool-light" | "warm-light" | "violet-dark"
  difficulty: "N5",        // N5 or N4
  quizMode: "sameVerb",    // "sameVerb" | "sameForm" | "mixed"
  xp: 0                    // total XP across the whole site
};

// Stats stored separately
let stats = {
  quizGames: 0,
  quizBestScore: 0,

  endlessGames: 0,
  endlessBestScore: 0,
  endlessBestStreak: 0,

  recognitionCorrect: 0,
  groupCorrect: 0
};

// Quick Quiz state (10 questions)
let quizState = {
  currentQuestion: 0,
  totalQuestions: 10,
  score: 0,
  currentVerb: null,
  currentFormKey: null,
  answered: false
};

// Endless Mode state
let endlessState = {
  score: 0,
  streak: 0,
  maxStreak: 0,
  lives: 3,
  currentVerb: null,
  currentFormKey: null,
  answered: false
};

// Form recognition game state
let recognitionState = {
  currentVerb: null,
  currentFormKey: null
};

// Group game state
let groupState = {
  currentVerb: null
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

/** Furigana renderer: <ruby>食べる<rt>たべる</rt></ruby> */
function renderFurigana(kanji, reading) {
  const ruby = document.createElement("ruby");
  const rt = document.createElement("rt");
  ruby.textContent = kanji;
  rt.textContent = reading;
  ruby.appendChild(rt);
  return ruby;
}

/** Settings / stats / localStorage */

function loadSettingsFromStorage() {
  const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
  if (!raw) return;
  try {
    const parsed = JSON.parse(raw);

    // Theme (new system)
    if (typeof parsed.theme === "string") {
      settings.theme = parsed.theme;
    } else if (typeof parsed.darkMode === "boolean") {
      // Backwards compatibility with old boolean darkMode
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

/** Theme + XP + header meta */

function applyTheme() {
  const body = document.body;
  body.classList.remove("light-theme", "dark-theme"); // cleanup old classes
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
  let requirement = 50; // XP needed for next level at current level
  let remaining = xp || 0;

  while (remaining >= requirement) {
    remaining -= requirement;
    level += 1;
    requirement = Math.floor(requirement * 1.4); // increase requirement
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

function addXp(amount) {
  if (!Number.isFinite(amount) || amount <= 0) return;
  settings.xp = (settings.xp || 0) + amount;
  saveSettingsToStorage();
  updateXpLabel();
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

/** Verb pool by difficulty */

function getCurrentVerbPool() {
  if (!allVerbs.length) return [];
  let pool = allVerbs.filter((v) => v.level === settings.difficulty);
  if (!pool.length) {
    pool = allVerbs.slice();
  }
  return pool;
}

/** Study Mode */

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
      if ($("#study-form-negative"))
        $("#study-form-negative").textContent = value;
      break;
    case "te":
      if ($("#study-form-te")) $("#study-form-te").textContent = value;
      break;
    case "past":
      if ($("#study-form-past")) $("#study-form-past").textContent = value;
      break;
  }
}

/** Utility */

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

/** Quick Quiz (10 questions) */

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

  // Fallback: fill with other forms of the same verb
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
  if (!$("#quiz-answers")) return; // not on quiz page

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
      renderFurigana(verb.dictionary, verb.furigana)
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
    wrongAnswers = generateWrongAnswersSameForm(correctAnswer, formKey, pool, verb);
  } else {
    wrongAnswers = generateWrongAnswersSameVerb(formKey, verb);
  }

  const allAnswers = shuffleArray([correctAnswer, ...wrongAnswers]);

  answersContainer.innerHTML = "";
  allAnswers.forEach((value) => {
    const btn = document.createElement("button");
    btn.className = "quiz-answer-btn";
    btn.textContent = value;
    btn.addEventListener("click", () => quizHandleAnswer(btn, correctAnswer));
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

  // Update stats
  stats.quizGames += 1;
  if (quizState.score > stats.quizBestScore) {
    stats.quizBestScore = quizState.score;
  }
  saveStatsToStorage();

  // XP only at the end, based on score
  const xpGain = quizState.score * 8; // e.g. 8 XP per correct (max 80)
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

/** Endless Mode */

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

function endlessLoadNext() {
  if (!$("#endless-answers")) return; // not on endless page

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
      renderFurigana(verb.dictionary, verb.furigana)
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
    wrongAnswers = generateWrongAnswersSameForm(correctAnswer, formKey, pool, verb);
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
    endlessState.maxStreak = Math.max(endlessState.maxStreak, endlessState.streak);
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

  // Update stats
  stats.endlessGames += 1;
  if (endlessState.score > stats.endlessBestScore) {
    stats.endlessBestScore = endlessState.score;
  }
  if (endlessState.maxStreak > stats.endlessBestStreak) {
    stats.endlessBestStreak = endlessState.maxStreak;
  }
  saveStatsToStorage();

  // XP for Endless at end:
  // e.g. 5 XP per point + 2 XP per max streak
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

/** Form Type Recognition Game */

function recognitionStartRound() {
  const pool = getCurrentVerbPool();
  if (!pool.length || !$("#recog-form-text")) return;

  const verb = pool[Math.floor(Math.random() * pool.length)];

  // Pick one of dictionary/masu/negative/te/past
  const formKeys = ["dictionary", ...Object.keys(FORM_CONFIG)];
  const formKey = formKeys[Math.floor(Math.random() * formKeys.length)];

  recognitionState.currentVerb = verb;
  recognitionState.currentFormKey = formKey;

  // Dictionary with furigana as context
  const furiganaContainer = $("#recog-verb-furigana");
  if (furiganaContainer) {
    furiganaContainer.innerHTML = "";
    furiganaContainer.appendChild(
      renderFurigana(verb.dictionary, verb.furigana)
    );
  }

  // Text of the form shown as the "mystery" form
  const formTextEl = $("#recog-form-text");
  let displayValue;
  if (formKey === "dictionary") {
    displayValue = verb.dictionary;
  } else {
    displayValue = verb.forms?.[formKey] || "???";
  }
  formTextEl.textContent = displayValue;

  // Reset options UI
  $$(".recog-option-btn").forEach((btn) => {
    btn.disabled = false;
    btn.classList.remove("correct", "wrong");
  });

  const feedbackEl = $("#recog-feedback");
  if (feedbackEl) {
    feedbackEl.textContent = "";
    feedbackEl.className = "quiz-feedback";
  }
}

function recognitionHandleAnswer(button, chosenKey) {
  const correctKey = recognitionState.currentFormKey;
  if (!correctKey) return;

  $$(".recog-option-btn").forEach((btn) => {
    btn.disabled = true;
    if (btn.dataset.formkey === correctKey) {
      btn.classList.add("correct");
    }
  });

  const feedbackEl = $("#recog-feedback");
  const isCorrect = chosenKey === correctKey;
  if (isCorrect) {
    // Small XP per correct (infinite game)
    addXp(2);
    stats.recognitionCorrect += 1;
    saveStatsToStorage();
    if (feedbackEl) {
      feedbackEl.textContent = "Nice! ✅ (+2 XP)";
      feedbackEl.className = "quiz-feedback correct";
    }
  } else {
    button.classList.add("wrong");
    if (feedbackEl) {
      feedbackEl.textContent = `Not quite. Correct answer: ${FORM_LABELS[correctKey]}`;
      feedbackEl.className = "quiz-feedback wrong";
    }
  }
}

/** Verb Group Game */

function groupStartRound() {
  const pool = getCurrentVerbPool();
  if (!pool.length || !$("#group-verb-furigana")) return;

  const verb = pool[Math.floor(Math.random() * pool.length)];
  groupState.currentVerb = verb;

  const furiganaContainer = $("#group-verb-furigana");
  if (furiganaContainer) {
    furiganaContainer.innerHTML = "";
    furiganaContainer.appendChild(
      renderFurigana(verb.dictionary, verb.furigana)
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
    // Small XP per correct (also infinite)
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

/** Profile Page */

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
          // ignore failure, user can copy manually
        });
      }
    });
  }
}

/** Page-specific init */

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

      settings = {
        theme: "neon-dark",
        difficulty: "N5",
        quizMode: "sameVerb",
        xp: 0
      };
      stats = {
        quizGames: 0,
        quizBestScore: 0,
        endlessGames: 0,
        endlessBestScore: 0,
        endlessBestStreak: 0,
        recognitionCorrect: 0,
        groupCorrect: 0
      };
      applyTheme();
      syncSettingsToUI();
    });
  }

  syncSettingsToUI();
}

function initRecognitionPage() {
  $$(".recog-option-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const key = btn.getAttribute("data-formkey");
      recognitionHandleAnswer(btn, key);
    });
  });

  const nextBtn = $("#recog-next-btn");
  if (nextBtn) {
    nextBtn.addEventListener("click", recognitionStartRound);
  }

  recognitionStartRound();
}

function initGroupPage() {
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

/** Load verbs from JSON */

function loadVerbs() {
  return fetch("data/verbs.json")
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
  loadStatsFromStorage();
  applyTheme();
  syncSettingsToUI();

  await loadVerbs();

  const page = document.body.dataset.page;

  if (page === "study") {
    initStudyPage();
  } else if (page === "quiz") {
    initQuizPage();
  } else if (page === "options") {
    initOptionsPage();
  } else if (page === "recognition") {
    initRecognitionPage();
  } else if (page === "groups") {
    initGroupPage();
  } else if (page === "endless") {
    initEndlessPage();
  } else if (page === "profile") {
    initProfilePage();
  } else {
    // menu or other
    syncSettingsToUI();
  }
});

// =====================================
// Counting Quiz - Number + Counter bars
// =====================================

(function () {
  const { $, renderFurigana, bootstrap, addXp } = JVT;

  let counterData = null;
  let flatExamples = [];
  let allNumberKanji = [];
  let allCounters = [];
  const PRON_GROUPS = [
    ["は", "ば", "ぱ"],
    ["ひ", "び", "ぴ"],
    ["ふ", "ぶ", "ぷ"],
    ["へ", "べ", "ぺ"],
    ["ほ", "ぼ", "ぽ"],
    ["か", "が"],
    ["き", "ぎ"],
    ["く", "ぐ"],
    ["け", "げ"],
    ["こ", "ご"],
    ["さ", "ざ"],
    ["し", "じ"],
    ["す", "ず"],
    ["せ", "ぜ"],
    ["そ", "ぞ"],
    ["た", "だ"],
    ["ち", "ぢ"],
    ["つ", "づ"],
    ["て", "で"],
    ["と", "ど"]
  ];

  const PRON_OPTIONS = [
    { value: "base", label: "Normal" },
    { value: "dakuten", label: "Tenten (゛)" },
    { value: "handakuten", label: "Maru (゜)" }
  ];

  const quizState = {
    current: null,
    answered: false,
    selectedNumber: null,   // kanji, e.g. "三"
    selectedCounter: null,  // counter char, e.g. "本"
    selectedPron: null      // pronunciation variant value: base/dakuten/handakuten
  };

  // -----------------------------
  // Load counters & preprocess
  // -----------------------------

  function findPronGroup(char) {
    return PRON_GROUPS.find((grp) => grp.includes(char));
  }

  function detectPronVariant(counterReading, fullReading) {
    if (!counterReading || !fullReading) return { type: "other", display: "" };
    const baseChars = Array.from(counterReading);
    const fullChars = Array.from(fullReading);
    const suffix = fullChars.slice(-baseChars.length);
    if (!suffix.length) return { type: "other", display: "" };
    const baseChar = baseChars[0];
    const suffixChar = suffix[0];

    const group = findPronGroup(baseChar);
    if (!group) {
      const type = suffixChar === baseChar ? "base" : "other";
      return { type, display: suffixChar };
    }

    if (suffixChar === group[0]) return { type: "base", display: suffixChar };
    if (group[1] && suffixChar === group[1])
      return { type: "dakuten", display: suffixChar };
    if (group[2] && suffixChar === group[2])
      return { type: "handakuten", display: suffixChar };
    return { type: "other", display: suffixChar };
  }

  function counterReadingToDisplay(reading) {
    const chars = Array.from(reading || "");
    return chars[0] || "";
  }

  function loadCounters() {
    if (counterData) return Promise.resolve(counterData);

    return fetch("../data/counters.json")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load counters.json");
        return res.json();
      })
      .then((data) => {
        if (!Array.isArray(data)) {
          throw new Error("counters.json must be an array");
        }
        counterData = data;
        flatExamples = [];
        const numberSet = new Set();
        const counterSet = new Set();

        data.forEach((c) => {
          counterSet.add(c.counter);
          c.examples.forEach((ex) => {
            if ((ex.number >= 1 && ex.number <= 10) || ex.number === 20) {
              // Derive numberKanji from full kanji using the counter char
              const counterKanji = c.counter;
              let numberKanji = ex.kanji;
              if (ex.kanji.endsWith(counterKanji)) {
                numberKanji = ex.kanji.slice(0, -counterKanji.length);
              }

              const pron = detectPronVariant(c.counterReading, ex.reading);

              flatExamples.push({
                counter: c.counter,
                counterReading: c.counterReading,
                meaning: c.meaning,
                number: ex.number,
                numberKanji,
                kanji: ex.kanji,
                reading: ex.reading,
                pronVariant: pron.type,
                pronDisplay: pron.display || counterReadingToDisplay(c.counterReading)
              });

              numberSet.add(numberKanji);
            }
          });
        });

        allNumberKanji = Array.from(numberSet);
        allCounters = Array.from(counterSet);
        return counterData;
      })
      .catch((err) => {
        console.error(err);
        alert("Could not load counters.json.");
      });
  }

  function pickRandomExample() {
    if (!flatExamples.length) return null;
    const idx = Math.floor(Math.random() * flatExamples.length);
    return flatExamples[idx];
  }

  function buildPronOptions() {
    return PRON_OPTIONS;
  }

  // -----------------------------
  // Rendering helpers
  // -----------------------------

  function renderBanks() {
    renderNumberBank();
    renderCounterBank();
    renderPronBank();
  }

  function renderNumberBank() {
    const container = $("#count-number-bank");
    if (!container) return;

    container.innerHTML = "";
    allNumberKanji.forEach((kanji) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "count-tile";
      btn.textContent = kanji;
      btn.dataset.value = kanji;

      btn.addEventListener("click", () => {
        if (quizState.answered) return;
        if (quizState.selectedNumber === kanji) {
          // unselect if clicking again
          quizState.selectedNumber = null;
        } else {
          quizState.selectedNumber = kanji;
        }
        updateSelectionUI();
      });

      container.appendChild(btn);
    });
  }

  function renderCounterBank() {
    const container = $("#count-counter-bank");
    if (!container) return;

    container.innerHTML = "";
    allCounters.forEach((counterChar) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "count-tile";
      btn.textContent = counterChar;
      btn.dataset.value = counterChar;

      btn.addEventListener("click", () => {
        if (quizState.answered) return;
        if (quizState.selectedCounter === counterChar) {
          // unselect if clicking again
          quizState.selectedCounter = null;
        } else {
          quizState.selectedCounter = counterChar;
        }
        updateSelectionUI();
      });

      container.appendChild(btn);
    });
  }

  function renderPronBank() {
    const container = $("#count-pron-bank");
    if (!container) return;

    container.innerHTML = "";
    PRON_OPTIONS.forEach((opt) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "count-tile";
      btn.textContent = opt.label;
      btn.dataset.value = opt.value;

      btn.addEventListener("click", () => {
        if (quizState.answered) return;
        quizState.selectedPron = quizState.selectedPron === opt.value ? null : opt.value;
        updateSelectionUI();
      });

      container.appendChild(btn);
    });
  }

  function updateSelectionUI() {
    const numberDrop = $("#count-number-dropzone");
    const counterDrop = $("#count-counter-dropzone");
    const pronDrop = $("#count-pron-dropzone");
    if (numberDrop) {
      numberDrop.innerHTML = "";
      if (quizState.selectedNumber) {
        const span = document.createElement("div");
        span.className = "count-drop-value";
        span.textContent = quizState.selectedNumber;
        numberDrop.appendChild(span);
      } else {
        numberDrop.textContent = "Choose a number";
      }
    }

    if (counterDrop) {
      counterDrop.innerHTML = "";
      if (quizState.selectedCounter) {
        const span = document.createElement("div");
        span.className = "count-drop-value";
        span.textContent = quizState.selectedCounter;
        counterDrop.appendChild(span);
      } else {
        counterDrop.textContent = "Choose a counter";
      }
    }

    if (pronDrop) {
      pronDrop.innerHTML = "";
      if (quizState.selectedPron) {
        const opt = PRON_OPTIONS.find((o) => o.value === quizState.selectedPron);
        const span = document.createElement("div");
        span.className = "count-drop-value";
        span.textContent = opt ? opt.label : quizState.selectedPron;
        pronDrop.appendChild(span);
      } else {
        pronDrop.textContent = "Choose pronunciation";
      }
    }

    // Highlight selected tiles in the banks
    const numberBank = $("#count-number-bank");
    const counterBank = $("#count-counter-bank");

    if (numberBank) {
      Array.from(numberBank.querySelectorAll(".count-tile")).forEach((btn) => {
        const v = btn.dataset.value;
        if (v === quizState.selectedNumber) {
          btn.classList.add("selected");
        } else {
          btn.classList.remove("selected");
        }
      });
    }

    if (counterBank) {
      Array.from(counterBank.querySelectorAll(".count-tile")).forEach((btn) => {
        const v = btn.dataset.value;
        if (v === quizState.selectedCounter) {
          btn.classList.add("selected");
        } else {
          btn.classList.remove("selected");
        }
      });
    }

    const pronBank = $("#count-pron-bank");
    if (pronBank) {
      Array.from(pronBank.querySelectorAll(".count-tile")).forEach((btn) => {
        const v = btn.dataset.value;
        if (v === quizState.selectedPron) {
          btn.classList.add("selected");
        } else {
          btn.classList.remove("selected");
        }
      });
    }
  }

  // -----------------------------
  // Render question
  // -----------------------------

  function renderQuiz() {
    const questionEl = $("#count-quiz-question");
    const feedbackEl = $("#count-feedback");
    const checkBtn = $("#count-check-btn");
    const nextBtn = $("#count-next-btn");

    if (!questionEl || !feedbackEl || !checkBtn || !nextBtn) return;

    const ex = pickRandomExample();
    if (!ex) return;

    quizState.current = ex;
    quizState.answered = false;
    quizState.selectedNumber = null;
    quizState.selectedCounter = null;
    quizState.selectedPron = null;
    quizState.currentPronOptions = buildPronOptions();

    // Question: "3 long objects"
    questionEl.textContent = `${ex.number} ${ex.meaning}`;

    feedbackEl.textContent = "";
    feedbackEl.className = "quiz-feedback";
    checkBtn.disabled = false;
    nextBtn.disabled = true;

    updateSelectionUI();
    renderPronBank();
  }

  // -----------------------------
  // Check answer
  // -----------------------------

  function handleCheck() {
    if (quizState.answered || !quizState.current) return;

    const feedbackEl = $("#count-feedback");
    const checkBtn = $("#count-check-btn");
    const nextBtn = $("#count-next-btn");
    if (!feedbackEl || !checkBtn || !nextBtn) return;

    if (!quizState.selectedNumber || !quizState.selectedCounter || !quizState.selectedPron) {
      feedbackEl.textContent = "Pick a number, counter, and pronunciation 💡";
      feedbackEl.className = "quiz-feedback";
      return;
    }

    const correctNumber = quizState.current.numberKanji;
    const correctCounter = quizState.current.counter;
    const correctWord = quizState.current.kanji;
    const correctPronVariant = quizState.current.pronVariant;

    quizState.answered = true;
    checkBtn.disabled = true;
    nextBtn.disabled = false;

    feedbackEl.innerHTML = "";

    const expectedPron = ["base", "dakuten", "handakuten"].includes(correctPronVariant)
      ? correctPronVariant
      : "base";

    const isCorrect =
      quizState.selectedNumber === correctNumber &&
      quizState.selectedCounter === correctCounter &&
      quizState.selectedPron === expectedPron;

    if (isCorrect) {
      feedbackEl.className = "quiz-feedback correct";

      const msgLine = document.createElement("div");
      msgLine.textContent = "Correct! ✅ (+5 XP)";

      const answerWrapper = document.createElement("div");
      answerWrapper.className = "count-feedback-answer";
      answerWrapper.appendChild(
        renderFurigana(correctWord, quizState.current.reading)
      );

      const counterInfo = document.createElement("div");
      counterInfo.className = "count-feedback-counter";
      counterInfo.textContent =
        `Counter: ${quizState.current.counter} (${quizState.current.meaning}) · Pronunciation: ${quizState.current.pronDisplay}`;

      feedbackEl.appendChild(msgLine);
      feedbackEl.appendChild(answerWrapper);
      feedbackEl.appendChild(counterInfo);

      addXp(5);
    } else {
      feedbackEl.className = "quiz-feedback wrong";

      const msgLine = document.createElement("div");
      msgLine.textContent = "Not quite. Correct answer:";

      const answerWrapper = document.createElement("div");
      answerWrapper.className = "count-feedback-answer";
      answerWrapper.appendChild(
        renderFurigana(correctWord, quizState.current.reading)
      );

      const counterInfo = document.createElement("div");
      counterInfo.className = "count-feedback-counter";
      counterInfo.textContent =
        `Counter: ${quizState.current.counter} (${quizState.current.meaning}) · Pronunciation: ${quizState.current.pronDisplay}`;

      feedbackEl.appendChild(msgLine);
      feedbackEl.appendChild(answerWrapper);
      feedbackEl.appendChild(counterInfo);
    }
  }

  // -----------------------------
  // Init
  // -----------------------------

  function initCountingQuiz() {
    const checkBtn = $("#count-check-btn");
    const nextBtn = $("#count-next-btn");
    if (!checkBtn || !nextBtn) return;

    checkBtn.addEventListener("click", handleCheck);
    nextBtn.addEventListener("click", renderQuiz);

    renderBanks();
    renderQuiz();
  }

  bootstrap(async () => {
    await loadCounters();
    initCountingQuiz();
  });
})();

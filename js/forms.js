// =====================================
// Form Type Recognition Game - forms.js
// =====================================

(function () {
  const {
    $,
    $$,
    FORM_CONFIG,
    FORM_LABELS,
    getCurrentVerbPool,
    addXp,
    stats,
    saveStatsToStorage,
    bootstrap
  } = JVT;

  const recognitionState = {
    currentVerb: null,
    currentFormKey: null
  };

  function recognitionStartRound() {
    const pool = getCurrentVerbPool();
    if (!pool.length || !$("#recog-form-text")) return;

    const verb = pool[Math.floor(Math.random() * pool.length)];
    const formKeys = ["dictionary", ...Object.keys(FORM_CONFIG)];
    const formKey = formKeys[Math.floor(Math.random() * formKeys.length)];

    recognitionState.currentVerb = verb;
    recognitionState.currentFormKey = formKey;

    const furiganaContainer = $("#recog-verb-furigana");
    if (furiganaContainer) {
      furiganaContainer.innerHTML = "";
      furiganaContainer.appendChild(
        JVT.renderFurigana(verb.dictionary, verb.furigana)
      );
    }

    const formTextEl = $("#recog-form-text");
    let displayValue;
    if (formKey === "dictionary") {
      displayValue = verb.dictionary;
    } else {
      displayValue = verb.forms?.[formKey] || "???";
    }
    formTextEl.textContent = displayValue;

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

  function initFormsPage() {
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

  JVT.initFormsPage = initFormsPage;
  bootstrap(initFormsPage);
})();

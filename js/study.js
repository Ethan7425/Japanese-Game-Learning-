// =====================================
// Study Mode - study.js (merged flashcards)
// =====================================

(function () {
  const {
    $,
    $$,
    renderFurigana,
    getCurrentVerbPool,
    bootstrap
  } = JVT;

  let currentVerb = null;

  // ----------------------
  // Load random verb
  // ----------------------
  function loadRandomVerb() {
    const pool = getCurrentVerbPool();
    if (!pool.length) return;

    currentVerb = pool[Math.floor(Math.random() * pool.length)];

    // Dictionary with furigana
    const furiEl = $("#study-verb-furigana");
    if (furiEl) {
      furiEl.innerHTML = "";
      furiEl.appendChild(
        renderFurigana(currentVerb.dictionary, currentVerb.furigana)
      );
    }

    // Reset meaning (flashcard-style)
    const meaningEl = $("#study-meaning-value");
    if (meaningEl) {
      meaningEl.textContent = "？？？";
    }

    // Show group directly
    const groupEl = $("#study-group-value");
    const groupBtn = $("#study-group-btn");
    if (groupEl) {
      groupEl.textContent = "？？？";
      groupEl.classList.add("is-hidden");
      groupEl.hidden = true;
    }
    if (groupBtn) {
      groupBtn.disabled = false;
    }

    // Reset all forms
    const ids = [
      "study-form-masu",
      "study-form-negative",
      "study-form-te",
      "study-form-past",
      "study-form-nakatta",
      "study-form-ba",
      "study-form-kanou"
    ];
    ids.forEach((id) => {
      const el = $("#" + id);
      if (el) el.textContent = "？？？";
    });
  }

  // ----------------------
  // Reveal group
  // ----------------------
  function revealGroup() {
    if (!currentVerb) return;
    const groupEl = $("#study-group-value");
    const groupBtn = $("#study-group-btn");
    if (groupEl) {
      groupEl.textContent = `Group: ${currentVerb.group}`;
      groupEl.classList.remove("is-hidden");
      groupEl.hidden = false;
    }
    if (groupBtn) {
      groupBtn.disabled = true;
    }
  }

  // ----------------------
  // Reveal meaning
  // ----------------------
  function revealMeaning() {
    if (!currentVerb) return;
    const meaningEl = $("#study-meaning-value");
    if (meaningEl) {
      meaningEl.textContent = currentVerb.meaning;
    }
  }

  // ----------------------
  // Reveal specific form
  // ----------------------
  function revealForm(formKey) {
    if (!currentVerb) return;

    const value = currentVerb.forms?.[formKey];
    if (!value) return;

    const map = {
      masu: "study-form-masu",
      negative: "study-form-negative",
      te: "study-form-te",
      past: "study-form-past",
      nakatta: "study-form-nakatta",
      ba: "study-form-ba",
      kanou: "study-form-kanou"
    };

    const targetId = map[formKey];
    const el = $("#" + targetId);
    if (!el) return;

    const reading = currentVerb.formsReading?.[formKey];

    // Clear and insert either plain text or ruby with furigana
    el.innerHTML = "";
    if (reading) {
      el.appendChild(renderFurigana(value, reading));
    } else {
      el.textContent = value;
    }
  }

  // ----------------------
  // Init
  // ----------------------
  function initStudyPage() {
    // Reveal meaning (flashcard front/back style)
    const meaningBtn = $("#study-meaning-btn");
    if (meaningBtn) {
      meaningBtn.addEventListener("click", revealMeaning);
    }

    // Reveal forms
    $$(".study-form-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const key = btn.dataset.form;
        revealForm(key);
      });
    });

    // Reveal group
    const groupBtn = $("#study-group-btn");
    if (groupBtn) {
      groupBtn.addEventListener("click", revealGroup);
    }

    // New verb
    const nextBtn = $("#study-next-verb");
    if (nextBtn) {
      nextBtn.addEventListener("click", loadRandomVerb);
    }

    loadRandomVerb();
  }

  JVT.initStudyPage = initStudyPage;
  bootstrap(initStudyPage);
})();

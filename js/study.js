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

    // Insert dictionary w/ furigana
    const furi = $("#study-verb-furigana");
    furi.innerHTML = "";
    furi.appendChild(renderFurigana(currentVerb.dictionary, currentVerb.furigana));

    // Reset meaning
    $("#study-meaning-value").textContent = "？？？";

    // Show group directly
    $("#study-group-value").textContent = `Group: ${currentVerb.group}`;

    // Reset all forms
    $("#study-form-masu").textContent = "？？？";
    $("#study-form-negative").textContent = "？？？";
    $("#study-form-te").textContent = "？？？";
    $("#study-form-past").textContent = "？？？";
  }

  // ----------------------
  // Reveal meaning
  // ----------------------
  function revealMeaning() {
    if (!currentVerb) return;
    $("#study-meaning-value").textContent = currentVerb.meaning;
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
      past: "study-form-past"
    };

    const el = $("#" + map[formKey]);
    if (el) el.textContent = value;
  }

  // ----------------------
  // Init
  // ----------------------
  function initStudyPage() {
    // Reveal meaning
    $("#study-meaning-btn").addEventListener("click", revealMeaning);

    // Reveal forms
    $$(".study-form-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        revealForm(btn.dataset.form);
      });
    });

    // New verb
    $("#study-next-verb").addEventListener("click", loadRandomVerb);

    loadRandomVerb();
  }

  JVT.initStudyPage = initStudyPage;
  bootstrap(initStudyPage);
})();

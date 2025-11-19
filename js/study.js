// =====================================
// Study Mode - study.js
// =====================================

(function () {
  const {
    $,
    $$,
    renderFurigana,
    getCurrentVerbPool,
    bootstrap
  } = JVT;

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

  JVT.initStudyPage = initStudyPage;
  bootstrap(initStudyPage);
})();

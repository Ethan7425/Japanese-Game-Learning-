// =====================================
// Dictionary / Browser - dictionary.js
// Shows all verbs for current difficulty with search
// =====================================

(function () {
  const {
    $,
    renderFurigana,
    getCurrentVerbPool,
    bootstrap
  } = JVT;

  let entries = [];

  // -----------------------------
  // Render helpers
  // -----------------------------

  function createVerbCard(verb) {
    const card = document.createElement("article");
    card.className = "card dict-card";

    // Header: big verb with furigana
    const header = document.createElement("div");
    header.className = "verb-main";

    const furi = document.createElement("div");
    furi.className = "verb-furigana";
    furi.appendChild(renderFurigana(verb.dictionary, verb.furigana));
    header.appendChild(furi);

    card.appendChild(header);

    // Meaning + meta
    const info = document.createElement("div");
    info.className = "verb-info";

    const meaningLine = document.createElement("div");
    meaningLine.innerHTML = `<strong>Meaning:</strong> ${verb.meaning}`;

    const metaLine = document.createElement("div");
    const groupLabel =
      verb.group === 1
        ? "Group 1 (五段)"
        : verb.group === 2
        ? "Group 2 (一段)"
        : "Group 3 (Irregular)";
    metaLine.textContent = `${groupLabel} · Level: ${verb.level || "?"}`;

    info.appendChild(meaningLine);
    info.appendChild(metaLine);
    card.appendChild(info);

    // Forms list
    const formsWrapper = document.createElement("div");
    formsWrapper.className = "dict-forms";

    function addFormRow(label, key) {
      const value = verb.forms?.[key];
      if (!value) return;

      const row = document.createElement("div");
      row.className = "dict-form-row";

      const labelSpan = document.createElement("span");
      labelSpan.className = "dict-form-label";
      labelSpan.textContent = label;

      const valueSpan = document.createElement("span");
      valueSpan.className = "dict-form-value";

      const reading = verb.formsReading?.[key];
      if (reading) {
        valueSpan.appendChild(renderFurigana(value, reading));
      } else {
        valueSpan.textContent = value;
      }

      row.appendChild(labelSpan);
      row.appendChild(valueSpan);
      formsWrapper.appendChild(row);
    }

    addFormRow("Dictionary", "dictionary"); // show as raw text in header already
    addFormRow("ます", "masu");
    addFormRow("ない", "negative");
    addFormRow("て", "te");
    addFormRow("た", "past");
    addFormRow("なかった", "nakatta");
    addFormRow("〜たい", "tai");
    addFormRow("可能", "kanou");

    card.appendChild(formsWrapper);

    return card;
  }

  function renderList(filterText) {
    const container = $("#dict-results");
    const countEl = $("#dict-count");
    if (!container || !countEl) return;

    const query = (filterText || "").trim().toLowerCase();

    const filtered = !query
      ? entries
      : entries.filter((v) => {
          const dict = v.dictionary || "";
          const reading = v.furigana || "";
          const meaning = v.meaning || "";
          return (
            dict.toLowerCase().includes(query) ||
            reading.toLowerCase().includes(query) ||
            meaning.toLowerCase().includes(query)
          );
        });

    container.innerHTML = "";

    if (!filtered.length) {
      countEl.textContent = "No entries match your search.";
      return;
    }

    filtered.forEach((verb) => {
      container.appendChild(createVerbCard(verb));
    });

    const label = filtered.length === 1 ? "verb found" : "verbs found";
    countEl.textContent = `${filtered.length} ${label}`;
  }

  // -----------------------------
  // Init
  // -----------------------------

  function initDictionaryPage() {
    // Use the current difficulty's pool for now
    entries = getCurrentVerbPool();

    const searchInput = $("#dict-search");
    if (!searchInput) {
      renderList("");
      return;
    }

    searchInput.addEventListener("input", () => {
      renderList(searchInput.value);
    });

    renderList("");
  }

  bootstrap(initDictionaryPage);
})();

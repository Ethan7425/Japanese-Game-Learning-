// =====================================
// Counting Flashcards
// =====================================

(function () {
  const { $, renderFurigana, bootstrap } = JVT;

  let counterData = null;
  let flatExamples = [];

  function loadCounters() {
    if (counterData) return Promise.resolve(counterData);

    return fetch("../data/counters.json")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load counters.json");
        return res.json();
      })
      .then((data) => {
        if (!Array.isArray(data)) throw new Error("counters.json must be an array");
        counterData = data;
        flatExamples = [];

        data.forEach((c) => {
          c.examples.forEach((ex) => {
            flatExamples.push({
              counter: c.counter,
              counterReading: c.counterReading,
              meaning: c.meaning,
              number: ex.number,
              kanji: ex.kanji,
              reading: ex.reading
            });
          });
        });

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

  function initCountingFlashcards() {
    const card = $("#count-flashcard");
    const frontEl = $("#count-front");
    const backEl = $("#count-back");
    const hintEl = $("#count-hint");
    const nextBtn = $("#count-next-btn");

    if (!card || !frontEl || !backEl || !hintEl || !nextBtn) return;

    function renderNewCard() {
      const ex = pickRandomExample();
      if (!ex) return;

      // Front: English prompt
      frontEl.textContent = `${ex.number} ${ex.meaning}`;

      // Back: Japanese answer with furigana
      backEl.innerHTML = "";
      backEl.appendChild(renderFurigana(ex.kanji, ex.reading));

      // Hint: show counter (e.g. "Counter: 本 (long objects)")
      hintEl.textContent = `Counter: ${ex.counter} (${ex.meaning})`;

      card.classList.remove("flashcard-revealed");
      card.classList.add("flashcard-hidden");
    }

    card.addEventListener("click", () => {
      card.classList.remove("flashcard-hidden");
      card.classList.add("flashcard-revealed");
    });

    nextBtn.addEventListener("click", renderNewCard);

    renderNewCard();
  }

  bootstrap(async () => {
    await loadCounters();
    initCountingFlashcards();
  });
})();

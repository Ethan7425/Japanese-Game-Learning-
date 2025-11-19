// =====================================
// Flashcards - flashcards.js
// Verb → meaning flashcards using current verb pool
// Click card to reveal, single "Next Card" button
// =====================================

(function () {
  const {
    $,
    renderFurigana,
    getCurrentVerbPool,
    bootstrap
  } = JVT;

  const flashcardState = {
    currentVerb: null,
    revealed: false
  };

  function loadRandomFlashcard() {
    const pool = getCurrentVerbPool();
    if (!pool.length) {
      console.warn("No verbs available for flashcards.");
      return;
    }

    const randomIndex = Math.floor(Math.random() * pool.length);
    const verb = pool[randomIndex];
    flashcardState.currentVerb = verb;
    flashcardState.revealed = false;

    const card = $("#flashcard-card");
    const front = $("#flashcard-front");
    const back = $("#flashcard-back");
    const hint = $("#flashcard-hint");

    if (!card || !front || !back || !hint) return;

    // Reset reveal state
    card.classList.remove("flashcard-revealed");
    card.classList.add("flashcard-hidden");

    // Front: verb with furigana
    front.innerHTML = "";
    front.appendChild(
      renderFurigana(verb.dictionary, verb.furigana)
    );

    // Back: meaning (will be blurred/hidden via CSS until revealed)
    back.textContent = verb.meaning || "";

    // Hint: small extra info (group for now)
    hint.textContent = `Group ${verb.group}`;
  }

  function handleCardClick() {
    const card = $("#flashcard-card");
    if (!card) return;

    if (!flashcardState.revealed) {
      flashcardState.revealed = true;
      card.classList.remove("flashcard-hidden");
      card.classList.add("flashcard-revealed");
    }
  }

  function initFlashcardsPage() {
    const card = $("#flashcard-card");
    const nextBtn = $("#flashcard-next-btn");

    if (card) {
      card.addEventListener("click", handleCardClick);
    }

    if (nextBtn) {
      nextBtn.addEventListener("click", loadRandomFlashcard);
    }

    loadRandomFlashcard();
  }

  JVT.initFlashcardsPage = initFlashcardsPage;
  bootstrap(initFlashcardsPage);
})();

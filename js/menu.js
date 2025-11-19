// =====================================
// Main Menu - menu.js
// Category-based hub: Verbs / Study / Mini-games / Counting / Adjectives
// =====================================

(function () {
  const { $$, bootstrap, syncSettingsToUI } = JVT;

  function initMenuPage() {
    // Make sure header labels (difficulty, XP, highscore) are in sync
    syncSettingsToUI();

    const categoryButtons = $$(".category-card");
    const panels = $$(".category-panel");

    function activateCategory(key) {
      // Toggle active state on category cards
      categoryButtons.forEach((btn) => {
        const isActive = btn.dataset.category === key;
        if (isActive) {
          btn.classList.add("is-active");
        } else {
          btn.classList.remove("is-active");
        }
      });

      // Show/hide panels via 'hidden' attribute
      panels.forEach((panel) => {
        const panelKey = panel.dataset.categoryPanel;
        panel.hidden = panelKey !== key;
      });
    }

    // Attach click handlers to category cards
    categoryButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        const key = btn.dataset.category;
        if (!key) return;
        activateCategory(key);
      });
    });

    // Default category when opening the page
    activateCategory("verbs");
  }

  JVT.initMenuPage = initMenuPage;
  bootstrap(initMenuPage);
})();

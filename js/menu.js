// =====================================
// Main Menu - menu.js
// Keeps header meta in sync
// =====================================

(function () {
  const { bootstrap, syncSettingsToUI } = JVT;

  function initMenuPage() {
    syncSettingsToUI();
  }

  JVT.initMenuPage = initMenuPage;
  bootstrap(initMenuPage);
})();

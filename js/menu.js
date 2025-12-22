// =====================================
// Main Menu - menu.js
// Category-based hub: Verbs / Study / Mini-games / Counting / Adjectives
// =====================================

(function () {
  const { $, $$, bootstrap, syncSettingsToUI } = JVT;

  const FEEDBACK_WEBHOOK =
    "https://discord.com/api/webhooks/1451361839152763092/PbFjPHmVUI6WBg-5pmy2cwMzpmihzs-cZo4MDv3rrr0sI8kRHf3eU0_f6axmwxGj3CHv";

  function showFeedbackModal(show) {
    const modal = $("#feedback-modal");
    if (!modal) return;
    modal.hidden = !show;
    if (show) {
      const textarea = $("#feedback-text");
      if (textarea) {
        textarea.value = "";
        textarea.focus();
      }
      const status = $("#feedback-status");
      if (status) status.textContent = "";
    }
  }

  function setFeedbackStatus(text) {
    const status = $("#feedback-status");
    if (status) status.textContent = text || "";
  }

  function sendFeedback() {
    const textarea = $("#feedback-text");
    const sendBtn = $("#feedback-send");
    if (!textarea || !sendBtn) return;

    const message = (textarea.value || "").trim();
    if (!message) {
      setFeedbackStatus("Please enter a message first.");
      return;
    }

    sendBtn.disabled = true;
    setFeedbackStatus("Sending...");

    fetch(FEEDBACK_WEBHOOK, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        content: message
      })
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to send");
        setFeedbackStatus("Thanks! Sent.");
        setTimeout(() => showFeedbackModal(false), 600);
      })
      .catch(() => {
        setFeedbackStatus("Could not send. Please try again.");
      })
      .finally(() => {
        sendBtn.disabled = false;
      });
  }

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

    // Feedback modal
    const openBtn = $("#feedback-open-btn");
    if (openBtn) {
      openBtn.addEventListener("click", () => showFeedbackModal(true));
    }
    const cancelBtn = $("#feedback-cancel");
    if (cancelBtn) {
      cancelBtn.addEventListener("click", () => showFeedbackModal(false));
    }
    const sendBtn = $("#feedback-send");
    if (sendBtn) {
      sendBtn.addEventListener("click", sendFeedback);
    }
    const modal = $("#feedback-modal");
    if (modal) {
      modal.addEventListener("click", (e) => {
        if (e.target === modal) showFeedbackModal(false);
      });
    }
  }

  JVT.initMenuPage = initMenuPage;
  bootstrap(initMenuPage);
})();

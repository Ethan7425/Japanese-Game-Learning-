# 🎌 Japanese-Game-Learning

*A small neon-styled web app to practice Japanese verbs, forms & grammar — fully offline, no frameworks.*

---

## 🔗 Live Concept

> Open `index.html` in your browser (or via a simple local server) and start training immediately.

---

## 🌈 Highlights

- 🎴 **Study Mode** – Learn verbs with furigana + basic forms  
- 🧠 **Quick Quiz** – 10-question runs, score & XP  
- 🔥 **Endless Mode** – 3 lives, streaks, scaling XP  
- 🌀 **Form Type Game** – Identify the form (dictionary / ～ます / ～ない / ～て / ～た)  
- 🈷️ **Verb Group Game** – Guess 五段 / 一段 / irregular  
- 👤 **Profile Page** – Track stats & generate a shareable text card  
- ⚙️ **Options** – Dark/light theme, difficulty (N5/N4), quiz style  
- 💾 **Offline** – All data from `verbs.json`, progress saved via `localStorage`

---

## 🧱 Tech Stack

- **HTML5** – multi-page structure
- **CSS3** – custom neon dark theme (with light mode)
- **Vanilla JavaScript** – no frameworks, modular logic
- **JSON** – verb database (`verbs.json`)
- **localStorage** – XP, settings, stats, high scores

---

## 📁 Project Structure

```bash
/
├── index.html        # Main menu
├── study.html        # Study Mode
├── quiz.html         # Quick Quiz (10Q)
├── endless.html      # Endless Mode (3 lives)
├── forms.html        # Form Type Recognition
├── groups.html       # Verb Group Game
├── profile.html      # Profile & stats
├── options.html      # Settings (theme, difficulty, quiz style)
├── styles.css        # Global/neon styling
├── app.js            # Logic, routing per page, XP, stats
└── verbs.json        # N5 verbs + forms + metadata

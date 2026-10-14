# KeyBlitz — Premium Neon Typing Arena ⚡

> **Enter the flow state.** A modern, high-performance, and visual-first typing speed test application designed for speed, accuracy, and rhythmic focus.

![KeyBlitz Banner](https://img.shields.io/badge/KeyBlitz-Typing%20Arena-00e5ff?style=for-the-badge)
![Tech Stack](https://img.shields.io/badge/Stack-HTML5%20%7C%20CSS3%20%7C%20JavaScript-a855f7?style=for-the-badge)
![License](https://img.shields.io/badge/License-MIT-10b981?style=for-the-badge)

---

## 📖 Overview

KeyBlitz is a next-generation typing arena engineered with **Vanilla JavaScript** and modern **CSS3**. It provides an interactive and immersive typing test experience with real-time feedback, mechanical audio effects, customizable durations, responsive charts, and mistake analysis.

---

## ✨ Features & Highlights

- ⚡ **Real-Time Speed & Accuracy Tracking:** Live computation of WPM (Words Per Minute), accuracy percentages, and mistake counts.
- ⏱️ **Adaptive Passage Durations:** Automatically scales text passage lengths for **15s**, **30s**, and **60s** tests.
- 🎨 **RGB Neon Spectrum Keyboard:** Multi-row color-coded interactive virtual keyboard with keypress bloom and reactive glow.
- 🔊 **Synthesized Mechanical Audio Engine:** Realistic dual-layered mechanical clack and sub-bass thock built with the Web Audio API (no external sound files required).
- 🎯 **Mistake Shake Feedback & Weak Keys Analysis:** Dynamic shake effect on mistyped keys and session summary showcasing your most frequent mistakes.
- 📈 **Inline SVG Performance History:** Custom SVG charting engine rendering speed trends across your last 7 recorded sessions.
- 🌙 **Day / Night Theme Engine:** Dark and light mode toggle with local storage persistence.
- ⌨️ **Pro Shortcuts:** Press `Escape` anytime for instant test reset and quick restart.

---

## 🛠️ Tech Stack

- **Frontend Core:** HTML5, CSS3 (Custom Variables, Flexbox, Grid, CSS Keyframe Animations)
- **Logic & Audio Engine:** Vanilla JavaScript (ES6+, Web Audio API, MutationObserver, DOM Manipulation)
- **Data Persistence:** Browser `localStorage` API
- **Data Visualization:** Inline SVG Engine

---

## 📂 Project Structure

```text
KeyBlitz/
├── index.html        # Semantic HTML5 arena markup
├── style.css         # Neon themes, responsive grids, and animation engine
├── script.js        # Core typing engine, stats, Web Audio API, and SVG chart
└── README.md         # Project documentation

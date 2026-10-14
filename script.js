const $ = (selector) => document.querySelector(selector);

const typingText = $("#typingText");
const typingInput = $("#typingInput");
const wpmDisplay = $("#wpm");
const accuracyDisplay = $("#accuracy");
const timeDisplay = $("#time");
const bestDisplay = $("#best");
const progressBar = $("#progressBar");
const testStatus = $("#testStatus");
const resultPanel = $("#resultPanel");
const themeToggle = $("#themeToggle");
const themeIcon = $("#themeIcon");
const soundToggle = $("#soundToggle");
const soundIcon = $("#soundIcon");
const keyboard = $("#keyboard");
const toast = $("#toast");

const BEST_KEY = "keyBlitzBestWpm";
const THEME_KEY = "keyBlitzTheme";
const SOUND_KEY = "keyBlitzSound";
const HISTORY_KEY = "keyBlitzHistory";

const passages = [
  "Great things take time and consistent effort. Every small step you take today brings you closer to your goals. Stay focused, keep learning, and trust the process.",
  "Programming is not just about writing code. It is about solving problems, thinking clearly, and building useful things that make everyday life better.",
  "Success comes from showing up every day. Practice your skills, learn from mistakes, stay curious, and never stop improving. Progress matters more than perfection.",
  "Technology creates opportunities for people who are willing to learn. Build projects, explore new ideas, share your work, and turn your knowledge into experience.",
  "A focused mind can achieve remarkable things. Set a clear goal, remove distractions, take one step at a time, and celebrate your progress.",
  "Consistency beats intensity when it comes to building lasting habits. Spend time learning something useful every day and your future self will thank you.",
  "Clean code is easier to understand, test, and maintain. Good developers do more than make programs work. They make their solutions reliable and readable.",
  "Every challenge is an opportunity to become better. Ask questions, experiment with ideas, understand your mistakes, and keep moving forward with confidence."
];

let duration = 30;
let timeLeft = duration;
let timerId = null;
let started = false;
let finished = false;
let startTime = 0;
let currentPassage = "";
let previousInput = "";
let soundEnabled = localStorage.getItem(SOUND_KEY) === "true";
let bestWpm = Number(localStorage.getItem(BEST_KEY)) || 0;
let history = loadHistory();
let audioContext = null;
let toastTimer = null;
let keyTimers = new WeakMap();

// Tracker for mistake keys in current session
let errorKeyMap = {};

function loadHistory() {
  try {
    const saved = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
    if (!Array.isArray(saved)) return [];
    return saved.filter((item) =>
      item &&
      Number.isFinite(item.wpm) &&
      Number.isFinite(item.accuracy) &&
      Number.isFinite(item.errors)
    ).slice(0, 7);
  } catch {
    return [];
  }
}

function saveHistory() {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");

  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2300);
}

// --------------------------------------------------
// DAY / NIGHT THEME
// --------------------------------------------------

function applyTheme(theme) {
  const isLight = theme === "light";

  document.body.classList.toggle("light-mode", isLight);
  themeIcon.textContent = isLight ? "☾" : "☼";
  themeToggle.setAttribute(
    "aria-label",
    isLight ? "Switch to dark mode" : "Switch to light mode"
  );

  const meta = $('meta[name="theme-color"]');
  if (meta) {
    meta.content = isLight ? "#f4f3fb" : "#090a12";
  }
}

const initialTheme = localStorage.getItem(THEME_KEY);
applyTheme(initialTheme === "light" ? "light" : "dark");

themeToggle.addEventListener("click", () => {
  const nextTheme = document.body.classList.contains("light-mode")
    ? "dark"
    : "light";

  localStorage.setItem(THEME_KEY, nextTheme);
  applyTheme(nextTheme);
});

// --------------------------------------------------
// ADVANCED MECHANICAL KEYBOARD SOUND ENGINE
// --------------------------------------------------

function updateSoundButton() {
  soundIcon.textContent = soundEnabled ? "♫" : "♪";
  soundToggle.setAttribute(
    "aria-label",
    soundEnabled ? "Turn typing sounds off" : "Turn typing sounds on"
  );
  soundToggle.title = soundEnabled ? "Typing sound: On" : "Typing sound: Off";
  soundToggle.style.borderColor = soundEnabled ? "var(--cyan)" : "";
}

soundToggle.addEventListener("click", () => {
  soundEnabled = !soundEnabled;
  localStorage.setItem(SOUND_KEY, String(soundEnabled));
  updateSoundButton();

  if (soundEnabled) {
    playKeySound();
    showToast("Typing sound enabled");
  } else {
    showToast("Typing sound disabled");
  }
});

function playKeySound() {
  if (!soundEnabled) return;

  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;

    if (!audioContext) audioContext = new AudioContextClass();
    if (audioContext.state === "suspended") audioContext.resume();

    const now = audioContext.currentTime;

    // 1. Mechanical Clack
    const bufferSize = audioContext.sampleRate * 0.012;
    const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
    const output = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const noise = audioContext.createBufferSource();
    noise.buffer = buffer;

    const noiseFilter = audioContext.createBiquadFilter();
    noiseFilter.type = "bandpass";
    noiseFilter.frequency.setValueAtTime(1200 + Math.random() * 300, now);
    noiseFilter.Q.setValueAtTime(3, now);

    const noiseGain = audioContext.createGain();
    noiseGain.gain.setValueAtTime(0.08, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.012);

    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(audioContext.destination);

    // 2. Thocky Sub-Bass Layer
    const osc = audioContext.createOscillator();
    const oscGain = audioContext.createGain();

    osc.type = "triangle";
    osc.frequency.setValueAtTime(220 + Math.random() * 20, now);
    osc.frequency.exponentialRampToValueAtTime(60, now + 0.03);

    oscGain.gain.setValueAtTime(0.05, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);

    osc.connect(oscGain);
    oscGain.connect(audioContext.destination);

    noise.start(now);
    osc.start(now);
    osc.stop(now + 0.035);
  } catch {
    // Audio optional
  }
}

updateSoundButton();

// --------------------------------------------------
// PASSAGE AND CHARACTER HIGHLIGHTING
// --------------------------------------------------

function choosePassage() {
  const shuffled = [...passages].sort(() => Math.random() - 0.5);

  let sentenceCount = 3;
  if (duration === 15) {
    sentenceCount = 2;
  } else if (duration === 30) {
    sentenceCount = 3;
  } else if (duration === 60) {
    sentenceCount = 4;
  }

  return shuffled.slice(0, sentenceCount).join(" ");
}

function renderPassage() {
  typingText.replaceChildren();

  for (const character of currentPassage) {
    const span = document.createElement("span");
    span.textContent = character;
    typingText.appendChild(span);
  }

  updateCharacterColors();
}

function updateCharacterColors() {
  const typed = typingInput.value;
  const characters = typingText.querySelectorAll("span");

  characters.forEach((character, index) => {
    character.classList.remove("correct", "incorrect", "current");

    if (index < typed.length) {
      character.classList.add(
        typed[index] === currentPassage[index] ? "correct" : "incorrect"
      );
    }
  });

  if (!finished && typed.length < characters.length) {
    characters[typed.length]?.classList.add("current");
  }
}

// --------------------------------------------------
// INTERACTIVE KEYBOARD
// --------------------------------------------------

function normalizeKey(key) {
  if (key === " ") return " ";
  return key.length === 1 ? key.toLowerCase() : key;
}

function flashKey(key, type = "active") {
  const normalized = normalizeKey(key);
  const candidates = [...keyboard.querySelectorAll(".key")];

  let matching = candidates.filter(
    (element) => element.dataset.key === normalized
  );

  if (!matching.length && (key === "Shift" || key === "CapsLock")) {
    matching = candidates.filter(
      (element) => element.dataset.key === key
    );
  }

  matching.forEach((element) => {
    clearTimeout(keyTimers.get(element));
    element.classList.remove("active", "correct-key", "error-key");

    void element.offsetWidth;
    element.classList.add("active");

    if (type === "correct") element.classList.add("correct-key");
    if (type === "error") element.classList.add("error-key");

    const timer = setTimeout(() => {
      element.classList.remove("active", "correct-key", "error-key");
    }, 240);

    keyTimers.set(element, timer);
  });
}

function handlePhysicalKeyboard(event) {
  if (event.ctrlKey || event.metaKey || event.altKey) return;

  const supportedKeys = [
    "Backspace", "Tab", "Enter", "Shift", "CapsLock"
  ];

  if (event.key.length === 1 || supportedKeys.includes(event.key)) {
    flashKey(event.key);
  }
}

document.addEventListener("keydown", handlePhysicalKeyboard);

// --------------------------------------------------
// LIVE STATS & SPEED BADGE ENGINE
// --------------------------------------------------

function calculateStats() {
  const typed = typingInput.value;
  let correctCharacters = 0;
  let errors = 0;

  for (let i = 0; i < typed.length; i++) {
    if (typed[i] === currentPassage[i]) {
      correctCharacters++;
    } else {
      errors++;
    }
  }

  const elapsed = started
    ? Math.max((Date.now() - startTime) / 1000, 0.1)
    : 0;

  const wpm = elapsed > 0
    ? Math.round(correctCharacters / 5 / (elapsed / 60))
    : 0;

  const accuracy = typed.length
    ? Math.round((correctCharacters / typed.length) * 100)
    : 0;

  return { wpm, accuracy, errors, correctCharacters, typedCharacters: typed.length };
}

function updateStats() {
  const stats = calculateStats();

  wpmDisplay.textContent = stats.wpm;
  accuracyDisplay.textContent = stats.accuracy;
  timeDisplay.textContent = timeLeft;

  $("#wpmTrack").style.width = `${Math.min((stats.wpm / 120) * 100, 100)}%`;
  $("#accuracyTrack").style.width = `${stats.accuracy}%`;
  $("#timeTrack").style.width = `${(timeLeft / duration) * 100}%`;
  $("#bestTrack").style.width = `${Math.min((bestWpm / 120) * 100, 100)}%`;

  progressBar.style.width = `${((duration - timeLeft) / duration) * 100}%`;

  // Dynamic WPM Color & Speed Badge
  const timerCaption = $("#timerCaption");
  if (stats.wpm >= 75) {
    wpmDisplay.style.color = "var(--gold)";
    wpmDisplay.style.textShadow = "0 0 20px rgba(250, 204, 21, 0.8)";
    if (started && timerCaption) timerCaption.textContent = "🔥 GOD SPEED!";
  } else if (stats.wpm >= 50) {
    wpmDisplay.style.color = "var(--purple)";
    wpmDisplay.style.textShadow = "0 0 15px rgba(168, 85, 247, 0.6)";
    if (started && timerCaption) timerCaption.textContent = "🚀 PRO SPEED!";
  } else if (stats.wpm >= 25) {
    wpmDisplay.style.color = "var(--cyan)";
    wpmDisplay.style.textShadow = "0 0 10px rgba(0, 229, 255, 0.5)";
    if (started && timerCaption) timerCaption.textContent = "⚡ FAST RHYTHM";
  } else {
    wpmDisplay.style.color = "var(--text-main)";
    wpmDisplay.style.textShadow = "none";
    if (started && timerCaption) timerCaption.textContent = "🐢 BUILDING SPEED";
  }

  if (!started && timerCaption) {
    timerCaption.textContent = finished ? "Session finished" : "Ready to launch";
  }

  updateCharacterColors();
}

// --------------------------------------------------
// TIMER
// --------------------------------------------------

function startTest() {
  if (started || finished) return;

  started = true;
  startTime = Date.now();
  testStatus.textContent = "SESSION LIVE";
  testStatus.classList.add("running");

  timerId = setInterval(() => {
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    timeLeft = Math.max(duration - elapsed, 0);

    updateStats();

    if (timeLeft <= 0) {
      finishTest();
    }
  }, 100);
}

// --------------------------------------------------
// HISTORY CHART
// --------------------------------------------------

function renderHistory() {
  const empty = $("#chartEmpty");
  const chart = $("#historyChart");
  const svg = $("#chartSvg");

  $("#historyCount").textContent =
    `${history.length} session${history.length === 1 ? "" : "s"} recorded`;

  if (!history.length) {
    empty.classList.remove("hidden");
    chart.classList.add("hidden");
    svg.replaceChildren();
    return;
  }

  empty.classList.add("hidden");
  chart.classList.remove("hidden");

  const points = [...history].reverse();
  const width = 600;
  const height = 190;
  const left = 28;
  const right = 575;
  const top = 20;
  const bottom = 145;

  const maxWpm = Math.max(40, ...points.map((item) => item.wpm));
  const scaleMax = Math.ceil(maxWpm / 20) * 20;

  const x = (index) => points.length === 1
    ? (left + right) / 2
    : left + (right - left) * index / (points.length - 1);

  const y = (value) => bottom - (value / scaleMax) * (bottom - top);

  const coords = points.map((point, index) => ({
    x: x(index),
    y: y(point.wpm),
    wpm: point.wpm,
    label: point.label || `Test ${index + 1}`
  }));

  const ns = "http://www.w3.org/2000/svg";
  const make = (tag, attrs = {}) => {
    const node = document.createElementNS(ns, tag);
    Object.entries(attrs).forEach(([key, value]) => node.setAttribute(key, value));
    return node;
  };

  svg.replaceChildren();

  const defs = make("defs");
  const gradient = make("linearGradient", {
    id: "chartFill",
    x1: "0", y1: "0", x2: "0", y2: "1"
  });
  gradient.append(
    make("stop", { offset: "0%", "stop-color": "#a78bfa", "stop-opacity": ".32" }),
    make("stop", { offset: "100%", "stop-color": "#67e8f9", "stop-opacity": "0" })
  );
  defs.appendChild(gradient);
  svg.appendChild(defs);

  for (let i = 0; i <= 4; i++) {
    const lineY = top + (bottom - top) * i / 4;
    svg.appendChild(make("line", {
      x1: left, y1: lineY, x2: right, y2: lineY, class: "chart-grid"
    }));

    const label = make("text", {
      x: 1, y: lineY + 4, class: "chart-label"
    });
    label.textContent = Math.round(scaleMax * (4 - i) / 4);
    svg.appendChild(label);
  }

  const linePath = coords
    .map((point, index) =>
      `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`
    )
    .join(" ");

  const areaPath =
    `${linePath} L ${coords[coords.length - 1].x} ${bottom}` +
    ` L ${coords[0].x} ${bottom} Z`;

  svg.appendChild(make("path", { d: areaPath, class: "chart-area" }));
  svg.appendChild(make("path", { d: linePath, class: "chart-line" }));

  coords.forEach((point) => {
    const circle = make("circle", {
      cx: point.x,
      cy: point.y,
      r: 4.5,
      class: "chart-point"
    });

    const title = make("title");
    title.textContent = `${point.wpm} WPM`;
    circle.appendChild(title);
    svg.appendChild(circle);

    const label = make("text", {
      x: point.x,
      y: 171,
      "text-anchor": "middle",
      class: "chart-label"
    });
    label.textContent = point.label;
    svg.appendChild(label);
  });
}

// --------------------------------------------------
// FINISH AND SAVE RESULT (WITH WEAK KEYS ANALYSIS)
// --------------------------------------------------

function renderWeakKeys() {
  const container = $("#weakKeysContainer");
  const list = $("#weakKeysList");
  if (!container || !list) return;

  const entries = Object.entries(errorKeyMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);

  if (entries.length === 0) {
    container.classList.add("hidden");
    return;
  }

  list.replaceChildren();
  entries.forEach(([key, count]) => {
    const badge = document.createElement("span");
    badge.className = "weak-key-badge";
    badge.textContent = `'${key.toUpperCase()}' (${count}x)`;
    list.appendChild(badge);
  });

  container.classList.remove("hidden");
}

function finishTest() {
  if (finished) return;

  const elapsedSeconds = started
    ? Math.max((Date.now() - startTime) / 1000, 0.1)
    : 0;

  finished = true;
  started = false;
  clearInterval(timerId);
  timerId = null;

  if (elapsedSeconds >= duration) {
    timeLeft = 0;
  }

  typingInput.disabled = true;
  testStatus.textContent = "SESSION COMPLETE";
  testStatus.classList.remove("running");

  const stats = calculateStats();

  const effectiveMinutes = Math.max(elapsedSeconds, 0.1) / 60;
  const finalWpm = Math.round(stats.correctCharacters / 5 / effectiveMinutes);

  wpmDisplay.textContent = finalWpm;
  accuracyDisplay.textContent = stats.accuracy;
  timeDisplay.textContent = timeLeft;
  progressBar.style.width = `${((duration - timeLeft) / duration) * 100}%`;

  $("#resultWpm").textContent = finalWpm;
  $("#resultAccuracy").textContent = `${stats.accuracy}%`;
  $("#resultErrors").textContent = stats.errors;

  renderWeakKeys();

  const isNewRecord = finalWpm > bestWpm;

  if (isNewRecord) {
    bestWpm = finalWpm;
    localStorage.setItem(BEST_KEY, String(bestWpm));
    bestDisplay.textContent = bestWpm;
    $("#resultHeading").textContent = "New personal best!";
    $("#resultMessage").textContent = "You're leveling up. Keep that momentum going!";
    showToast("✨ New personal best!");
  } else {
    $("#resultHeading").textContent =
      finalWpm >= 60 ? "You're on fire!" : "Nice run!";
    $("#resultMessage").textContent =
      "Every session is progress. Ready to beat your record?";
  }

  $("#bestTrack").style.width = `${Math.min((bestWpm / 120) * 100, 100)}%`;

  const now = new Date();
  const label = now.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit"
  });

  history.push({
    wpm: finalWpm,
    accuracy: stats.accuracy,
    errors: stats.errors,
    duration,
    label,
    date: now.toISOString()
  });

  history = history.slice(-7).reverse();
  saveHistory();
  renderHistory();

  resultPanel.classList.remove("hidden");
  resultPanel.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

// --------------------------------------------------
// RESET AND EVENTS
// --------------------------------------------------

function resetTest() {
  clearInterval(timerId);
  timerId = null;

  started = false;
  finished = false;
  startTime = 0;
  timeLeft = duration;
  previousInput = "";
  errorKeyMap = {};

  currentPassage = choosePassage();

  typingInput.value = "";
  typingInput.disabled = false;
  typingInput.maxLength = currentPassage.length;
  typingInput.classList.remove("input-error-shake");

  testStatus.textContent = "WAITING FOR INPUT";
  testStatus.classList.remove("running");

  document.querySelectorAll(".duration-btn").forEach((button) => {
    button.classList.toggle(
      "active",
      Number(button.dataset.duration) === duration
    );
  });

  resultPanel.classList.add("hidden");
  renderPassage();
  updateStats();
}

typingInput.addEventListener("input", (event) => {
  if (finished) return;

  const value = typingInput.value;

  if (value.length > 0) {
    startTest();
  }

  if (value.length > previousInput.length) {
    const typedChar = value[value.length - 1];
    const index = value.length - 1;
    const expectedChar = currentPassage[index];
    const correct = typedChar === expectedChar;

    flashKey(typedChar, correct ? "correct" : "error");
    playKeySound();

    if (!correct) {
      // Track mistyped expected key
      errorKeyMap[expectedChar] = (errorKeyMap[expectedChar] || 0) + 1;

      // Shake animation
      typingInput.classList.remove("input-error-shake");
      void typingInput.offsetWidth;
      typingInput.classList.add("input-error-shake");
    }
  } else if (value.length < previousInput.length) {
    flashKey("Backspace");
    playKeySound();
  }

  previousInput = value;

  updateStats();

  if (value.length >= currentPassage.length) {
    finishTest();
  }
});

typingText.addEventListener("click", () => {
  if (!finished) typingInput.focus();
});

document.querySelectorAll(".duration-btn").forEach((button) => {
  button.addEventListener("click", () => {
    duration = Number(button.dataset.duration);
    resetTest();
    showToast(`${duration}-second test selected`);
  });
});

$("#restartBtn").addEventListener("click", () => {
  resetTest();
  typingInput.focus();
});

$("#tryAgainBtn").addEventListener("click", () => {
  resetTest();
  typingInput.focus();
});

$("#clearHistoryBtn").addEventListener("click", () => {
  if (!history.length) {
    showToast("No history to clear");
    return;
  }

  const confirmed = window.confirm(
    "Clear your typing history? Your personal best will be kept."
  );

  if (!confirmed) return;

  history = [];
  saveHistory();
  renderHistory();
  showToast("Typing history cleared");
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    resetTest();
    typingInput.focus();
  }
});

// Initial render
bestDisplay.textContent = bestWpm;
renderHistory();
resetTest();
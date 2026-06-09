"use strict";

(function bootstrapPomodoro() {
  const core = globalThis.TimerCore;
  if (!core) {
    throw new Error("TimerCore is not loaded");
  }

  const els = {
    modeLabel: document.getElementById("mode-label"),
    statusLabel: document.getElementById("status-label"),
    timeDisplay: document.getElementById("time-display"),
    startBtn: document.getElementById("start-btn"),
    pauseBtn: document.getElementById("pause-btn"),
    resumeBtn: document.getElementById("resume-btn"),
    resetBtn: document.getElementById("reset-btn"),
    modeButtons: Array.from(document.querySelectorAll("[data-mode]")),
    settingsForm: document.getElementById("settings-form"),
    settingsMessage: document.getElementById("settings-message"),
    workMin: document.getElementById("work-min"),
    shortBreakMin: document.getElementById("short-break-min"),
    longBreakMin: document.getElementById("long-break-min"),
    longBreakEvery: document.getElementById("long-break-every"),
    autoStartBreak: document.getElementById("auto-start-break"),
    autoStartWork: document.getElementById("auto-start-work"),
  };

  const STORAGE_KEY = "pomodoro.settings.v1";
  const RANGE = {
    workMin: [1, 180],
    shortBreakMin: [1, 60],
    longBreakMin: [1, 90],
    longBreakEvery: [1, 12],
  };

  let state = core.createInitialState(loadStoredSettings());

  const MODE_LABELS = {
    [core.MODES.WORK]: "Work",
    [core.MODES.SHORT_BREAK]: "Short Break",
    [core.MODES.LONG_BREAK]: "Long Break",
  };

  function dispatch(event) {
    state = core.reduceTimer(state, event, Date.now());
    render();
  }

  function clampInt(value, min, max, fallback) {
    const num = Number(value);
    if (!Number.isFinite(num)) {
      return fallback;
    }
    return Math.max(min, Math.min(max, Math.floor(num)));
  }

  function settingsToFormValue(settings) {
    return {
      workMin: Math.floor(settings.workSec / 60),
      shortBreakMin: Math.floor(settings.shortBreakSec / 60),
      longBreakMin: Math.floor(settings.longBreakSec / 60),
      longBreakEvery: settings.longBreakEvery,
      autoStartBreak: settings.autoStartBreak,
      autoStartWork: settings.autoStartWork,
    };
  }

  function formValueToSettings() {
    const workMin = clampInt(els.workMin.value, RANGE.workMin[0], RANGE.workMin[1], 25);
    const shortBreakMin = clampInt(
      els.shortBreakMin.value,
      RANGE.shortBreakMin[0],
      RANGE.shortBreakMin[1],
      5,
    );
    const longBreakMin = clampInt(
      els.longBreakMin.value,
      RANGE.longBreakMin[0],
      RANGE.longBreakMin[1],
      15,
    );
    const longBreakEvery = clampInt(
      els.longBreakEvery.value,
      RANGE.longBreakEvery[0],
      RANGE.longBreakEvery[1],
      4,
    );

    return {
      workSec: workMin * 60,
      shortBreakSec: shortBreakMin * 60,
      longBreakSec: longBreakMin * 60,
      longBreakEvery,
      autoStartBreak: els.autoStartBreak.checked,
      autoStartWork: els.autoStartWork.checked,
    };
  }

  function fillSettingsForm(settings) {
    const view = settingsToFormValue(settings);
    els.workMin.value = String(view.workMin);
    els.shortBreakMin.value = String(view.shortBreakMin);
    els.longBreakMin.value = String(view.longBreakMin);
    els.longBreakEvery.value = String(view.longBreakEvery);
    els.autoStartBreak.checked = view.autoStartBreak;
    els.autoStartWork.checked = view.autoStartWork;
  }

  function saveSettings(settings) {
    globalThis.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }

  function loadStoredSettings() {
    const raw = globalThis.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }

    try {
      const parsed = JSON.parse(raw);
      return core.sanitizeSettings(parsed);
    } catch (_error) {
      return null;
    }
  }

  function showSettingsMessage(message) {
    els.settingsMessage.textContent = message;
  }

  function formatTime(totalSec) {
    const safeSec = Math.max(0, Math.floor(totalSec));
    const min = Math.floor(safeSec / 60);
    const sec = safeSec % 60;
    return `${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  }

  function isPaused() {
    const modeDuration = core.getModeDurationSec(state.settings, state.mode);
    return !state.isRunning && state.remainingSec > 0 && state.remainingSec < modeDuration;
  }

  function currentStatusLabel() {
    if (state.isRunning) {
      return "Running";
    }
    if (state.remainingSec === 0) {
      return "Completed";
    }
    if (isPaused()) {
      return "Paused";
    }
    return "Ready";
  }

  function render() {
    const now = Date.now();
    const remaining = state.isRunning ? core.getRemainingSec(state, now) : state.remainingSec;

    els.modeLabel.textContent = MODE_LABELS[state.mode];
    els.statusLabel.textContent = currentStatusLabel();
    els.timeDisplay.textContent = formatTime(remaining);

    const modeDuration = core.getModeDurationSec(state.settings, state.mode);
    const canStart = !state.isRunning && state.remainingSec > 0;
    const canPause = state.isRunning;
    const canResume = !state.isRunning && state.remainingSec > 0 && state.remainingSec < modeDuration;

    els.startBtn.disabled = !canStart;
    els.pauseBtn.disabled = !canPause;
    els.resumeBtn.disabled = !canResume;
    els.resetBtn.disabled = false;

    for (const btn of els.modeButtons) {
      const isActive = btn.dataset.mode === state.mode;
      btn.classList.toggle("is-active", isActive);
      btn.disabled = state.isRunning;
    }

    fillSettingsForm(state.settings);
    els.settingsForm.querySelectorAll("input").forEach((input) => {
      input.disabled = state.isRunning;
    });
  }

  els.startBtn.addEventListener("click", () => dispatch({ type: "START" }));
  els.pauseBtn.addEventListener("click", () => dispatch({ type: "PAUSE" }));
  els.resumeBtn.addEventListener("click", () => dispatch({ type: "RESUME" }));
  els.resetBtn.addEventListener("click", () => dispatch({ type: "RESET" }));

  for (const btn of els.modeButtons) {
    btn.addEventListener("click", () => {
      dispatch({ type: "SET_MODE", mode: btn.dataset.mode });
    });
  }

  els.settingsForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const nextSettings = formValueToSettings();

    dispatch({ type: "UPDATE_SETTINGS", settings: nextSettings });
    saveSettings(state.settings);
    showSettingsMessage("Settings saved.");
  });

  setInterval(() => {
    state = core.reduceTimer(state, { type: "TICK" }, Date.now());
    render();
  }, 250);

  showSettingsMessage("Settings are stored in this browser.");
  render();
})();

"use strict";

const MODES = {
  WORK: "work",
  SHORT_BREAK: "shortBreak",
  LONG_BREAK: "longBreak",
};

const DEFAULT_SETTINGS = {
  workSec: 25 * 60,
  shortBreakSec: 5 * 60,
  longBreakSec: 15 * 60,
  longBreakEvery: 4,
  autoStartBreak: false,
  autoStartWork: false,
};

const VALID_MODES = new Set(Object.values(MODES));

function sanitizeSettings(partialSettings = {}) {
  const merged = { ...DEFAULT_SETTINGS, ...partialSettings };

  return {
    workSec: toPositiveInt(merged.workSec, DEFAULT_SETTINGS.workSec),
    shortBreakSec: toPositiveInt(merged.shortBreakSec, DEFAULT_SETTINGS.shortBreakSec),
    longBreakSec: toPositiveInt(merged.longBreakSec, DEFAULT_SETTINGS.longBreakSec),
    longBreakEvery: toPositiveInt(merged.longBreakEvery, DEFAULT_SETTINGS.longBreakEvery),
    autoStartBreak: Boolean(merged.autoStartBreak),
    autoStartWork: Boolean(merged.autoStartWork),
  };
}

function toPositiveInt(value, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    return fallback;
  }
  const rounded = Math.floor(number);
  return rounded > 0 ? rounded : fallback;
}

function getModeDurationSec(settings, mode) {
  if (mode === MODES.WORK) {
    return settings.workSec;
  }
  if (mode === MODES.SHORT_BREAK) {
    return settings.shortBreakSec;
  }
  if (mode === MODES.LONG_BREAK) {
    return settings.longBreakSec;
  }
  throw new Error(`Unsupported mode: ${mode}`);
}

function createInitialState(partialSettings = {}) {
  const settings = sanitizeSettings(partialSettings);
  return {
    mode: MODES.WORK,
    isRunning: false,
    startedAt: null,
    endsAt: null,
    cycleCount: 0,
    settings,
    remainingSec: getModeDurationSec(settings, MODES.WORK),
  };
}

function getRemainingSec(state, nowMs) {
  if (!state.isRunning) {
    return Math.max(0, Math.floor(state.remainingSec));
  }

  const remainingMs = state.endsAt - nowMs;
  return Math.max(0, Math.ceil(remainingMs / 1000));
}

function start(state, nowMs) {
  if (state.isRunning) {
    return { ...state };
  }

  const remainingSec = state.remainingSec > 0
    ? state.remainingSec
    : getModeDurationSec(state.settings, state.mode);

  return {
    ...state,
    isRunning: true,
    startedAt: nowMs,
    endsAt: nowMs + (remainingSec * 1000),
    remainingSec,
  };
}

function pause(state, nowMs) {
  if (!state.isRunning) {
    return { ...state };
  }

  return {
    ...state,
    isRunning: false,
    startedAt: null,
    endsAt: null,
    remainingSec: getRemainingSec(state, nowMs),
  };
}

function resume(state, nowMs) {
  if (state.isRunning || state.remainingSec <= 0) {
    return { ...state };
  }

  return {
    ...state,
    isRunning: true,
    startedAt: nowMs,
    endsAt: nowMs + (state.remainingSec * 1000),
  };
}

function reset(state) {
  const duration = getModeDurationSec(state.settings, state.mode);
  return {
    ...state,
    isRunning: false,
    startedAt: null,
    endsAt: null,
    remainingSec: duration,
  };
}

function setMode(state, mode) {
  if (!VALID_MODES.has(mode)) {
    throw new Error(`Unsupported mode: ${mode}`);
  }

  const duration = getModeDurationSec(state.settings, mode);
  return {
    ...state,
    mode,
    isRunning: false,
    startedAt: null,
    endsAt: null,
    remainingSec: duration,
  };
}

function updateSettings(state, partialSettings) {
  const settings = sanitizeSettings(partialSettings);
  const duration = getModeDurationSec(settings, state.mode);

  return {
    ...state,
    isRunning: false,
    startedAt: null,
    endsAt: null,
    settings,
    remainingSec: duration,
  };
}

function tick(state, nowMs) {
  if (!state.isRunning) {
    return { ...state };
  }

  const remainingSec = getRemainingSec(state, nowMs);
  if (remainingSec > 0) {
    return {
      ...state,
      remainingSec,
    };
  }

  return {
    ...state,
    isRunning: false,
    startedAt: null,
    endsAt: null,
    remainingSec: 0,
    cycleCount: state.mode === MODES.WORK ? state.cycleCount + 1 : state.cycleCount,
  };
}

function reduceTimer(state, event, nowMs) {
  switch (event.type) {
    case "START":
      return start(state, nowMs);
    case "PAUSE":
      return pause(state, nowMs);
    case "RESUME":
      return resume(state, nowMs);
    case "RESET":
      return reset(state);
    case "SET_MODE":
      return setMode(state, event.mode);
    case "UPDATE_SETTINGS":
      return updateSettings(state, event.settings);
    case "TICK":
      return tick(state, nowMs);
    default:
      throw new Error(`Unsupported event: ${event.type}`);
  }
}

const timerCoreApi = {
  MODES,
  DEFAULT_SETTINGS,
  createInitialState,
  sanitizeSettings,
  getModeDurationSec,
  getRemainingSec,
  start,
  pause,
  resume,
  reset,
  setMode,
  updateSettings,
  tick,
  reduceTimer,
};

if (typeof module !== "undefined" && module.exports) {
  module.exports = timerCoreApi;
}

if (typeof globalThis !== "undefined") {
  globalThis.TimerCore = timerCoreApi;
}
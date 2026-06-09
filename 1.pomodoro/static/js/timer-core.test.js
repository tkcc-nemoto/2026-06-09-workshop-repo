"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  MODES,
  createInitialState,
  getRemainingSec,
  reduceTimer,
} = require("./timer-core");

test("START で実行状態になり endsAt が設定される", () => {
  const now = 1_000;
  const state = createInitialState({ workSec: 10 });

  const next = reduceTimer(state, { type: "START" }, now);

  assert.equal(next.isRunning, true);
  assert.equal(next.startedAt, now);
  assert.equal(next.endsAt, now + 10_000);
  assert.equal(next.remainingSec, 10);
});

test("PAUSE で残り秒が凍結される", () => {
  const startAt = 5_000;
  const state = createInitialState({ workSec: 10 });
  const running = reduceTimer(state, { type: "START" }, startAt);

  const paused = reduceTimer(running, { type: "PAUSE" }, startAt + 3_400);

  assert.equal(paused.isRunning, false);
  assert.equal(paused.startedAt, null);
  assert.equal(paused.endsAt, null);
  assert.equal(paused.remainingSec, 7);
});

test("RESUME で停止時の残り秒から再開できる", () => {
  const state = createInitialState({ workSec: 10 });
  const started = reduceTimer(state, { type: "START" }, 10_000);
  const paused = reduceTimer(started, { type: "PAUSE" }, 13_000);

  const resumed = reduceTimer(paused, { type: "RESUME" }, 20_000);

  assert.equal(resumed.isRunning, true);
  assert.equal(resumed.startedAt, 20_000);
  assert.equal(resumed.endsAt, 27_000);
});

test("RESET で現在モードの初期秒数に戻る", () => {
  const state = createInitialState({ workSec: 10, shortBreakSec: 3 });
  const breakState = reduceTimer(state, { type: "SET_MODE", mode: MODES.SHORT_BREAK }, 0);
  const started = reduceTimer(breakState, { type: "START" }, 100);
  const paused = reduceTimer(started, { type: "PAUSE" }, 1_600);

  const reset = reduceTimer(paused, { type: "RESET" }, 1_700);

  assert.equal(reset.mode, MODES.SHORT_BREAK);
  assert.equal(reset.isRunning, false);
  assert.equal(reset.remainingSec, 3);
});

test("0秒到達時に完了状態になり work 完了回数が加算される", () => {
  const state = createInitialState({ workSec: 2 });
  const started = reduceTimer(state, { type: "START" }, 0);

  const completed = reduceTimer(started, { type: "TICK" }, 2_000);

  assert.equal(completed.isRunning, false);
  assert.equal(completed.remainingSec, 0);
  assert.equal(completed.cycleCount, 1);
});

test("連打耐性: 実行中の START は状態を壊さない", () => {
  const state = createInitialState({ workSec: 10 });
  const started = reduceTimer(state, { type: "START" }, 100);
  const startedAgain = reduceTimer(started, { type: "START" }, 200);

  assert.equal(startedAgain.startedAt, 100);
  assert.equal(startedAgain.endsAt, 10_100);
  assert.equal(startedAgain.isRunning, true);
});

test("境界値: 期限超過時の残り秒は負値にならない", () => {
  const state = createInitialState({ workSec: 1 });
  const started = reduceTimer(state, { type: "START" }, 0);

  const remaining = getRemainingSec(started, 3_500);

  assert.equal(remaining, 0);
});

test("UPDATE_SETTINGS で設定反映後に現在モード残り秒が更新される", () => {
  const state = createInitialState({ workSec: 10, shortBreakSec: 5 });
  const breakState = reduceTimer(state, { type: "SET_MODE", mode: MODES.SHORT_BREAK }, 0);

  const updated = reduceTimer(
    breakState,
    {
      type: "UPDATE_SETTINGS",
      settings: {
        workSec: 30,
        shortBreakSec: 7,
        longBreakSec: 20,
        longBreakEvery: 3,
        autoStartBreak: true,
        autoStartWork: true,
      },
    },
    100,
  );

  assert.equal(updated.mode, MODES.SHORT_BREAK);
  assert.equal(updated.isRunning, false);
  assert.equal(updated.remainingSec, 7);
  assert.equal(updated.settings.longBreakEvery, 3);
  assert.equal(updated.settings.autoStartBreak, true);
});
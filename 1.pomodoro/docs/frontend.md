# フロントエンド ドキュメント

フロントエンドは2つの JavaScript ファイルと1つの CSS ファイルで構成されています。  
`timer-core.js` が状態管理、`ui.js` が DOM 操作を担当し、明確に責務が分離されています。

---

## ファイル構成

| ファイル | 役割 |
|---|---|
| `static/js/timer-core.js` | タイマーコアロジック（純粋関数・状態遷移） |
| `static/js/ui.js` | DOM 更新・イベントハンドリング・設定永続化 |
| `static/css/style.css` | スタイルシート（CSS カスタムプロパティ・レスポンシブ） |
| `templates/index.html` | HTML テンプレート（Jinja2） |

スクリプトの読み込み順: `timer-core.js` → `ui.js`（`ui.js` は `globalThis.TimerCore` に依存）

---

## timer-core.js

タイマーの状態遷移を純粋関数で実装したモジュールです。副作用を持たず、Node.js / ブラウザ両環境で動作します。

### グローバル公開

ブラウザ環境では `globalThis.TimerCore` として公開されます。  
Node.js 環境では `module.exports` でエクスポートされます。

### 定数

#### `MODES`

```js
const MODES = {
  WORK: "work",
  SHORT_BREAK: "shortBreak",
  LONG_BREAK: "longBreak",
};
```

#### `DEFAULT_SETTINGS`

```js
const DEFAULT_SETTINGS = {
  workSec: 1500,        // 25分
  shortBreakSec: 300,   // 5分
  longBreakSec: 900,    // 15分
  longBreakEvery: 4,
  autoStartBreak: false,
  autoStartWork: false,
};
```

### 主要関数

#### `createInitialState(partialSettings?)`

初期状態オブジェクトを生成します。

```js
const state = createInitialState({ workSec: 1500 });
// 戻り値:
// {
//   mode: "work",
//   isRunning: false,
//   startedAt: null,
//   endsAt: null,
//   cycleCount: 0,
//   settings: { ... },
//   remainingSec: 1500
// }
```

#### `reduceTimer(state, event, nowMs)`

イベントを受け取り、次の状態を返す reducer 関数です。

| イベント | 説明 |
|---|---|
| `{ type: "START" }` | タイマーを開始する（実行中の場合は何もしない） |
| `{ type: "PAUSE" }` | タイマーを一時停止する |
| `{ type: "RESUME" }` | 一時停止から再開する |
| `{ type: "RESET" }` | 現在のモードの初期時間にリセットする |
| `{ type: "SET_MODE", mode }` | モードを切り替える（タイマーは停止・リセット） |
| `{ type: "UPDATE_SETTINGS", settings }` | 設定を更新する（タイマーは停止・リセット） |
| `{ type: "TICK" }` | 時刻を更新する（残り秒の再計算・完了判定） |

#### `getRemainingSec(state, nowMs)`

現在の残り秒数を返します。実行中は `endsAt - nowMs` から計算し、負値は `0` を返します。

#### `sanitizeSettings(partialSettings?)`

設定値をバリデーション・補正して返します。無効な数値はデフォルト値で置き換えられます。

---

## ui.js

IIFE（即時実行関数）として動作するモジュールです。`globalThis.TimerCore` が存在しない場合はエラーをスローします。

### DOM 要素

| 要素 ID | 役割 |
|---|---|
| `mode-label` | 現在のモード名表示 |
| `status-label` | 実行状態（Running / Paused / Completed / Ready）表示 |
| `time-display` | 残り時間（`mm:ss` 形式）表示 |
| `start-btn` | タイマー開始ボタン |
| `pause-btn` | タイマー一時停止ボタン |
| `resume-btn` | タイマー再開ボタン |
| `reset-btn` | タイマーリセットボタン |
| `[data-mode]` | モード切替ボタン（`work` / `shortBreak` / `longBreak`） |
| `settings-form` | 設定フォーム |
| `settings-message` | 設定保存メッセージ表示（`aria-live="polite"`） |
| `work-min` | 作業時間入力（1〜180 分） |
| `short-break-min` | 短休憩時間入力（1〜60 分） |
| `long-break-min` | 長休憩時間入力（1〜90 分） |
| `long-break-every` | 長休憩間隔入力（1〜12） |
| `auto-start-break` | 自動休憩開始チェックボックス |
| `auto-start-work` | 自動作業開始チェックボックス |

### ボタン活性制御

| ボタン | 活性条件 |
|---|---|
| Start | 停止中 かつ 残り秒 > 0 |
| Pause | 実行中 |
| Resume | 停止中 かつ 残り秒 > 0 かつ モード初期時間未満 |
| Reset | 常に活性 |
| モード切替ボタン | 停止中のみ活性 |

### ステータス表示

| 表示 | 条件 |
|---|---|
| `Running` | 実行中 |
| `Paused` | 停止中 かつ 残り秒が途中（一時停止状態） |
| `Completed` | 残り秒が `0` |
| `Ready` | 停止中 かつ 残り秒がモード初期時間と同じ |

### 設定の永続化

- LocalStorage キー: `pomodoro.settings.v1`
- 保存タイミング: 設定フォームの送信時（`UPDATE_SETTINGS` イベント適用後）
- 読み込みタイミング: 初期化時（パース失敗時は `null` を返しデフォルト設定を使用）

### タイマーループ

`setInterval` で **250ms** ごとに `TICK` イベントを発行し、`render()` を呼び出します。

---

## style.css

CSS カスタムプロパティ（変数）で色・影などのデザイントークンを管理しています。

### カスタムプロパティ

| 変数 | 値 | 用途 |
|---|---|---|
| `--bg-1` | `#fdf7ef` | 背景グラデーション（外側） |
| `--bg-2` | `#f3e9dc` | 背景グラデーション（内側） |
| `--card` | `#ffffff` | カード背景 |
| `--text` | `#2f241f` | テキスト色 |
| `--accent` | `#c8553d` | アクセント色（モードラベル・アクティブボタン） |
| `--accent-strong` | `#a63f2b` | アクセントの強調色 |
| `--muted` | `#7a685f` | 補助テキスト色 |
| `--border` | `#e6d8c8` | ボーダー色 |
| `--shadow` | `0 16px 30px rgba(73,43,33,0.12)` | カードの影 |

### レスポンシブ対応

`max-width: 640px` のブレークポイントで以下が変更されます:

- アクションボタン行: 4列 → 2列
- 設定フォーム: 2列 → 1列

### タイマー表示

時間表示には `clamp(2.6rem, 8vw, 5rem)` でビューポートに応じたレスポンシブなフォントサイズを適用しています。

---

## index.html

Jinja2 テンプレートとして Flask からレンダリングされます。`lang="ja"` を指定した単一ページ構成です。

静的ファイルの URL は `url_for('static', filename='...')` で生成されます。

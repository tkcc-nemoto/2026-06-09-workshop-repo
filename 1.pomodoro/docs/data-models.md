# データモデル

現時点の実装（フェーズ1 MVP）では、サーバー側のデータベースは存在しません。  
すべてのデータはブラウザのメモリおよび LocalStorage で管理されます。

---

## フロントエンド状態オブジェクト（インメモリ）

`timer-core.js` の `createInitialState()` が生成するオブジェクトの構造です。

| フィールド | 型 | 説明 |
|---|---|---|
| `mode` | `string` | 現在のモード。`"work"` / `"shortBreak"` / `"longBreak"` のいずれか |
| `isRunning` | `boolean` | タイマーが実行中かどうか |
| `startedAt` | `number \| null` | 開始時刻（ミリ秒 UNIX タイムスタンプ）。停止中は `null` |
| `endsAt` | `number \| null` | 終了予定時刻（ミリ秒 UNIX タイムスタンプ）。停止中は `null` |
| `remainingSec` | `number` | 残り秒数（停止中に使用） |
| `cycleCount` | `number` | 完了した作業セッション（`work` モード）の累計回数 |
| `settings` | `Settings` | タイマー設定オブジェクト（下記参照） |

---

## 設定オブジェクト（Settings）

LocalStorage に `pomodoro.settings.v1` キーで保存されます。

| フィールド | 型 | デフォルト値 | 説明 |
|---|---|---|---|
| `workSec` | `number` | `1500`（25分） | 作業モードの秒数 |
| `shortBreakSec` | `number` | `300`（5分） | 短休憩モードの秒数 |
| `longBreakSec` | `number` | `900`（15分） | 長休憩モードの秒数 |
| `longBreakEvery` | `number` | `4` | 何サイクルごとに長休憩を挟むか |
| `autoStartBreak` | `boolean` | `false` | 作業完了後に休憩を自動開始するか |
| `autoStartWork` | `boolean` | `false` | 休憩完了後に作業を自動開始するか |

### バリデーションルール

- 数値フィールドは正の整数のみ有効。無効値はデフォルト値で置き換えられる
- フォーム入力値の有効範囲:

| フィールド | 最小値 | 最大値 |
|---|---|---|
| 作業時間（分） | 1 | 180 |
| 短休憩時間（分） | 1 | 60 |
| 長休憩時間（分） | 1 | 90 |
| 長休憩間隔 | 1 | 12 |

---

## 未実装（フェーズ2 予定）

以下のテーブルはフェーズ2以降に SQLite で実装予定です。

### settings テーブル

| カラム | 型 | 説明 |
|---|---|---|
| `id` | INTEGER | 主キー |
| `work_sec` | INTEGER | 作業時間（秒） |
| `short_break_sec` | INTEGER | 短休憩時間（秒） |
| `long_break_sec` | INTEGER | 長休憩時間（秒） |
| `long_break_every` | INTEGER | 長休憩間隔 |
| `auto_start_break` | BOOLEAN | 自動休憩開始 |
| `auto_start_work` | BOOLEAN | 自動作業開始 |
| `updated_at` | DATETIME | 最終更新日時 |

### sessions テーブル

| カラム | 型 | 説明 |
|---|---|---|
| `id` | INTEGER | 主キー |
| `mode` | TEXT | モード（`work` / `shortBreak` / `longBreak`） |
| `planned_sec` | INTEGER | 予定秒数 |
| `actual_sec` | INTEGER | 実績秒数 |
| `completed` | BOOLEAN | 完了フラグ |
| `started_at` | DATETIME | 開始日時 |
| `completed_at` | DATETIME | 完了日時 |

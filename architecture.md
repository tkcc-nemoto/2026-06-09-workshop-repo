# Webアプリケーション アーキテクチャ案（Pomodoro Timer）

## 1. 目的
このドキュメントは、Flask + HTML/CSS/JavaScriptで実装するPomodoro Timer Webアプリの設計方針を定義する。

本設計の狙いは次の3点。
- 実装を早く進められること（MVP優先）
- 将来の機能追加に耐えられること（拡張性）
- ユニットテストしやすいこと（品質と保守性）

## 2. 設計原則
- フロントエンド主導: タイマー進行はブラウザ側で制御する
- Flaskは薄く: ページ配信とAPI提供に責務を限定する
- 副作用分離: 時刻取得、通知、保存処理は抽象化して境界を明確にする
- テスト容易性重視: タイマー中核は純粋関数ベースで設計する

## 3. 推奨ディレクトリ構成
```text
.
├── architecture.md
├── README.md
└── 1.pomodoro/
    ├── app.py
    ├── templates/
    │   └── index.html
    ├── static/
    │   ├── css/
    │   │   └── style.css
    │   └── js/
    │       ├── timer-core.js
    │       ├── ui.js
    │       └── api.js
    ├── services/
    │   ├── timer_service.py
    │   └── session_service.py
    ├── repositories/
    │   ├── settings_repository.py
    │   └── session_repository.py
    └── models/
        └── dto.py
```

## 4. レイヤ構成と責務

### 4.1 UI層（HTML/CSS/JavaScript）
- HTML: 画面の骨組みのみを定義
- CSS: デザイントークン（色・余白・角丸・影）を変数化して管理
- JavaScript:
  - `timer-core.js`: 状態遷移、残り時間計算（純粋関数中心）
  - `ui.js`: DOM更新、イベントハンドリング
  - `api.js`: Flask API呼び出し

### 4.2 アプリ層（Flask）
- ルーティング（初期ページ配信）
- APIエンドポイント提供
- リクエストバリデーション
- 例外時のエラーレスポンス統一

### 4.3 データ層（Repository + DB）
- 設定値保存（作業時間、休憩時間など）
- セッション履歴保存（完了時刻、モード、実績時間）
- 初期DBはSQLite

## 5. フロントエンド状態設計

### 5.1 状態オブジェクト（例）
- `mode`: `work` | `shortBreak` | `longBreak`
- `isRunning`: 実行中フラグ
- `startedAt`: 開始時刻
- `endsAt`: 終了予定時刻
- `cycleCount`: 完了した作業セッション数
- `settings`: 各モード秒数、長休憩間隔、オート開始設定

### 5.2 重要方針
- 残り時間は都度 `endsAt - now` で再計算する
- 直接「残り秒」をインクリメント/デクリメントしない
- タブ非アクティブや復帰後でも時間ズレに強くする

## 6. API設計（MVP）

### 6.1 設定API
- `GET /api/settings`
  - 設定の取得
- `PUT /api/settings`
  - 設定の更新

### 6.2 セッションAPI
- `POST /api/sessions`
  - セッション完了記録の作成
- `GET /api/sessions?from=...&to=...`
  - 期間指定で履歴取得

## 7. ユニットテストしやすくするための追加設計

### 7.1 純粋関数中心のステートマシン
- 入力: 現在状態、イベント、現在時刻
- 出力: 次状態
- 開始/停止/再開/完了/モード遷移を関数単位でテスト可能

### 7.2 Clock抽象
- `Date.now()`の直接利用を避ける
- 本番: `SystemClock`
- テスト: `FakeClock`
- 時間経過ケースを待機なしで検証可能

### 7.3 Repository抽象
- 設定保存・履歴保存をインターフェース化
- 本番: SQLite実装
- テスト: InMemory実装
- API/ServiceのテストでDB依存を外せる

### 7.4 Flaskハンドラの薄型化
- ルート関数は以下に限定:
  - 入力検証
  - Service呼び出し
  - レスポンス整形
- ビジネスロジックはServiceに集約

### 7.5 入出力スキーマ固定
- Request/Response DTOを定義
- 境界値・欠損・不正入力を機械的に検証可能

## 8. データモデル（初期）

### 8.1 settings
- `id`
- `work_sec`
- `short_break_sec`
- `long_break_sec`
- `long_break_every`
- `auto_start_break`
- `auto_start_work`
- `updated_at`

### 8.2 sessions
- `id`
- `mode`
- `planned_sec`
- `actual_sec`
- `completed`
- `started_at`
- `completed_at`

## 9. 実装フェーズ

### フェーズ1（MVP）
- 単一画面
- 作業/短休憩/長休憩の切替
- Start/Pause/Reset
- 設定値のローカル保持

### フェーズ2
- Flask API接続
- SQLite保存
- セッション履歴表示

### フェーズ3
- 通知音・ブラウザ通知
- 長休憩自動判定の強化
- 日次/週次の可視化

## 10. テスト戦略
- ユニットテスト 70%
  - `timer-core.js`の状態遷移・時刻計算
  - Service層の業務ロジック
- API統合テスト 20%
  - バリデーション
  - 正常系/異常系レスポンス
- E2Eテスト 10%
  - Start -> Pause -> Resume -> Complete の主導線

## 11. 非機能要件（初期）
- モバイル/デスクトップ両対応（レスポンシブ）
- 画面更新の視認性重視（過度なアニメーションを避ける）
- 主要操作の低遅延（体感で即時反映）

## 12. 将来拡張の想定
- ユーザー認証
- クラウド同期
- 統計ダッシュボード
- PWA化（オフライン・通知強化）

---
この方針により、MVPを短期間で構築しつつ、テスト容易性と拡張性を維持できる。
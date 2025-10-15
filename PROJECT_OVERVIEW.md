# スーパーノート日記アプリ - プロジェクト概要

## 📝 アプリの目的
週間ベースの日記アプリケーション。毎日の評価項目をチェックし、振り返りを記録することで、習慣形成と自己改善をサポートします。

## 🎯 主要機能

### 1. 週間管理
- 週単位でデータを管理（2025-W42形式）
- 前週・次週への移動機能
- 週変更時の自動保存機能

### 2. 日記入力
- 今週の目標設定
- 7日間（月〜日）の日別記録
- カスタマイズ可能な評価項目（デフォルト15項目）
- 3段階評価: ⭕️（成功）、✖️（失敗）、△（部分的）
- 日々の感想・気づきのテキスト入力

### 3. データ同期（GitHub連携）
- GitHub APIを使用したデータの保存・読込
- プライベートリポジトリ対応
- Personal Access Token認証
- 自動保存機能（週変更時、ページ終了時）
- 設定保存後の自動同期

### 4. プレビュー・出力
- 週間レポートのテーブル表示
- 画像出力機能（html2canvas使用）
- 印刷対応

### 5. 設定管理
- 評価項目のカスタマイズ（追加・削除）
- GitHub連携設定（トークン、リポジトリ情報）
- デフォルト設定への復元機能

## 🛠 技術スタック

### フロントエンド
- **HTML5**: 単一ファイルアプリケーション
- **CSS3**: カスタムデザインシステム（CSS変数使用）
- **Vanilla JavaScript**: ES6+ クラスベース

### 外部ライブラリ
- **html2canvas**: 画像出力機能

### API連携
- **GitHub REST API v3**: Contents endpoint
- 認証: Personal Access Token (Bearer/token)

### デザインシステム
- カスタムCSS変数
- ライト/ダークモード対応
- レスポンシブデザイン

## 📊 データ構造

### weekData オブジェクト（v2.1形式）
```javascript
{
  week: "2025-W42",              // 週識別子
  goal: "今週の目標テキスト",     // 週間目標
  evaluationItems: [             // 評価項目リスト（v2.1で追加）
    "ハイニコポンをする。",
    "自分の時間をできるだけ使わない。",
    // ...
  ],
  dailyRecords: [                // 7日分の配列
    {
      date: "2025-10-14",        // ISO日付形式
      dayOfWeek: "月",           // 曜日
      responses: {               // 評価項目の回答
        "項目名1": "⭕️",
        "項目名2": "✖️",
        // ...
      },
      reflection: "感想テキスト"  // 日々の振り返り
    },
    // ... 7日分
  ]
}
```

### 後方互換性
- **旧形式（v2.0以前）**: `evaluationItems`フィールドなし
- **読み込み時の処理**: `responses`のキーから項目を自動抽出
- **新規保存**: 常に`evaluationItems`を含める
```

### GitHub保存先
- リポジトリパス: `data/weeks/YYYY-Wnn.json`
- エンコーディング: Base64
- ブランチ: main

## 🔧 GitHub API連携の仕組み

### 必要な設定
1. **Personal Access Token**: `repo` スコープ必要
2. **リポジトリ所有者**: GitHubユーザー名
3. **リポジトリ名**: データ保存先リポジトリ

### API操作

#### ファイル作成・更新 (PUT)
```javascript
PUT /repos/{owner}/{repo}/contents/{path}
Headers:
  - Authorization: Bearer {token}
  - Accept: application/vnd.github+json
  - Content-Type: application/json
Body:
  - message: コミットメッセージ
  - content: Base64エンコードされたJSON
  - sha: 既存ファイルのSHA（更新時のみ必須）
  - branch: main
```

#### ファイル読込 (GET)
```javascript
GET /repos/{owner}/{repo}/contents/{path}
Headers:
  - Authorization: Bearer {token}
  - Accept: application/vnd.github.raw
```

#### SHA取得（更新前）
```javascript
GET /repos/{owner}/{repo}/contents/{path}
Headers:
  - Authorization: Bearer {token}
  - Accept: application/vnd.github+json
Response: { sha, name, path, size, content, ... }
```

### 重要な実装ポイント
- **SHAの取得**: 既存ファイル更新時は必ずSHAが必要（422エラー防止）
- **Accept header**: `application/vnd.github+json`でメタデータ、`application/vnd.github.raw`で生データ
- **キャッシュ制御**: `cache: 'no-store'`でブラウザキャッシュを回避

## 📂 主要クラス・メソッド

### DiaryApp クラス

#### プロパティ
- `currentWeek`: 現在表示中の週
- `weekData`: 現在の週のデータ
- `evaluationItems`: 現在表示中の評価項目の配列
- `lastUsedItems`: 最後に使用した項目のキャッシュ（v2.1で追加）
- `defaultItems`: デフォルト評価項目（固定値）
- `syncSettings`: GitHub連携設定

#### 主要メソッド

**初期化・表示系**
- `init()`: アプリケーション初期化
- `getCurrentWeek()`: 現在の週番号を取得
- `initializeWeekData()`: 週データの初期化
- `updateWeekDisplay()`: 週表示の更新
- `changeWeek(direction)`: 週の移動（±1）

**レンダリング系**
- `renderDiary()`: 日記入力画面の描画
- `renderPreview()`: プレビュー画面の描画
- `renderSettings()`: 設定画面の描画

**データ操作系**
- `setEvaluation(dayIndex, item, value)`: 評価の設定
- `setReflection(dayIndex, value)`: 振り返りの設定
- `isWeekDataEmpty(weekData)`: データが空かチェック
- `loadEvaluationItems(weekData)`: weekDataから評価項目を読み込む（v2.1で追加）

**同期系**
- `saveData()`: データ保存（GitHub）
- `loadData()`: データ読込（GitHub）
- `saveToGitHub(weekData)`: GitHub APIでファイル作成・更新
- `loadWeekData(week)`: GitHub APIでファイル読込

**設定系**
- `addItem()`: 評価項目の追加
- `removeItem(index)`: 評価項目の削除
- `resetToDefaults()`: デフォルト設定に戻す
- `saveSettings()`: 設定保存＋自動同期
- `testConnection()`: GitHub接続テスト

**出力系**
- `exportAsImage()`: 画像出力（PNG）

**UI系**
- `showLoading()` / `hideLoading()`: ローディング表示制御
- `showSyncStatus(message, type)`: 同期状態の表示
- `showStatusMessage(message, type)`: トーストメッセージ表示

## 🔄 自動保存の仕組み

### トリガー
1. **週変更時**: `changeWeek()`内で前週のデータを自動保存
2. **ページ終了時**: `beforeunload`イベントで保存
3. **手動保存**: 保存ボタンクリック

### 条件
- GitHub設定が完了している
- データが空でない（`isWeekDataEmpty()`でチェック）

## 🎨 デザイントークン

### カラーシステム
- プリミティブカラー: cream, gray, slate, teal, red, orange
- セマンティックトークン: primary, secondary, success, error, warning
- ライト/ダークモード自動切替

### スペーシング
- 4px基準のスケール（4, 8, 12, 16, 20, 24, 32px）

### タイポグラフィ
- フォント: FKGroteskNeue, Geist, Inter
- サイズ: 11px〜30px（xs〜4xl）

## 🐛 既知の課題と解決済みの問題

### 解決済み
1. ✅ ローディング画面が消えない → CSS `!important`で解決
2. ✅ 404エラー → localStorage優先、自動読込を調整
3. ✅ repository_dispatch複雑さ → Contents API直接使用
4. ✅ 422エラー（SHA不足）→ Accept headerとキャッシュ制御で解決

### 今後の改善候補
- エラーハンドリングの強化
- オフラインモードの実装
- データバックアップ機能
- 週間統計・グラフ表示
- コードのさらなる最適化

## 📝 ファイル構成

```
Supernote/
├── index.html          # メインHTML（111行）
├── app.js              # メインアプリケーション（380行）
├── github-sync.js      # GitHub API連携（185行）
├── ui-renderer.js      # UI描画とイベント管理（237行）
├── style.css           # CSSスタイル（996行）
├── LICENSE
├── README.md
├── README-v3.md
├── PROJECT_OVERVIEW.md # このファイル
├── mikis_log.md        # 開発ログ
├── chart.png
├── index_backup.html   # リファクタリング前のバックアップ
└── data/
    └── weeks/          # GitHub同期用データディレクトリ
        ├── 2025-W42.json
        └── 2025-W45.json
```

## ✅ 完了したリファクタリング (2025年10月12日)

### ファイル分割の実施
1. **CSS分離** (`style.css` - 996行)
   - 全てのスタイル定義を外部ファイル化
   - カスタムCSS変数システム
   - ライト/ダークモード対応
   - レスポンシブデザイン

2. **JavaScript分離とモジュール化**
   - **`app.js`** (430行) - メインアプリケーション
     - `DiaryApp`クラスの実装
     - 週管理、データ管理、画面遷移
     - 評価項目管理、設定管理
   - **`github-sync.js`** (185行) - GitHub API連携
     - データ保存・読み込み機能
     - 接続テスト機能
   - **`ui-renderer.js`** (242行) - UI描画とイベント管理
     - 日記入力画面の描画
     - プレビュー・設定画面の描画
     - イベントリスナーの管理
     - ローディング・ステータス表示

3. **HTML簡素化** (`index.html` - 111行)
   - 構造のみに集中
   - 外部ファイル参照
   - セマンティックHTML

### 改善された点
- **コードの可読性向上**: 機能ごとにファイル分割
- **メンテナンス性の向上**: 各モジュールが独立
- **責務の明確化**: UI、ロジック、API連携を分離
- **再利用性の向上**: モジュール化により他のプロジェクトでも利用可能
- **⭕️✖️△ボタンの動作修正**: イベントリスナー方式に変更

## ✅ 評価項目管理機能の実装 (2025年10月15日)

### 実装内容

#### 1. 項目の永続化機能
**問題点**:
- 項目を追加しても次回アクセス時に失われる
- 週ごとに項目が異なる可能性があるが、履歴が残らない

**解決策**:
- `weekData`に`evaluationItems`フィールドを追加
- 各週のデータに項目リストを含めて保存
- 既存データ（`evaluationItems`なし）も後方互換性を保つ

#### 2. 項目読み込みの優先順位システム
```javascript
loadEvaluationItems(weekData) の処理順序:
1. weekData.evaluationItems（新形式・明示的に保存された項目）
2. responses のキー（旧形式・データから逆算）
3. lastUsedItems（前回使用した項目のキャッシュ）
4. defaultItems（デフォルト項目）
```

#### 3. lastUsedItems キャッシュ機能
**目的**: データのない新しい週を開いた時に、前回使用した項目を自動的に引き継ぐ

**動作**:
- データ読み込み時: 項目を`lastUsedItems`に保存
- 項目追加・削除時: `lastUsedItems`を更新
- 新規週作成時: `lastUsedItems`から項目を取得

#### 4. 起動時の動作変更
- アプリ起動時に設定画面を表示するように変更
- GitHub連携設定を最初に確認しやすく

### データ形式の進化

**v2.0以前（旧形式）**:
```json
{
  "week": "2025-W45",
  "goal": "...",
  "dailyRecords": [
    {
      "responses": {
        "項目1": "⭕️",
        "項目2": "✖️"
      }
    }
  ]
}
```

**v2.1（新形式）**:
```json
{
  "week": "2025-W46",
  "goal": "...",
  "evaluationItems": ["項目1", "項目2", ...],
  "dailyRecords": [...]
}
```

### 技術的な改善点

1. **後方互換性の維持**
   - 既存データ（2025-W45.jsonなど）も正しく読み込める
   - `responses`のキーから項目を自動抽出

2. **データ整合性の保証**
   - 保存時に必ず`evaluationItems`を含める
   - 項目変更が即座にキャッシュに反映

3. **ユーザー体験の向上**
   - 項目追加後、次の週でも自動的に引き継がれる
   - 設定画面を開かずとも項目の一貫性が保たれる

### UI/UX改善

1. **ラジオボタン方式への変更**
   - ボタンクリックからラジオボタンの`change`イベントへ
   - `data-item`属性で項目名を直接埋め込み
   - インデックス依存を排除し、日本語項目名でも安定動作

2. **イベントリスナーの最適化**
   - `.evaluation-item`要素から直接データを取得
   - 項目の順序に依存しない実装

### 今後の拡張性

- 各週ごとに異なる項目セットを保持可能
- 項目の変更履歴が週データとして残る
- 過去のデータの整合性が完全に保たれる

## 🚀 今後の拡張可能性

1. **さらなるモジュール化**
   - `github-api.js`: GitHub API連携を独立
   - `ui.js`: UI制御を独立
   - `storage.js`: データ管理を独立

2. **テスト追加**
   - ユニットテスト
   - API通信のモック

3. **パフォーマンス改善**
   - イベントリスナーの最適化
   - レンダリングの効率化

---

## 📌 次回以降の課題

### UI/UX改善
- モダンなデザインへのアップデート
- レスポンシブデザインの強化
- アニメーション・トランジションの追加
- アクセシビリティの向上

### 機能追加
- 週間統計・グラフ表示
- データのエクスポート・インポート機能強化
- 検索・フィルター機能
- タグ・カテゴリ機能

---

**作成日**: 2025年10月12日  
**バージョン**: 2.1  
**最終更新**: 2025年10月15日 - 評価項目管理機能の実装完了
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
- 週間サマリー表示（7日分の⭕️✖️△カウント）
- 日別ナビゲーション（左右ボタンで切り替え）
- 単日詳細表示（スクロール不要）
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
- 週間レポートのテーブル表示（項目×日付の2次元表示）
- 感想・気づきの独立セクション表示
- 横スクロール対応で全項目を表示
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
- カスタムCSS変数による一貫したスタイリング
- ライト/ダークモード自動対応
- レスポンシブデザイン（モバイル・タブレット・デスクトップ）
- タブナビゲーションシステム
- カード型UIコンポーネント
- トランジション・アニメーション効果

## 📊 データ構造

### weekData オブジェクト（v3.1形式）
```javascript
{
  week: "2025-W42",              // 週識別子（ISO 8601形式）
  goal: "今週の目標テキスト",     // 週間目標
  evaluationItems: [             // 評価項目リスト（v2.1で追加）
    "ハイニコポンをする。",
    "自分の時間をできるだけ使わない。",
    // ...
  ],
  parentsComment: "親からのコメント", // 親コメント（v3.1で追加）
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
- **v3.1**: `parentsComment`フィールド追加（既存データとも互換性あり）

### GitHub保存先
- リポジトリパス: `data/weeks/YYYY-Wnn.json`
- エンコーディング: Base64
- ブランチ: main

### localStorage保存内容
- **GitHub設定のみ**: `diary-github-settings`
- **親コメント表示状態**: `diary-show-parents-comment`
- **weekDataは保存しない**: GitHubのみに保存

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
- `currentWeek`: 現在表示中の週（ISO 8601形式）
- `currentView`: 現在のビュー（diary/preview/settings）
- `currentDayIndex`: 現在選択中の日のインデックス（0-6）
- `weekData`: 現在の週のデータ
- `evaluationItems`: 現在表示中の評価項目の配列
- `lastUsedItems`: 最後に使用した項目のキャッシュ（v2.1で追加）
- `defaultItems`: デフォルト評価項目（固定値）
- `syncSettings`: GitHub連携設定
- `showParentsComment`: 親コメント欄の表示状態（v3.1で追加）

#### 主要メソッド

**初期化・表示系**
- `init()`: アプリケーション初期化
- `getCurrentWeek()`: 現在の週番号を取得（ISO 8601準拠）
- `getMondayOffset(dayOfWeek)`: 曜日から月曜日へのオフセット計算（v3.1で追加）
- `getFirstMondayOfYear(year)`: 指定年の第1週の月曜日を取得（v3.1で追加）
- `initializeWeekData()`: 週データの初期化
- `updateWeekDisplay()`: 週表示の更新
- `changeWeek(direction)`: 週の移動（±1）
- `changeDay(direction)`: 日の移動（±1）
- `updateNavigationButtons()`: タブボタンの状態更新

**画面遷移系**
- `showDiary()`: 日記入力画面を表示
- `showPreview()`: プレビュー画面を表示
- `showSettings()`: 設定画面を表示
- `hideSettings()`: 設定画面を非表示

**レンダリング系（UIRendererクラス）**
- `renderDiary()`: 日記入力画面の描画
- `createWeekSummary()`: 週間サマリーの生成
- `createDayNavigation()`: 日別ナビゲーションの生成
- `createDayEntry()`: 日記エントリーの生成
- `createParentsCommentSection()`: 親コメント欄の生成（v3.1で追加）
- `renderPreview()`: プレビュー画面の描画（軸反転テーブル）
- `renderSettings()`: 設定画面の描画

**データ操作系**
- `setEvaluation(dayIndex, item, value)`: 評価の設定（再クリックで解除可能、v3.1で改善）
- `setReflection(dayIndex, value)`: 振り返りの設定
- `setParentsComment(value)`: 親コメントの設定（v3.1で追加）
- `isWeekDataEmpty(weekData)`: データが空かチェック（親コメント対応、v3.1で改善）
- `loadEvaluationItems(weekData)`: weekDataから評価項目を読み込む（v2.1で追加）

**親コメント管理（v3.1で追加）**
- `toggleParentsComment()`: 親コメント欄の表示/非表示切替
- `loadParentsCommentVisibility()`: 表示状態をlocalStorageから読み込み

**同期系**
- `saveData()`: データ保存（GitHub）
- `loadData()`: データ読込（GitHub）
- `saveToGitHub(weekData)`: GitHub APIでファイル作成・更新
- `loadWeekData(week)`: GitHub APIでファイル読込

**設定系**
- `addItem()`: 評価項目の追加
- `removeItem(index)`: 評価項目の削除
- `resetToDefaults()`: デフォルト設定に戻す
- `saveSettings()`: 設定保存（localStorageのみ）＋自動同期
- `loadSettings()`: 設定読み込み（localStorage）
- `testConnection()`: GitHub接続テスト

**出力系**
- `exportAsImage()`: 画像出力（PNG）
- `copyImageToClipboard()`: 画像をクリップボードにコピー（v3.1で追加）
- `copyEvaluationTable()`: 評価表をTSV形式でコピー
- `copyReflectionTable()`: 感想・気づきをTSV形式でコピー

**UI系**
- `showLoading()` / `hideLoading()`: ローディング表示制御
- `showSyncStatus(message, type)`: 同期状態の表示
- `showStatusMessage(message, type)`: トーストメッセージ表示

## 🔄 データ保存の仕組み

### 自動保存トリガー
1. **定期保存**: 2分ごとに自動保存（v3.1で30秒→2分に変更）
2. **週変更時**: `changeWeek()`内で前週のデータを自動保存
3. **ページ終了時**: `beforeunload`イベントで警告表示（未保存の場合）
4. **手動保存**: 保存ボタンクリック

### 保存条件
- GitHub設定が完了している
- データが空でない（`isWeekDataEmpty()`でチェック）
  - 目標、評価、感想、親コメントのいずれかに入力があればOK

### ストレージ方針（v3.1で変更）
- **GitHub**: weekDataを保存（メインストレージ）
- **localStorage**: GitHub設定と親コメント表示状態のみ保存
- **weekDataはlocalStorageに保存しない**: シンプル化のため

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

### 解決済み（v3.1: 2025-10-18）
1. ✅ **画像クリップボードコピー**: Clipboard APIで画像直接コピー機能を実装
2. ✅ **自動保存頻度**: 30秒→2分に変更して邪魔にならないように改善
3. ✅ **ラジオボタンキャンセル**: 同じボタンをクリックで未入力状態に戻せるように修正
4. ✅ **日付ズレ問題**: ISO 8601準拠の週番号計算に修正（ヘルパーメソッド導入）
5. ✅ **親コメント欄**: 週間サマリー下に親からのコメント欄を追加

### 解決済み（v3.0以前）
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
├── index.html          # メインHTML（127行）
├── app.js              # メインアプリケーション（909行）- v3.1で大幅拡張
├── github-sync.js      # GitHub API連携（185行）
├── ui-renderer.js      # UI描画とイベント管理（393行）- v3.1で拡張
├── style.css           # CSSスタイル（1333行）- v3.1で親コメント追加
├── LICENSE
├── README.md           # ユーザー向けドキュメント（v3.1対応）
├── README-v3.md        # v3.0リリース時のREADME
├── PROJECT_OVERVIEW.md # このファイル（技術ドキュメント）
├── chart.png           # 画面レイアウト図
├── index_backup.html   # リファクタリング前のバックアップ
└── logs/               # 開発ログディレクトリ
    ├── mikis_log.md    # 開発ログ
    ├── GithubCopilotとの会話の履歴1.json
    └── PROJECT_OVERVIEW.md # このファイル
```

**注意**: GitHub上の `data/weeks/` ディレクトリはリポジトリ内に作成不要。アプリがGitHub API経由で自動作成します。

## 📅 開発履歴

### v3.1.0 (2025年10月18日) - 機能改善アップデート
**主な変更点**:
1. **画像クリップボードコピー**: Clipboard API実装
2. **自動保存頻度調整**: 30秒→2分に変更
3. **ラジオボタンキャンセル機能**: 未入力状態に戻せるように改善
4. **日付計算の修正**: ISO 8601準拠の週番号計算に修正
5. **親コメント欄追加**: 週間サマリー下に親コメント機能を実装
6. **コードリファクタリング**: ヘルパーメソッド導入でコード簡略化

**技術的改善**:
- `getMondayOffset()`, `getFirstMondayOfYear()` ヘルパーメソッド追加
- `copyImageToClipboard()` メソッド追加
- `toggleParentsComment()`, `setParentsComment()`, `loadParentsCommentVisibility()` メソッド追加
- localStorageの使用範囲を設定とUI状態のみに限定
- タイムゾーン安全な日付計算（正午基準）

### v3.0.0 (2025年10月12日) - リファクタリング
**ファイル分割の実施**:
1. **CSS分離** (`style.css` - 996行 → v3.1で1333行)
   - 全てのスタイル定義を外部ファイル化
   - カスタムCSS変数システム
   - ライト/ダークモード対応
   - レスポンシブデザイン

2. **JavaScript分離とモジュール化**
   - **`app.js`** (430行 → v3.1で909行) - メインアプリケーション
     - `DiaryApp`クラスの実装
     - 週管理、データ管理、画面遷移
     - 評価項目管理、設定管理
   - **`github-sync.js`** (185行) - GitHub API連携
     - データ保存・読み込み機能
     - 接続テスト機能
   - **`ui-renderer.js`** (242行 → v3.1で393行) - UI描画とイベント管理
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

## ✅ UI/UX改善の実装 (2025年10月15日)

### 実施した改善項目

#### 1. レイアウトの最適化
**問題点**: 
- 画面を広げた際に「今週の目標」が左半分を占有し、スペースが無駄になっていた

**解決策**:
- 2カラムグリッドレイアウトを廃止
- `flexbox`による縦並びレイアウトに変更
- 目標セクションが画面全幅を使用し、その下に日別記録が表示されるように改善

#### 2. タブナビゲーションの統一
**問題点**:
- 日記入力ボタンが青、他のボタンが白/グレーで常に日記入力が選択されているように見えた
- デザインが不統一で視覚的に混乱を招いていた

**解決策**:
- すべてのタブボタンに統一された`btn--tab`クラスを適用
- **非選択時**: 透明背景、グレーテキスト
- **選択時**: 青色背景(`var(--color-primary)`)、白テキスト
- **ホバー時**: 薄い青色の背景表示
- タブボタンを横並びに配置し、スペースを節約
- コンパクトなタブバーデザインの採用

#### 3. 自動保存UIの簡素化
**問題点**:
- 自動保存機能があるにも関わらず、手動保存・同期ボタンが表示されていた

**解決策**:
- 手動保存・同期ボタンを削除
- 画像出力と印刷ボタンのみを残してUIを簡素化
- 自動保存の動作に合わせたシンプルなUI

#### 4. 日別表示の革新的な改善
**問題点**:
- 7日分が縦に並び、スクロールが必要で全体が把握しにくい
- 他の日の状況を確認するには大量のスクロールが必要

**解決策**:
- **週間サマリー表示**: 
  - 7日分の概要を一画面に表示
  - 各日の⭕️✖️△の数を一目で確認可能
  - クリックで日を直接選択
  - アクティブな日を視覚的に強調表示
- **日別ナビゲーション**:
  - 左右ボタンで日を切り替え
  - 現在選択中の日付を明示
  - 範囲外のボタンは自動的に無効化
- **単日詳細表示**:
  - 選択した日の詳細のみを表示
  - スクロール不要で全体を把握
  - スペース効率の大幅な向上

**実装の詳細**:
```javascript
// app.js
- currentDayIndex プロパティで選択中の日を管理
- changeDay(direction) メソッドで日の切り替え
- 週間サマリーから直接日を選択可能

// ui-renderer.js
- createWeekSummary() で週間概要を生成
- createDayNavigation() でナビゲーションを生成
- 評価カウントを自動計算して表示
```

**CSSスタイル**:
```css
.week-summary-day {
  - カード型のデザイン
  - ホバー効果とトランジション
  - アクティブ時は青色背景に変化
}

.day-navigation {
  - 中央配置のナビゲーションバー
  - 前日/次日ボタンと現在日表示
}
```

#### 5. プレビュー表示の改善
**問題点**:
- 項目数が多いと表が横に長くなりすぎる
- 項目名が見切れて判読できない
- 感想が表内に埋もれて読みにくい

**解決策**:
- **テーブルの軸を反転**:
  - 項目を行、日付を列に配置
  - 横スクロール対応で全項目を表示
  - 項目列を`sticky position`で固定
- **感想セクションの分離**:
  - 感想・気づきを独立したセクションに
  - グリッドレイアウトで見やすく配置
  - 各日のカード型表示
- **レスポンシブ対応**:
  - モバイルでは1カラムのグリッドに自動調整

**実装の構造**:
```html
<div class="preview-table-wrapper">
  <table class="preview-table">
    <thead>
      <th>評価項目</th>
      <th>日付1</th>...<th>日付7</th>
    </thead>
    <tbody>
      <tr><td>項目1</td><td>⭕️</td>...<td>✖️</td></tr>
      ...
    </tbody>
  </table>
</div>

<div class="reflections-section">
  <div class="reflections-grid">
    各日の感想カード...
  </div>
</div>
```

### UI改善の技術的ポイント

1. **状態管理の強化**
   - `currentView`: 表示中の画面（diary/preview/settings）
   - `currentDayIndex`: 選択中の日（0-6）
   - `updateNavigationButtons()`: タブの状態を自動更新

2. **レスポンシブデザイン**
   - モバイルでもタブは横並びを維持
   - グリッドレイアウトは画面サイズに応じて調整
   - タッチ操作に配慮したボタンサイズ

3. **パフォーマンス**
   - 選択した日のみレンダリング
   - 不要なDOM要素を削減
   - スムーズなトランジション

4. **アクセシビリティ**
   - 明確な視覚的フィードバック
   - ボタンの無効化状態の明示
   - コントラストの高い色使い

### 改善による効果

- **スペース効率**: 縦スクロールを大幅に削減
- **視認性**: 週全体の状況を一目で把握可能
- **操作性**: 直感的な日の切り替え
- **一貫性**: 統一されたタブデザイン
- **シンプルさ**: 不要なボタンの削除

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
- ~~モダンなデザインへのアップデート~~ ✅ 完了
- ~~レスポンシブデザインの強化~~ ✅ 完了
- ~~アニメーション・トランジションの追加~~ ✅ 完了
- アクセシビリティの向上（キーボード操作、スクリーンリーダー対応）
- ダークモード切替スイッチの追加
- カスタムテーマカラー設定

### 機能追加
- 週間統計・グラフ表示
- データのエクスポート・インポート機能強化（JSON、CSV形式）
- 検索・フィルター機能
- タグ・カテゴリ機能
- 月間ビュー・年間ビューの追加
- 目標達成率の可視化

---

**作成日**: 2025年10月12日  
**バージョン**: 2.2  
**最終更新**: 2025年10月15日 - UI/UX大幅改善（タブナビゲーション、日別表示、プレビュー表示の刷新）
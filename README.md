# スーパーノート日記アプリ v3 - GitHub Actionsデータ同期システム

プライベートリポジトリとの自動データ同期機能を追加したスーパーノート日記アプリです。GitHub Pagesでフロントエンドを公開し、GitHub Actionsを使用してプライベートリポジトリにセキュアにデータを保存します。

## 新機能（v3）

### GitHub Actions連携データ同期
- **プライベートリポジトリ同期**: GitHub Actionsを使用してプライベートリポジトリにデータを自動保存
- **Personal Access Token認証**: セキュアなトークンベース認証
- **自動バックアップ**: 定期的なデータバックアップ機能
- **同期ステータス表示**: リアルタイムの同期状況監視

### セキュリティ機能
- **トークン暗号化**: Personal Access Tokenの暗号化保存
- **権限分離**: 公開リポジトリとプライベートデータの完全分離
- **監査ログ**: データ同期の詳細ログ管理

## システム構成

[98]

### アーキテクチャ概要

1. **Public Repository (GitHub Pages)**
   - スーパーノート日記アプリのフロントエンド
   - LocalStorageでの一時的なデータ保存
   - ユーザーインターフェース

2. **GitHub Actions (データ同期)**
   - Personal Access Token認証
   - 自動データ同期ワークフロー
   - GitHub API連携処理

3. **Private Repository (データ管理)**
   - 日記データのセキュアな保存
   - JSON形式でのデータ管理
   - バックアップ・履歴管理

## セットアップ手順

### 1. リポジトリ構成

#### Public Repository (GitHub Pages用)
```bash
# 公開用リポジトリを作成
git clone https://github.com/your-username/super-note-diary-public.git
cd super-note-diary-public

# アプリケーションファイルを配置
# index.html, style.css, app.js をコピー
```

#### Private Repository (データ保存用)
```bash
# プライベートリポジトリを作成
git clone https://github.com/your-username/super-note-diary-data.git
cd super-note-diary-data

# データ保存用ディレクトリ構造
mkdir -p data/weeks
mkdir -p data/settings
mkdir -p data/backups
```

### 2. Personal Access Token設定

GitHub Settings → Developer settings → Personal access tokens

**必要なスコープ:**
```
✅ repo (Full control of private repositories)
✅ workflow (Update GitHub Action workflows)
```

### 3. GitHub Actions設定

#### Public Repository に追加するワークフロー
`.github/workflows/sync-to-private.yml`
```yaml
name: Sync Data to Private Repository

on:
  repository_dispatch:
    types: [sync-diary-data]
  workflow_dispatch:
    inputs:
      data:
        description: 'Diary data to sync'
        required: true
        type: string

jobs:
  sync-data:
    runs-on: ubuntu-latest
    steps:
    - name: Checkout private repository
      uses: actions/checkout@v4
      with:
        repository: ${{ secrets.PRIVATE_REPO_NAME }}
        token: ${{ secrets.PAT_TOKEN }}
        path: private-repo

    - name: Process and save data
      run: |
        # データの処理とバックアップ
        echo '${{ github.event.inputs.data || github.event.client_payload.data }}' > temp_data.json
        
        # 週データの保存
        WEEK=$(jq -r '.week' temp_data.json)
        mkdir -p private-repo/data/weeks
        cp temp_data.json private-repo/data/weeks/${WEEK}.json
        
        # バックアップの作成
        BACKUP_FILE="private-repo/data/backups/backup-$(date +%Y%m%d-%H%M%S).json"
        cp temp_data.json "$BACKUP_FILE"

    - name: Commit and push to private repository
      run: |
        cd private-repo
        git config user.name "Diary Sync Bot"
        git config user.email "sync@example.com"
        git add .
        git commit -m "Auto-sync diary data: $(date)"
        git push
```

### 4. Secrets設定

Public Repository の Settings → Secrets and variables → Actions

```
PAT_TOKEN: your_personal_access_token_here
PRIVATE_REPO_NAME: your-username/super-note-diary-data
```

### 5. データ同期API設定

#### Private Repository のAPI endpoint設定
`.github/workflows/api-handler.yml`
```yaml
name: API Data Handler

on:
  workflow_dispatch:
    inputs:
      action:
        description: 'Action type (save/load/list)'
        required: true
        type: choice
        options:
        - save
        - load
        - list
      week:
        description: 'Week identifier (e.g., 2024-W42)'
        required: false
        type: string
      data:
        description: 'Data payload for save action'
        required: false
        type: string

jobs:
  handle-api-request:
    runs-on: ubuntu-latest
    steps:
    - name: Checkout
      uses: actions/checkout@v4

    - name: Handle save action
      if: inputs.action == 'save'
      run: |
        mkdir -p data/weeks
        echo '${{ inputs.data }}' > data/weeks/${{ inputs.week }}.json

    - name: Handle load action
      if: inputs.action == 'load'
      run: |
        if [ -f "data/weeks/${{ inputs.week }}.json" ]; then
          cat data/weeks/${{ inputs.week }}.json
        else
          echo '{"error": "Week not found"}'
        fi

    - name: Handle list action
      if: inputs.action == 'list'
      run: |
        ls data/weeks/*.json 2>/dev/null | xargs -I {} basename {} .json || echo '[]'

    - name: Commit changes
      if: inputs.action == 'save'
      run: |
        git config user.name "API Handler"
        git config user.email "api@example.com"
        git add .
        git commit -m "API: ${{ inputs.action }} - ${{ inputs.week }}" || exit 0
        git push
```

## 使用方法

### 初期設定

1. **設定画面でPATとリポジトリURLを設定**
   ```
   Personal Access Token: ghp_xxxxxxxxxxxxxxxxxxxx
   Private Repository: https://github.com/username/diary-data
   ```

2. **同期設定の有効化**
   ```
   自動同期: ON
   同期間隔: 即座に同期
   ```

### データ同期操作

1. **手動同期**
   ```
   入力画面 → 同期ボタン → データがプライベートリポジトリに保存
   ```

2. **自動同期**
   ```
   データ保存時 → 自動的にGitHub Actionsが実行 → プライベートリポジトリに同期
   ```

3. **データ復元**
   ```
   設定画面 → インポートボタン → プライベートリポジトリからデータ復元
   ```

### API呼び出し例

#### 手動でGitHub Actions APIを呼び出す場合

```bash
# データ保存
curl -X POST \
  -H "Authorization: token YOUR_PAT_TOKEN" \
  -H "Accept: application/vnd.github+json" \
  https://api.github.com/repos/username/super-note-diary-public/actions/workflows/sync-to-private.yml/dispatches \
  -d '{
    "ref": "main",
    "inputs": {
      "data": "{\"week\":\"2024-W42\",\"goal\":\"心を込めて日々を過ごす\"}"
    }
  }'

# データ取得
curl -X POST \
  -H "Authorization: token YOUR_PAT_TOKEN" \
  -H "Accept: application/vnd.github+json" \
  https://api.github.com/repos/username/super-note-diary-data/actions/workflows/api-handler.yml/dispatches \
  -d '{
    "ref": "main",
    "inputs": {
      "action": "load",
      "week": "2024-W42"
    }
  }'
```

## データ構造

### エクスポート形式
```json
{
  "version": "3.0",
  "exported": "2024-10-09T08:00:00Z",
  "syncInfo": {
    "source": "super-note-diary-v3",
    "privateRepo": "username/diary-data",
    "syncId": "uuid-here"
  },
  "settings": {
    "customItems": [
      "今週の目標",
      "ハイニコポンをする。"
    ],
    "appVersion": "3.0"
  },
  "weeks": {
    "2024-W42": {
      "goal": "心を込めて日々を過ごす",
      "created": "2024-10-14T09:00:00Z",
      "modified": "2024-10-15T20:30:00Z",
      "dailyRecords": [
        {
          "date": "2024-10-14",
          "dayOfWeek": "月",
          "responses": {
            "ハイニコポンをする。": "○",
            "自分の時間をできるだけ使わない。": "△"
          },
          "reflection": "今日は比較的心穏やかに過ごせた。"
        }
      ]
    }
  }
}
```

### 同期ログ形式
```json
{
  "syncLogs": [
    {
      "timestamp": "2024-10-09T08:00:00Z",
      "action": "sync",
      "week": "2024-W42",
      "status": "success",
      "message": "データが正常に同期されました"
    }
  ]
}
```

## セキュリティ考慮事項

### Personal Access Token管理
- **暗号化保存**: LocalStorageでの暗号化保存
- **最小権限の原則**: 必要最小限のスコープのみ許可
- **定期的な更新**: トークンの定期的な更新推奨

### プライベートリポジトリ保護
- **権限制限**: 必要最小限のCollaboratorのみ追加
- **監査ログ**: すべてのアクセスログを記録
- **バックアップ**: 定期的なデータバックアップ

### GitHub Actions安全性
- **Secrets使用**: Secretsでの認証情報管理
- **ワークフロー制限**: 承認されたワークフローのみ実行
- **ログ監視**: 実行ログの定期的な確認

## トラブルシューティング

### 同期エラーの対処

1. **Personal Access Token問題**
   ```
   エラー: 401 Unauthorized
   対処: PATの有効期限とスコープを確認
   ```

2. **リポジトリアクセス問題**
   ```
   エラー: 404 Not Found
   対処: リポジトリURL とアクセス権限を確認
   ```

3. **GitHub Actions失敗**
   ```
   エラー: Workflow failed
   対処: Actions タブでログを確認し、Secretsを再設定
   ```

### データ復旧手順

1. **バックアップからの復旧**
   ```bash
   # プライベートリポジトリからバックアップファイル取得
   curl -H "Authorization: token YOUR_PAT" \
     https://api.github.com/repos/username/diary-data/contents/data/backups/backup-20241009.json
   ```

2. **手動データ復元**
   ```
   設定画面 → データインポート → JSONファイルを選択 → インポート実行
   ```

## 更新履歴

- **v3.0.0** (2025-10-09): GitHub Actions連携機能追加
  - プライベートリポジトリ自動同期
  - Personal Access Token認証
  - セキュアなデータ管理システム
  - 同期ステータス表示機能
  - データエクスポート/インポート機能

- **v2.0.0** (2025-10-09): カスタマイズ機能追加
- **v1.0.0** (2025-10-08): 初回リリース

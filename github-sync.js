// GitHub同期機能モジュール

class GitHubSync {
    constructor(app) {
        this.app = app;
    }

    /**
     * GitHub APIを使用してデータを保存
     * @param {Object} weekData - 保存する週データ
     * @returns {Promise<boolean>} - 成功時true
     */
    async saveToGitHub(weekData) {
        const token = this.app.syncSettings.githubToken;
        const owner = this.app.syncSettings.repoOwner;
        const repo = this.app.syncSettings.repoName;
        
        if (!token || !owner || !repo) {
            console.log('GitHub token not configured');
            return false;
        }
        
        const filePath = `data/weeks/${weekData.week}.json`;
        const content = btoa(unescape(encodeURIComponent(JSON.stringify(weekData, null, 2))));

        // まず既存ファイルのSHAを取得（更新の場合に必要）
        let sha = null;
        try {
            console.log('Checking for existing file:', filePath);
            const getResponse = await fetch(
                `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Accept': 'application/vnd.github+json'
                    },
                    cache: 'no-store' // キャッシュを無効化して最新情報を取得
                }
            );

            console.log('GET response status:', getResponse.status);

            if (getResponse.ok) {
                const fileData = await getResponse.json();
                console.log('📦 File data received:', fileData);
                console.log('🔍 Looking for SHA in:', Object.keys(fileData));
                sha = fileData.sha;
                console.log('✅ Found existing file, SHA:', sha);
            } else if (getResponse.status === 404) {
                console.log('ℹ️ File does not exist, will create new');
            } else {
                console.warn('⚠️ Unexpected status:', getResponse.status);
                const errorData = await getResponse.json();
                console.warn('Error data:', errorData);
            }
        } catch (e) {
            console.log('File does not exist, will create new');
        }

        console.log('SHA before PUT:', sha);
        
        // ファイルを作成または更新
        const putData = {
            message: `Save diary data for ${weekData.week}`,
            content: content,
            branch: 'main'
        };
        
        if (sha) {
            putData.sha = sha; // 更新の場合はSHAを指定
        }
        
        try {
            const response = await fetch(
                `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`,
                {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Accept': 'application/vnd.github+json',
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(putData)
                }
            );
            
            if (response.ok) {
                console.log('Successfully saved to GitHub');
                return true;
            } else {
                const errorData = await response.json();
                console.error('GitHub API error:', errorData);
                return false;
            }
        } catch (error) {
            console.error('GitHub API error:', error);
            return false;
        }
    }

    /**
     * GitHub APIから週データを読み込み
     * @param {string} week - 週識別子（例: 2025-W42）
     * @returns {Promise<Object|null>} - 週データまたはnull
     */
    async loadWeekData(week) {
        const token = this.app.syncSettings.githubToken;
        const owner = this.app.syncSettings.repoOwner;
        const repo = this.app.syncSettings.repoName;
        
        if (!token || !owner || !repo) {
            console.log('GitHub settings not configured');
            return null;
        }

        try {
            const filePath = `data/weeks/${week}.json`;
            const response = await fetch(
                `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Accept': 'application/vnd.github.raw'
                    }
                }
            );

            if (response.ok) {
                const data = await response.json();
                console.log('Successfully loaded from GitHub');
                return data;
            } else if (response.status === 404) {
                console.log('No saved data found for week:', week);
                return null;
            } else {
                throw new Error(`GitHub API error: ${response.status}`);
            }
        } catch (error) {
            console.log('No saved data found for week:', week);
            return null;
        }
    }

    /**
     * GitHub APIを使用して週データを削除
     * @param {string} week - 週識別子（例: 2025-W42）
     * @returns {Promise<boolean>} - 成功時true
     */
    async deleteWeekData(week) {
        const token = this.app.syncSettings.githubToken;
        const owner = this.app.syncSettings.repoOwner;
        const repo = this.app.syncSettings.repoName;
        
        if (!token || !owner || !repo) {
            console.log('GitHub token not configured');
            return false;
        }
        
        const filePath = `data/weeks/${week}.json`;

        // ファイルのSHAを取得（削除に必要）
        let sha = null;
        try {
            console.log('Fetching file SHA for deletion:', filePath);
            const getResponse = await fetch(
                `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Accept': 'application/vnd.github+json'
                    },
                    cache: 'no-store'
                }
            );

            if (getResponse.ok) {
                const fileData = await getResponse.json();
                sha = fileData.sha;
                console.log('✅ Found file to delete, SHA:', sha);
            } else if (getResponse.status === 404) {
                console.log('ℹ️ File does not exist, nothing to delete');
                return true; // ファイルが存在しない場合は成功とみなす
            } else {
                console.warn('⚠️ Unexpected status:', getResponse.status);
                return false;
            }
        } catch (e) {
            console.log('File does not exist, nothing to delete');
            return true; // ファイルが存在しない場合は成功とみなす
        }

        // ファイルを削除
        const deleteData = {
            message: `Delete diary data for ${week}`,
            sha: sha,
            branch: 'main'
        };
        
        try {
            const response = await fetch(
                `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`,
                {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Accept': 'application/vnd.github+json',
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(deleteData)
                }
            );
            
            if (response.ok) {
                console.log('Successfully deleted from GitHub');
                return true;
            } else {
                const errorData = await response.json();
                console.error('GitHub API delete error:', errorData);
                return false;
            }
        } catch (error) {
            console.error('GitHub API delete error:', error);
            return false;
        }
    }

    /**
     * GitHub接続をテスト
     * @param {string} token - GitHubトークン
     * @param {string} owner - リポジトリ所有者
     * @param {string} repo - リポジトリ名
     * @returns {Promise<Object>} - {success: boolean, message: string}
     */
    async testConnection(token, owner, repo) {
        if (!token || !owner || !repo) {
            return {
                success: false,
                message: 'すべてのフィールドを入力してください'
            };
        }

        try {
            const response = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/vnd.github+json'
                }
            });

            if (response.ok) {
                return {
                    success: true,
                    message: '✅ 接続成功'
                };
            } else {
                return {
                    success: false,
                    message: `❌ 接続エラー: ${response.status}`
                };
            }
        } catch (error) {
            return {
                success: false,
                message: `❌ ${error.message}`
            };
        }
    }
}

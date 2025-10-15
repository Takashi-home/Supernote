// スーパーノート日記アプリ - メインアプリケーション

class DiaryApp {
    constructor() {
        // 現在の週
        this.currentWeek = this.getCurrentWeek();
        this.currentView = 'diary';
        this.currentDayIndex = 0; // 現在選択中の日のインデックス（0-6）
        this.weekData = null;
        
        // 同期設定
        this.syncSettings = {
            githubToken: '',
            repoOwner: '',
            repoName: ''
        };

        // デフォルト項目を定義
        this.defaultItems = [
            "今週の目標",
            "ハイニコポンをする。",
            "自分の時間をできるだけ使わない。",
            "人のことを悪く思わない。",
            "ふとした瞬間の心で人に不足せず、感謝する。",
            "毎日親が喜んでくださることを研究する。",
            "実行するときは心からする。",
            "朝起きた時にまず、親への感謝から。",
            "人に迷惑をかけない。",
            "じっとしとらん、親の思いにはまりたい、ありがたいと思って日々を通る。",
            "因縁自覚をする。",
            "毎日勉強する。",
            "字を綺麗に書く。",
            "身だしなみを整える。",
            "体幹、筋トレ、柔軟、バレエ",
            "やるべきことを終わらせてから寝る。"
        ];

        this.evaluationItems = [...this.defaultItems.slice(1)]; // "今週の目標"を除く
        
        // 最後に使用した項目リスト（セッション中のキャッシュ）
        this.lastUsedItems = null;

        this.checkOptions = [
            { value: '⭕️', label: '⭕️', color: '#22c55e', class: 'success' },
            { value: '✖️', label: '✖️', color: '#ef4444', class: 'error' },
            { value: '△', label: '△', color: '#f59e0b', class: 'warning' }
        ];

        // モジュールの初期化
        this.githubSync = new GitHubSync(this);
        this.uiRenderer = new UIRenderer(this);

        this.init();
    }

    init() {
        this.uiRenderer.hideLoading();
        this.updateWeekDisplay();
        this.initializeWeekData();
        this.uiRenderer.renderDiary();
        this.updateNavigationButtons(); // ナビゲーションボタンの初期状態を設定
        this.loadData(); // アプリ起動時に同期データを自動読込
        this.loadSettings();
        
        // 初期表示を設定画面にする
        this.showSettings();
        
        // ページを閉じる前に自動保存
        window.addEventListener('beforeunload', async (e) => {
            if (this.syncSettings.githubToken && this.syncSettings.repoOwner && this.syncSettings.repoName) {
                const hasData = this.weekData && !this.isWeekDataEmpty(this.weekData);
                
                if (hasData) {
                    // データがある場合は保存を試みる
                    e.preventDefault();
                    e.returnValue = ''; // Chrome用
                    
                    // 非同期保存を実行
                    await this.saveData();
                }
            }
        });
    }

    // ==================== 週管理 ====================

    getCurrentWeek() {
        const now = new Date();
        const year = now.getFullYear();
        const firstDayOfYear = new Date(year, 0, 1);
        const pastDaysOfYear = (now - firstDayOfYear) / 86400000;
        const weekNumber = Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
        return `${year}-W${String(weekNumber).padStart(2, '0')}`;
    }

    updateWeekDisplay() {
        document.getElementById('currentWeek').textContent = this.currentWeek;
    }

    async changeWeek(direction) {
        // 現在の週のデータを自動保存（GitHubに設定がある場合のみ）
        if (this.syncSettings.githubToken && this.syncSettings.repoOwner && this.syncSettings.repoName) {
            const hasData = this.weekData && !this.isWeekDataEmpty(this.weekData);
            
            if (hasData) {
                this.uiRenderer.showLoading();
                this.uiRenderer.showSyncStatus('💾 自動保存中...', 'loading');
                await this.saveData();
            }
        }

        const [year, week] = this.currentWeek.split('-W');
        let newWeek = parseInt(week) + direction;
        let newYear = parseInt(year);
        
        if (newWeek < 1) {
            newWeek = 52;
            newYear--;
        } else if (newWeek > 52) {
            newWeek = 1;
            newYear++;
        }
        
        this.currentWeek = `${newYear}-W${String(newWeek).padStart(2, '0')}`;
        this.updateWeekDisplay();
        this.weekData = null; // 週変更時にデータをリセット
        this.initializeWeekData();
        this.uiRenderer.renderDiary();
        this.loadData(); // 週変更時にもデータ読込
    }

    // ==================== データ管理 ====================

    /**
     * weekDataから評価項目を読み込む
     * 優先順位: evaluationItems > responsesのキー > lastUsedItems > デフォルト
     */
    loadEvaluationItems(weekData) {
        if (weekData.evaluationItems && weekData.evaluationItems.length > 0) {
            // 新形式: 明示的に保存された項目
            this.evaluationItems = [...weekData.evaluationItems];
        } else if (weekData.dailyRecords && weekData.dailyRecords.length > 0) {
            // 旧形式: responsesのキーから抽出
            const itemsSet = new Set();
            weekData.dailyRecords.forEach(record => {
                if (record.responses) {
                    Object.keys(record.responses).forEach(item => {
                        itemsSet.add(item);
                    });
                }
            });
            if (itemsSet.size > 0) {
                this.evaluationItems = Array.from(itemsSet);
            } else if (this.lastUsedItems && this.lastUsedItems.length > 0) {
                // 前回使用した項目
                this.evaluationItems = [...this.lastUsedItems];
            } else {
                // デフォルト項目
                this.evaluationItems = [...this.defaultItems.slice(1)];
            }
        } else if (this.lastUsedItems && this.lastUsedItems.length > 0) {
            // データなし、前回使用した項目を使用
            this.evaluationItems = [...this.lastUsedItems];
        } else {
            // データなし、デフォルト項目を使用
            this.evaluationItems = [...this.defaultItems.slice(1)];
        }
        
        // lastUsedItemsを更新
        this.lastUsedItems = [...this.evaluationItems];
    }

    initializeWeekData() {
        if (!this.weekData) {
            this.weekData = {
                week: this.currentWeek,
                goal: '',
                evaluationItems: this.evaluationItems, // 項目を明示的に保存
                dailyRecords: this.generateDailyRecords()
            };
        }
    }

    generateDailyRecords() {
        const records = [];
        const [year, week] = this.currentWeek.split('-W');
        const startDate = this.getDateOfWeek(parseInt(year), parseInt(week));

        const dayNames = ['月', '火', '水', '木', '金', '土', '日'];

        for (let i = 0; i < 7; i++) {
            const date = new Date(startDate);
            date.setDate(date.getDate() + i);
            
            const responses = {};
            this.evaluationItems.forEach(item => {
                responses[item] = '';
            });
            
            records.push({
                date: date.toISOString().split('T')[0],
                dayOfWeek: dayNames[i],
                responses: responses,
                reflection: ''
            });
        }
        
        return records;
    }

    getDateOfWeek(year, week) {
        const firstDayOfYear = new Date(year, 0, 1);
        const days = (week - 1) * 7;
        const mondayOfWeek = new Date(firstDayOfYear);
        mondayOfWeek.setDate(firstDayOfYear.getDate() + days - firstDayOfYear.getDay() + 1);
        return mondayOfWeek;
    }

    isWeekDataEmpty(weekData) {
        if (!weekData) return true;
        if (weekData.goal && weekData.goal.trim() !== '') return false;
        for (const record of weekData.dailyRecords) {
            for (const response of Object.values(record.responses)) {
                if (response && response.trim() !== '') return false;
            }
            if (record.reflection && record.reflection.trim() !== '') return false;
        }
        return true;
    }

    // ==================== 画面遷移 ====================

    showDiary() {
        this.currentView = 'diary';
        document.getElementById('diaryView').classList.remove('hidden');
        document.getElementById('previewView').classList.add('hidden');
        this.updateNavigationButtons();
        this.uiRenderer.renderDiary();
    }

    showPreview() {
        this.currentView = 'preview';
        document.getElementById('diaryView').classList.add('hidden');
        document.getElementById('previewView').classList.remove('hidden');
        this.updateNavigationButtons();
        this.uiRenderer.renderPreview();
    }

    showSettings() {
        this.currentView = 'settings';
        document.getElementById('settingsModal').classList.remove('hidden');
        this.updateNavigationButtons();
        this.uiRenderer.renderSettings();
    }

    hideSettings() {
        document.getElementById('settingsModal').classList.add('hidden');
        // モーダルを閉じた時は日記画面に戻る
        if (this.currentView === 'settings') {
            this.showDiary();
        }
    }

    updateNavigationButtons() {
        // すべてのナビゲーションボタンからactiveクラスを削除
        document.querySelectorAll('.navigation .btn').forEach(btn => {
            btn.classList.remove('btn--active');
        });
        
        // 現在のビューに対応するボタンにactiveクラスを追加
        if (this.currentView === 'diary') {
            document.querySelector('.navigation .btn[onclick*="showDiary"]').classList.add('btn--active');
        } else if (this.currentView === 'preview') {
            document.querySelector('.navigation .btn[onclick*="showPreview"]').classList.add('btn--active');
        } else if (this.currentView === 'settings') {
            document.querySelector('.navigation .btn[onclick*="showSettings"]').classList.add('btn--active');
        }
    }

    changeDay(direction) {
        const newIndex = this.currentDayIndex + direction;
        
        // 範囲チェック（0-6の範囲内）
        if (newIndex >= 0 && newIndex < 7) {
            this.currentDayIndex = newIndex;
            this.uiRenderer.renderDiary();
        }
    }

    // ==================== データ入力 ====================

    setEvaluation(dayIndex, item, value) {
        this.weekData.dailyRecords[dayIndex].responses[item] = value;
    }

    setReflection(dayIndex, value) {
        this.weekData.dailyRecords[dayIndex].reflection = value;
    }

    // ==================== 評価項目管理 ====================

    addItem() {
        const input = document.getElementById('newItemInput');
        const newItem = input.value.trim();

        if (newItem && !this.evaluationItems.includes(newItem)) {
            this.evaluationItems.push(newItem);
            // lastUsedItemsを更新
            this.lastUsedItems = [...this.evaluationItems];
            input.value = '';
            this.uiRenderer.renderSettings();
            this.initializeWeekData();
            this.uiRenderer.renderDiary();
        }
    }

    removeItem(index) {
        this.evaluationItems.splice(index, 1);
        // lastUsedItemsを更新
        this.lastUsedItems = [...this.evaluationItems];
        this.uiRenderer.renderSettings();
        this.initializeWeekData();
        this.uiRenderer.renderDiary();
    }

    resetToDefaults() {
        if (confirm('デフォルト設定に戻しますか？現在の項目はすべて削除されます。')) {
            this.evaluationItems = [...this.defaultItems.slice(1)];
            // lastUsedItemsを更新
            this.lastUsedItems = [...this.evaluationItems];
            this.uiRenderer.renderSettings();
            this.initializeWeekData();
            this.uiRenderer.renderDiary();
        }
    }

    // ==================== 設定管理 ====================

    saveSettings() {
        // GitHub設定を保存
        this.syncSettings.githubToken = document.getElementById('githubToken').value;
        this.syncSettings.repoOwner = document.getElementById('repoOwner').value;
        this.syncSettings.repoName = document.getElementById('repoName').value;
        
        this.uiRenderer.showStatusMessage('設定が保存されました', 'success');
        this.hideSettings();
        
        // 設定保存後、GitHubからデータを同期
        if (this.syncSettings.githubToken && this.syncSettings.repoOwner && this.syncSettings.repoName) {
            this.loadData();
        }
    }

    loadSettings() {
        // 実際のアプリではlocalStorageなどを使用
    }

    async testConnection() {
        const statusDiv = document.getElementById('connectionStatus');
        statusDiv.innerHTML = '<div class="status-message loading">接続テスト中...</div>';
        
        const token = document.getElementById('githubToken').value;
        const owner = document.getElementById('repoOwner').value;
        const repo = document.getElementById('repoName').value;
        
        const result = await this.githubSync.testConnection(token, owner, repo);
        
        const statusClass = result.success ? 'success' : 'error';
        statusDiv.innerHTML = `<div class="status-message ${statusClass}">${result.message}</div>`;
    }

    // ==================== GitHub同期 ====================

    async saveData() {
        this.uiRenderer.showLoading();
        
        // 保存前に最新の評価項目をweekDataに反映
        this.weekData.evaluationItems = [...this.evaluationItems];
        
        try {
            const success = await this.githubSync.saveToGitHub(this.weekData);
            if (success) {
                this.uiRenderer.showSyncStatus('✅ 保存完了', 'success');
            } else {
                this.uiRenderer.showSyncStatus('❌ 保存失敗', 'error');
            }
        } catch (error) {
            console.error('Save error:', error);
            this.uiRenderer.showSyncStatus('❌ 保存エラー', 'error');
        } finally {
            this.uiRenderer.hideLoading();
        }
    }

    async loadData() {
        this.uiRenderer.showSyncStatus('🔄 同期中...', 'loading');
        
        try {
            const data = await this.githubSync.loadWeekData(this.currentWeek);
            if (data) {
                this.weekData = data;
                // データから評価項目を読み込む
                this.loadEvaluationItems(data);
                this.uiRenderer.renderDiary();
                this.uiRenderer.showSyncStatus('✅ 同期完了', 'success');
            } else {
                this.weekData = null;
                // 新規週の場合、前回使用した項目またはデフォルトを使用
                this.initializeWeekData();
                this.uiRenderer.showSyncStatus('ℹ️ 新規週', 'loading');
            }
        } catch (error) {
            console.error('Load error:', error);
            this.uiRenderer.showSyncStatus('❌ 同期エラー', 'error');
        }
    }

    // ==================== 画像出力 ====================

    async exportAsImage() {
        this.uiRenderer.showLoading();
        
        try {
            // プレビューモードに切り替え
            this.showPreview();
            
            // 少し待ってからキャプチャ（レンダリング完了を待つ）
            await new Promise(resolve => setTimeout(resolve, 100));
            
            const element = document.getElementById('previewContent');
            element.classList.add('export-mode');
            
            const options = {
                scale: 3,
                useCORS: true,
                allowTaint: true,
                backgroundColor: '#ffffff',
                width: element.scrollWidth,
                height: element.scrollHeight,
                windowWidth: element.scrollWidth,
                windowHeight: element.scrollHeight,
                scrollX: 0,
                scrollY: 0,
                imageTimeout: 60000
            };
            
            const canvas = await html2canvas(element, options);
            
            // 画像をダウンロード
            const link = document.createElement('a');
            link.download = `diary-${this.currentWeek}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
            
            element.classList.remove('export-mode');
            this.uiRenderer.showStatusMessage('画像がダウンロードされました', 'success');
            
        } catch (error) {
            console.error('Export error:', error);
            this.uiRenderer.showStatusMessage('画像出力エラー: ' + error.message, 'error');
        } finally {
            this.uiRenderer.hideLoading();
        }
    }
}

// アプリケーション初期化
const diaryApp = new DiaryApp();

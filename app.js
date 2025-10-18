// スーパーノート日記アプリ - メインアプリケーション

class DiaryApp {
    constructor() {
        // 現在の週
        this.currentWeek = this.getCurrentWeek();
        this.currentView = 'diary';
        this.currentDayIndex = 0; // 現在選択中の日のインデックス（0-6）
        this.weekData = null;
        this.autoSaveTimer = null; // 自動保存用タイマー
        this.hasUnsavedChanges = false; // 未保存の変更があるか
        this.lastSavedData = null; // 最後に保存したデータのスナップショット
        this.debugMode = false; // デバッグモード（デフォルトOFF）
        this.showParentsComment = false; // 親コメント欄の表示状態
        
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
        
        // 設定を読み込み
        this.loadSettings();
        this.loadParentsCommentVisibility(); // 親コメント欄の表示状態を読み込み
        
        // 設定が保存されているかチェック
        const hasSettings = this.syncSettings.githubToken && 
                           this.syncSettings.repoOwner && 
                           this.syncSettings.repoName;
        
        if (hasSettings) {
            // 設定がある場合は日記入力画面を表示してデータを読み込み
            this.showDiary();
            this.loadData();
        } else {
            // 設定がない場合は設定画面を表示
            this.showSettings();
        }
        
        // ページを閉じる前/リロード前に自動保存
        window.addEventListener('beforeunload', (e) => {
            // 未保存の変更がある場合のみ警告を表示
            if (this.hasUnsavedChanges) {
                e.preventDefault();
                e.returnValue = '保存されていない変更があります。このページを離れますか？';
                return e.returnValue;
            }
        });

        // 定期的な自動保存（2分ごと）
        setInterval(() => {
            if (this.hasUnsavedChanges && this.syncSettings.githubToken) {
                console.log('Auto-saving data...');
                this.autoSave();
            }
        }, 120000);

        // フォーム入力時の変更検知
        document.addEventListener('input', (e) => {
            if (e.target.matches('textarea, input[type="text"]')) {
                this.markAsChanged();
            }
        });
    }

    // ==================== 週管理 ====================

    /**
     * 曜日から月曜日へのオフセットを計算
     * @param {number} dayOfWeek - 0=日曜, 1=月曜, ..., 6=土曜
     * @returns {number} - 月曜日までの日数（負の値）
     */
    getMondayOffset(dayOfWeek) {
        return dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    }

    /**
     * 指定年の第1週の月曜日を取得
     * @param {number} year - 年
     * @returns {Date} - 第1週の月曜日
     */
    getFirstMondayOfYear(year) {
        const jan4 = new Date(year, 0, 4, 12, 0, 0, 0);
        const offset = this.getMondayOffset(jan4.getDay());
        const firstMonday = new Date(jan4);
        firstMonday.setDate(jan4.getDate() + offset);
        return firstMonday;
    }

    getCurrentWeek() {
        const now = new Date();
        now.setHours(12, 0, 0, 0); // タイムゾーンの影響を避けるため正午に設定
        const year = now.getFullYear();
        
        // 今週の月曜日を計算
        const offset = this.getMondayOffset(now.getDay());
        const monday = new Date(now);
        monday.setDate(now.getDate() + offset);
        
        // 第1週の月曜日を取得
        const firstMonday = this.getFirstMondayOfYear(year);
        
        // 週番号を計算
        const daysDiff = Math.floor((monday - firstMonday) / (24 * 60 * 60 * 1000));
        const weekNumber = Math.floor(daysDiff / 7) + 1;
        
        // 年をまたぐ場合の処理
        if (weekNumber < 1) {
            // 前年の最終週
            const prevYear = year - 1;
            const prevFirstMonday = this.getFirstMondayOfYear(prevYear);
            const lastMonday = new Date(prevYear, 11, 31, 12, 0, 0, 0);
            const dec31Offset = this.getMondayOffset(lastMonday.getDay());
            lastMonday.setDate(lastMonday.getDate() + dec31Offset);
            const lastWeek = Math.floor((lastMonday - prevFirstMonday) / (7 * 24 * 60 * 60 * 1000)) + 1;
            return `${prevYear}-W${String(lastWeek).padStart(2, '0')}`;
        } else if (weekNumber > 52) {
            // 翌年の第1週の可能性をチェック
            const nextFirstMonday = this.getFirstMondayOfYear(year + 1);
            if (monday >= nextFirstMonday) {
                return `${year + 1}-W01`;
            }
        }
        
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
                parentsComment: '', // 親からのコメント
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
        // 第1週の月曜日を取得
        const firstMonday = this.getFirstMondayOfYear(year);
        
        // 指定された週の月曜日を計算
        const targetMonday = new Date(firstMonday);
        targetMonday.setDate(firstMonday.getDate() + (week - 1) * 7);
        
        return targetMonday;
    }

    isWeekDataEmpty(weekData) {
        if (!weekData) return true;
        if (weekData.goal && weekData.goal.trim() !== '') return false;
        if (weekData.parentsComment && weekData.parentsComment.trim() !== '') return false;
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

    // ==================== 親コメント管理 ====================

    toggleParentsComment() {
        this.showParentsComment = !this.showParentsComment;
        // 表示状態をlocalStorageに保存
        try {
            localStorage.setItem('diary-show-parents-comment', JSON.stringify(this.showParentsComment));
        } catch (error) {
            console.error('Failed to save parents comment visibility:', error);
        }
        this.uiRenderer.renderDiary();
    }

    loadParentsCommentVisibility() {
        // localStorageから表示状態を読み込み
        try {
            const saved = localStorage.getItem('diary-show-parents-comment');
            if (saved !== null) {
                this.showParentsComment = JSON.parse(saved);
            }
        } catch (error) {
            console.error('Failed to load parents comment visibility:', error);
        }
    }

    setParentsComment(value) {
        this.weekData.parentsComment = value;
        this.markAsChanged();
    }

    // ==================== データ入力 ====================

    setEvaluation(dayIndex, item, value) {
        console.log('setEvaluation called:', { dayIndex, item, value }); // デバッグログ
        this.debugLog(`setEvaluation: day=${dayIndex}, value=${value}`);
        this.weekData.dailyRecords[dayIndex].responses[item] = value;
        this.markAsChanged(); // 変更を検知
    }

    setReflection(dayIndex, value) {
        console.log('setReflection called:', { dayIndex, value }); // デバッグログ
        this.debugLog(`setReflection: day=${dayIndex}, length=${value.length}`);
        this.weekData.dailyRecords[dayIndex].reflection = value;
        this.markAsChanged(); // 変更を検知
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
        
        // localStorageに設定を保存
        try {
            localStorage.setItem('diary-github-settings', JSON.stringify(this.syncSettings));
        } catch (error) {
            console.error('Failed to save settings to localStorage:', error);
        }
        
        this.uiRenderer.showStatusMessage('設定が保存されました', 'success');
        this.hideSettings();
        
        // 設定保存後、GitHubからデータを同期
        if (this.syncSettings.githubToken && this.syncSettings.repoOwner && this.syncSettings.repoName) {
            this.loadData();
        }
    }

    loadSettings() {
        // localStorageから設定を読み込み
        try {
            const savedSettings = localStorage.getItem('diary-github-settings');
            if (savedSettings) {
                this.syncSettings = JSON.parse(savedSettings);
                console.log('Settings loaded from localStorage');
            }
        } catch (error) {
            console.error('Failed to load settings from localStorage:', error);
        }
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

    // デバッグ用：画面にログを表示
    debugLog(message) {
        if (this.debugMode) {
            const debugDiv = document.getElementById('debugLog') || this.createDebugLog();
            const time = new Date().toLocaleTimeString();
            debugDiv.innerHTML = `${time}: ${message}<br>` + debugDiv.innerHTML;
            // 最新10件のみ表示
            const lines = debugDiv.innerHTML.split('<br>');
            if (lines.length > 11) {
                debugDiv.innerHTML = lines.slice(0, 11).join('<br>');
            }
        }
    }

    createDebugLog() {
        const div = document.createElement('div');
        div.id = 'debugLog';
        div.style.cssText = `
            position: fixed;
            bottom: 60px;
            left: 10px;
            right: 10px;
            background: rgba(0,0,0,0.9);
            color: #0f0;
            padding: 10px;
            font-family: monospace;
            font-size: 12px;
            max-height: 200px;
            overflow-y: auto;
            z-index: 9999;
            border-radius: 8px;
            border: 2px solid #0f0;
        `;
        document.body.appendChild(div);
        
        // デバッグモード切り替えボタンも追加
        const toggleBtn = document.createElement('button');
        toggleBtn.textContent = '🐛 デバッグOFF';
        toggleBtn.style.cssText = `
            position: fixed;
            bottom: 10px;
            left: 10px;
            z-index: 10000;
            padding: 8px 12px;
            background: #f00;
            color: white;
            border: none;
            border-radius: 5px;
            font-size: 14px;
        `;
        toggleBtn.onclick = () => {
            this.debugMode = !this.debugMode;
            toggleBtn.textContent = this.debugMode ? '🐛 デバッグOFF' : '🐛 デバッグON';
            toggleBtn.style.background = this.debugMode ? '#f00' : '#0f0';
            div.style.display = this.debugMode ? 'block' : 'none';
        };
        document.body.appendChild(toggleBtn);
        
        return div;
    }

    // 変更を検知してマーク
    markAsChanged() {
        console.log('markAsChanged called'); // デバッグログ
        this.debugLog('markAsChanged called');
        this.hasUnsavedChanges = true;
        this.updateSaveButtonState();
    }

    // 保存ボタンの状態を更新
    updateSaveButtonState() {
        console.log('updateSaveButtonState called, hasUnsavedChanges:', this.hasUnsavedChanges); // デバッグログ
        this.debugLog(`updateSaveButtonState: hasUnsaved=${this.hasUnsavedChanges}`);
        
        // 上部の保存ボタン
        const saveButton = document.getElementById('saveButton');
        // 下部の保存ボタン
        const saveButtonBottom = document.getElementById('saveButtonBottom');
        
        const buttons = [saveButton, saveButtonBottom].filter(btn => btn);
        
        buttons.forEach(button => {
            if (this.hasUnsavedChanges) {
                button.textContent = '💾 保存 *';
                button.classList.add('btn--warning');
            } else {
                button.textContent = '💾 保存';
                button.classList.remove('btn--warning');
            }
        });
        
        if (buttons.length > 0) {
            console.log('Save buttons updated to', this.hasUnsavedChanges ? 'warning' : 'normal', 'state');
            this.debugLog(`Save buttons → ${this.hasUnsavedChanges ? 'WARNING' : 'NORMAL'} state`);
        } else {
            console.error('Save buttons not found!');
            this.debugLog('ERROR: Save buttons not found!');
        }
    }

    // 手動保存
    async manualSave() {
        if (!this.syncSettings.githubToken) {
            this.uiRenderer.showStatusMessage('❌ GitHub設定が必要です', 'error');
            return;
        }

        try {
            this.uiRenderer.showStatusMessage('� 保存中...', 'loading');
            await this.saveData();
            this.hasUnsavedChanges = false;
            this.updateSaveButtonState();
            this.uiRenderer.showStatusMessage('✅ 保存しました', 'success');
        } catch (error) {
            console.error('Manual save error:', error);
            this.uiRenderer.showStatusMessage('❌ 保存エラー: ' + error.message, 'error');
        }
    }

    // 自動保存（30秒ごと）
    async autoSave() {
        if (!this.syncSettings.githubToken) return;

        try {
            console.log('Auto-saving to GitHub...');
            await this.saveData();
            this.hasUnsavedChanges = false;
            this.updateSaveButtonState();
            this.uiRenderer.showStatusMessage('✅ 自動保存完了', 'success', 2000);
        } catch (error) {
            console.error('Auto save error:', error);
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
                this.hasUnsavedChanges = false;
                this.updateSaveButtonState();
            } else {
                this.weekData = null;
                // 新規週の場合、前回使用した項目またはデフォルトを使用
                this.initializeWeekData();
                this.uiRenderer.showSyncStatus('ℹ️ 新規週', 'loading');
                this.hasUnsavedChanges = false;
                this.updateSaveButtonState();
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
            
            // デスクトップサイズで出力（スマホでも全体が表示されるように）
            const exportWidth = Math.max(element.scrollWidth, 1200); // 最低1200pxを確保
            const exportHeight = element.scrollHeight;
            
            const options = {
                scale: 2, // スケールを下げてファイルサイズを抑える
                useCORS: true,
                allowTaint: true,
                backgroundColor: '#ffffff',
                width: exportWidth,
                height: exportHeight,
                windowWidth: 1400, // デスクトップ幅でレンダリング
                windowHeight: exportHeight,
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

    async copyEvaluationTable() {
        try {
            // プレビューモードに切り替え
            this.showPreview();
            
            // 少し待ってからテキストを生成
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // TSV形式（タブ区切り）で評価表を生成
            let tsvLines = [];
            
            // ヘッダー行1: 「評価項目」と各日の日付
            let headerRow1 = ['評価項目'];
            this.weekData.dailyRecords.forEach(record => {
                const date = new Date(record.date);
                const formattedDate = `${date.getMonth() + 1}月${date.getDate()}日`;
                headerRow1.push(formattedDate);
            });
            tsvLines.push(headerRow1.join('\t'));
            
            // ヘッダー行2: 空白と曜日
            let headerRow2 = [''];
            this.weekData.dailyRecords.forEach(record => {
                headerRow2.push(`(${record.dayOfWeek})`);
            });
            tsvLines.push(headerRow2.join('\t'));
            
            // 各評価項目の行
            this.evaluationItems.forEach(item => {
                let row = [item];
                this.weekData.dailyRecords.forEach(record => {
                    const value = record.responses[item] || '-';
                    row.push(value);
                });
                tsvLines.push(row.join('\t'));
            });
            
            // TSVテキストとして結合
            const tsvText = tsvLines.join('\n');
            
            // クリップボードにコピー
            await navigator.clipboard.writeText(tsvText);
            this.uiRenderer.showStatusMessage('✅ 評価表をクリップボードにコピーしました', 'success');
            
        } catch (error) {
            console.error('Copy error:', error);
            this.uiRenderer.showStatusMessage('❌ コピーエラー: ' + error.message, 'error');
        }
    }

    async copyReflectionTable() {
        try {
            // プレビューモードに切り替え
            this.showPreview();
            
            // 少し待ってからテキストを生成
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // TSV形式（タブ区切り）で感想表を生成
            let tsvLines = [];
            
            // ヘッダー行
            tsvLines.push(['日付', '感想・気づき'].join('\t'));
            
            // 各日の感想
            this.weekData.dailyRecords.forEach(record => {
                const date = new Date(record.date);
                const formattedDate = `${date.getMonth() + 1}/${date.getDate()}(${record.dayOfWeek})`;
                const reflection = record.reflection || '';
                tsvLines.push([formattedDate, reflection].join('\t'));
            });
            
            // TSVテキストとして結合
            const tsvText = tsvLines.join('\n');
            
            // クリップボードにコピー
            await navigator.clipboard.writeText(tsvText);
            this.uiRenderer.showStatusMessage('✅ 感想・気づきをクリップボードにコピーしました', 'success');
            
        } catch (error) {
            console.error('Copy error:', error);
            this.uiRenderer.showStatusMessage('❌ コピーエラー: ' + error.message, 'error');
        }
    }

    async copyImageToClipboard() {
        this.uiRenderer.showLoading();
        
        try {
            // プレビューモードに切り替え
            this.showPreview();
            
            // 少し待ってからキャプチャ（レンダリング完了を待つ）
            await new Promise(resolve => setTimeout(resolve, 100));
            
            const element = document.getElementById('previewContent');
            element.classList.add('export-mode');
            
            // デスクトップサイズで出力（スマホでも全体が表示されるように）
            const exportWidth = Math.max(element.scrollWidth, 1200);
            const exportHeight = element.scrollHeight;
            
            const options = {
                scale: 2,
                useCORS: true,
                allowTaint: true,
                backgroundColor: '#ffffff',
                width: exportWidth,
                height: exportHeight,
                windowWidth: 1400,
                windowHeight: exportHeight,
                scrollX: 0,
                scrollY: 0,
                imageTimeout: 60000
            };
            
            const canvas = await html2canvas(element, options);
            
            // CanvasをBlobに変換
            const blob = await new Promise(resolve => {
                canvas.toBlob(resolve, 'image/png');
            });
            
            // ClipboardItem APIを使用して画像をクリップボードにコピー
            if (navigator.clipboard && navigator.clipboard.write) {
                const clipboardItem = new ClipboardItem({ 'image/png': blob });
                await navigator.clipboard.write([clipboardItem]);
                this.uiRenderer.showStatusMessage('✅ 画像をクリップボードにコピーしました', 'success');
            } else {
                throw new Error('お使いのブラウザはクリップボードへの画像コピーに対応していません');
            }
            
            element.classList.remove('export-mode');
            
        } catch (error) {
            console.error('Copy image error:', error);
            this.uiRenderer.showStatusMessage('❌ 画像コピーエラー: ' + error.message, 'error');
        } finally {
            this.uiRenderer.hideLoading();
        }
    }
}

// アプリケーション初期化
const diaryApp = new DiaryApp();

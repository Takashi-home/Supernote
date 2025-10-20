// スーパーノート日記アプリ - メインアプリケーション

// アプリケーション定数
const APP_CONSTANTS = {
    AUTO_SAVE_INTERVAL: 120000, // 2分（ミリ秒）
    STATUS_MESSAGE_DURATION: 3000, // 3秒（ミリ秒）
    DAYS_PER_WEEK: 7,
    FIRST_DAY_INDEX: 0,
    LAST_DAY_INDEX: 6,
    MIN_WEEK_NUMBER: 1,
    MAX_WEEK_NUMBER: 52,
    MONDAY_INDEX: 1,
    SUNDAY_INDEX: 0,
    DAYS_IN_MONDAY_OFFSET: 6,
    NOON_HOUR: 12,
    JANUARY_4TH: 4,
    MS_PER_DAY: 24 * 60 * 60 * 1000,
    RENDER_DELAY: 100, // レンダリング待機時間（ミリ秒）
    CHECKBOX_UNCHECK_DELAY: 10, // チェックボックス解除の遅延（ミリ秒）
    MAX_DEBUG_LINES: 11,
    EXPORT_MIN_WIDTH: 1200,
    EXPORT_WINDOW_WIDTH: 1400,
    EXPORT_SCALE: 2,
    EXPORT_TIMEOUT: 60000,
    STORAGE_KEY_SETTINGS: 'diary-github-settings',
    STORAGE_KEY_PARENTS_COMMENT: 'diary-show-parents-comment',
    DEFAULT_GOAL_INDEX: 0
};

const DAY_NAMES = ['月', '火', '水', '木', '金', '土', '日'];

const CHECK_OPTIONS = [
    { value: '⭕️', label: '⭕️', color: '#22c55e', class: 'success' },
    { value: '✖️', label: '✖️', color: '#ef4444', class: 'error' },
    { value: '△', label: '△', color: '#f59e0b', class: 'warning' }
];

class DiaryApp {
    constructor() {
        // 現在の週
        this.currentWeek = this.getCurrentWeek();
        this.currentView = 'diary';
        this.currentDayIndex = APP_CONSTANTS.FIRST_DAY_INDEX;
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

        this.evaluationItems = this._getDefaultEvaluationItems();
        
        // 最後に使用した項目リスト（セッション中のキャッシュ）
        this.lastUsedItems = null;

        // モジュールの初期化
        this.githubSync = new GitHubSync(this);
        this.uiRenderer = new UIRenderer(this);

        this.init();
    }

    /**
     * デフォルト評価項目を取得（"今週の目標"を除く）
     * @returns {Array<string>} 評価項目の配列
     */
    _getDefaultEvaluationItems() {
        return [...this.defaultItems.slice(APP_CONSTANTS.DEFAULT_GOAL_INDEX + 1)];
    }

    /**
     * イベントリスナーを設定
     * @private
     */
    _setupEventListeners() {
        // ページを閉じる前/リロード前に自動保存
        window.addEventListener('beforeunload', (e) => {
            if (this.hasUnsavedChanges) {
                e.preventDefault();
                e.returnValue = '保存されていない変更があります。このページを離れますか？';
                return e.returnValue;
            }
        });

        // 定期的な自動保存
        setInterval(() => {
            if (this.hasUnsavedChanges && this.syncSettings.githubToken) {
                console.log('Auto-saving data...');
                this.autoSave();
            }
        }, APP_CONSTANTS.AUTO_SAVE_INTERVAL);

        // フォーム入力時の変更検知
        document.addEventListener('input', (e) => {
            if (e.target.matches('textarea, input[type="text"]')) {
                this.markAsChanged();
            }
        });
    }

    init() {
        this.uiRenderer.hideLoading();
        this.updateWeekDisplay();
        this.initializeWeekData();
        this.uiRenderer.renderDiary();
        this.updateNavigationButtons();
        
        // 設定を読み込み
        this.loadSettings();
        this.loadParentsCommentVisibility();
        
        // イベントリスナーを設定
        this._setupEventListeners();
        
        // 設定が保存されているかチェック
        if (this._hasValidSettings()) {
            this.showDiary();
            this.loadData();
        } else {
            this.showSettings();
        }
    }

    /**
     * 有効な設定があるかチェック
     * @returns {boolean} 設定が有効ならtrue
     * @private
     */
    _hasValidSettings() {
        return !!(this.syncSettings.githubToken && 
                  this.syncSettings.repoOwner && 
                  this.syncSettings.repoName);
    }

    // ==================== 週管理 ====================

    /**
     * 曜日から月曜日へのオフセットを計算
     * @param {number} dayOfWeek - 0=日曜, 1=月曜, ..., 6=土曜
     * @returns {number} - 月曜日までの日数（負の値）
     */
    getMondayOffset(dayOfWeek) {
        return dayOfWeek === APP_CONSTANTS.SUNDAY_INDEX 
            ? -APP_CONSTANTS.DAYS_IN_MONDAY_OFFSET 
            : APP_CONSTANTS.MONDAY_INDEX - dayOfWeek;
    }

    /**
     * 指定年の第1週の月曜日を取得
     * @param {number} year - 年
     * @returns {Date} - 第1週の月曜日
     */
    getFirstMondayOfYear(year) {
        const jan4 = new Date(year, 0, APP_CONSTANTS.JANUARY_4TH, 
                             APP_CONSTANTS.NOON_HOUR, 0, 0, 0);
        const offset = this.getMondayOffset(jan4.getDay());
        const firstMonday = new Date(jan4);
        firstMonday.setDate(jan4.getDate() + offset);
        return firstMonday;
    }

    /**
     * 週番号を計算
     * @param {Date} monday - 月曜日の日付
     * @param {Date} firstMonday - その年の第1週の月曜日
     * @returns {number} - 週番号
     * @private
     */
    _calculateWeekNumber(monday, firstMonday) {
        const daysDiff = Math.floor((monday - firstMonday) / APP_CONSTANTS.MS_PER_DAY);
        return Math.floor(daysDiff / APP_CONSTANTS.DAYS_PER_WEEK) + 1;
    }

    /**
     * 週番号を2桁の文字列にフォーマット
     * @param {number} weekNumber - 週番号
     * @returns {string} - フォーマットされた週番号
     * @private
     */
    _formatWeekNumber(weekNumber) {
        return String(weekNumber).padStart(2, '0');
    }

    getCurrentWeek() {
        const now = new Date();
        now.setHours(APP_CONSTANTS.NOON_HOUR, 0, 0, 0); // タイムゾーンの影響を避けるため正午に設定
        const year = now.getFullYear();
        
        // 今週の月曜日を計算
        const offset = this.getMondayOffset(now.getDay());
        const monday = new Date(now);
        monday.setDate(now.getDate() + offset);
        
        // 第1週の月曜日を取得
        const firstMonday = this.getFirstMondayOfYear(year);
        
        // 週番号を計算
        const weekNumber = this._calculateWeekNumber(monday, firstMonday);
        
        // 年をまたぐ場合の処理
        if (weekNumber < APP_CONSTANTS.MIN_WEEK_NUMBER) {
            return this._getPreviousYearLastWeek(year);
        } else if (weekNumber > APP_CONSTANTS.MAX_WEEK_NUMBER) {
            return this._getNextYearFirstWeek(year, monday);
        }
        
        return `${year}-W${this._formatWeekNumber(weekNumber)}`;
    }

    /**
     * 前年の最終週を取得
     * @param {number} year - 現在の年
     * @returns {string} - 週識別子
     * @private
     */
    _getPreviousYearLastWeek(year) {
        const prevYear = year - 1;
        const prevFirstMonday = this.getFirstMondayOfYear(prevYear);
        const lastMonday = new Date(prevYear, 11, 31, APP_CONSTANTS.NOON_HOUR, 0, 0, 0);
        const dec31Offset = this.getMondayOffset(lastMonday.getDay());
        lastMonday.setDate(lastMonday.getDate() + dec31Offset);
        const lastWeek = this._calculateWeekNumber(lastMonday, prevFirstMonday);
        return `${prevYear}-W${this._formatWeekNumber(lastWeek)}`;
    }

    /**
     * 翌年の第1週を取得（該当する場合）
     * @param {number} year - 現在の年
     * @param {Date} monday - 現在の月曜日
     * @returns {string} - 週識別子
     * @private
     */
    _getNextYearFirstWeek(year, monday) {
        const nextFirstMonday = this.getFirstMondayOfYear(year + 1);
        if (monday >= nextFirstMonday) {
            return `${year + 1}-W01`;
        }
        return `${year}-W${this._formatWeekNumber(APP_CONSTANTS.MAX_WEEK_NUMBER)}`;
    }

    updateWeekDisplay() {
        document.getElementById('currentWeek').textContent = this.currentWeek;
    }

    async changeWeek(direction) {
        // 現在の週のデータを自動保存
        await this._autoSaveBeforeWeekChange();

        // 新しい週を計算
        const newWeek = this._calculateNewWeek(direction);
        
        // 週を変更
        this._updateCurrentWeek(newWeek);
        this.loadData();
    }

    /**
     * 週変更前に自動保存
     * @private
     */
    async _autoSaveBeforeWeekChange() {
        if (!this._hasValidSettings()) {
            return;
        }

        const hasData = this.weekData && !this.isWeekDataEmpty(this.weekData);
        
        if (hasData) {
            this.uiRenderer.showLoading();
            this.uiRenderer.showSyncStatus('💾 自動保存中...', 'loading');
            await this.saveData();
        }
    }

    /**
     * 新しい週番号を計算
     * @param {number} direction - 週の移動方向（+1/-1）
     * @returns {string} - 新しい週識別子
     * @private
     */
    _calculateNewWeek(direction) {
        const [year, week] = this.currentWeek.split('-W');
        let newWeek = parseInt(week) + direction;
        let newYear = parseInt(year);
        
        if (newWeek < APP_CONSTANTS.MIN_WEEK_NUMBER) {
            newWeek = APP_CONSTANTS.MAX_WEEK_NUMBER;
            newYear--;
        } else if (newWeek > APP_CONSTANTS.MAX_WEEK_NUMBER) {
            newWeek = APP_CONSTANTS.MIN_WEEK_NUMBER;
            newYear++;
        }
        
        return `${newYear}-W${this._formatWeekNumber(newWeek)}`;
    }

    /**
     * 現在の週を更新
     * @param {string} newWeek - 新しい週識別子
     * @private
     */
    _updateCurrentWeek(newWeek) {
        this.currentWeek = newWeek;
        this.updateWeekDisplay();
        this.weekData = null;
        this.initializeWeekData();
        this.uiRenderer.renderDiary();
    }

    // ==================== データ管理 ====================

    /**
     * weekDataから評価項目を読み込む
     * 優先順位: evaluationItems > responsesのキー > lastUsedItems > デフォルト
     */
    loadEvaluationItems(weekData) {
        if (this._hasExplicitEvaluationItems(weekData)) {
            this.evaluationItems = [...weekData.evaluationItems];
        } else if (this._hasResponsesData(weekData)) {
            this.evaluationItems = this._extractItemsFromResponses(weekData);
        } else if (this.lastUsedItems && this.lastUsedItems.length > 0) {
            this.evaluationItems = [...this.lastUsedItems];
        } else {
            this.evaluationItems = this._getDefaultEvaluationItems();
        }
        
        this.lastUsedItems = [...this.evaluationItems];
    }

    /**
     * 明示的な評価項目があるかチェック
     * @param {Object} weekData - 週データ
     * @returns {boolean}
     * @private
     */
    _hasExplicitEvaluationItems(weekData) {
        return weekData.evaluationItems && weekData.evaluationItems.length > 0;
    }

    /**
     * responsesデータがあるかチェック
     * @param {Object} weekData - 週データ
     * @returns {boolean}
     * @private
     */
    _hasResponsesData(weekData) {
        return weekData.dailyRecords && weekData.dailyRecords.length > 0;
    }

    /**
     * responsesから評価項目を抽出
     * @param {Object} weekData - 週データ
     * @returns {Array<string>} - 評価項目の配列
     * @private
     */
    _extractItemsFromResponses(weekData) {
        const itemsSet = new Set();
        weekData.dailyRecords.forEach(record => {
            if (record.responses) {
                Object.keys(record.responses).forEach(item => {
                    itemsSet.add(item);
                });
            }
        });
        
        if (itemsSet.size > 0) {
            return Array.from(itemsSet);
        }
        
        return this.lastUsedItems && this.lastUsedItems.length > 0
            ? [...this.lastUsedItems]
            : this._getDefaultEvaluationItems();
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

        for (let i = 0; i < APP_CONSTANTS.DAYS_PER_WEEK; i++) {
            records.push(this._createDailyRecord(startDate, i));
        }
        
        return records;
    }

    /**
     * 1日分のレコードを作成
     * @param {Date} startDate - 週の開始日（月曜日）
     * @param {number} dayOffset - 日のオフセット（0-6）
     * @returns {Object} - 日別レコード
     * @private
     */
    _createDailyRecord(startDate, dayOffset) {
        const date = new Date(startDate);
        date.setDate(date.getDate() + dayOffset);
        
        const responses = {};
        this.evaluationItems.forEach(item => {
            responses[item] = '';
        });
        
        return {
            date: date.toISOString().split('T')[0],
            dayOfWeek: DAY_NAMES[dayOffset],
            responses: responses,
            reflection: ''
        };
    }

    getDateOfWeek(year, week) {
        const firstMonday = this.getFirstMondayOfYear(year);
        const targetMonday = new Date(firstMonday);
        targetMonday.setDate(firstMonday.getDate() + (week - 1) * APP_CONSTANTS.DAYS_PER_WEEK);
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
        
        if (this._isValidDayIndex(newIndex)) {
            this.currentDayIndex = newIndex;
            this.uiRenderer.renderDiary();
        }
    }

    /**
     * 有効な日インデックスかチェック
     * @param {number} index - 日のインデックス
     * @returns {boolean}
     * @private
     */
    _isValidDayIndex(index) {
        return index >= APP_CONSTANTS.FIRST_DAY_INDEX && 
               index <= APP_CONSTANTS.LAST_DAY_INDEX;
    }

    // ==================== 親コメント管理 ====================

    toggleParentsComment() {
        this.showParentsComment = !this.showParentsComment;
        this._saveParentsCommentVisibility();
        this.uiRenderer.renderDiary();
    }

    loadParentsCommentVisibility() {
        try {
            const saved = localStorage.getItem(APP_CONSTANTS.STORAGE_KEY_PARENTS_COMMENT);
            if (saved !== null) {
                this.showParentsComment = JSON.parse(saved);
            }
        } catch (error) {
            console.error('Failed to load parents comment visibility:', error);
        }
    }

    /**
     * 親コメント表示状態を保存
     * @private
     */
    _saveParentsCommentVisibility() {
        try {
            localStorage.setItem(
                APP_CONSTANTS.STORAGE_KEY_PARENTS_COMMENT, 
                JSON.stringify(this.showParentsComment)
            );
        } catch (error) {
            console.error('Failed to save parents comment visibility:', error);
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
            this._updateWeekDataWithNewItems();
            this.uiRenderer.renderDiary();
            this.markAsChanged();
        }
    }

    addItemInline() {
        const input = document.getElementById('newItemInputInline');
        const newItem = input.value.trim();

        if (newItem && !this.evaluationItems.includes(newItem)) {
            this.evaluationItems.push(newItem);
            // lastUsedItemsを更新
            this.lastUsedItems = [...this.evaluationItems];
            input.value = '';
            this._updateWeekDataWithNewItems();
            this.uiRenderer.renderDiary();
            this.markAsChanged();
        }
    }

    editItem(index) {
        const currentItem = this.evaluationItems[index];
        const newItem = prompt('項目を編集してください:', currentItem);
        
        if (newItem && newItem.trim() !== '' && newItem.trim() !== currentItem) {
            const trimmedNewItem = newItem.trim();
            
            // 重複チェック（自分以外）
            const isDuplicate = this.evaluationItems.some((item, i) => 
                i !== index && item === trimmedNewItem
            );
            
            if (isDuplicate) {
                alert('この項目は既に存在します。');
                return;
            }
            
            // weekDataの全レコードで項目名を更新
            this.weekData.dailyRecords.forEach(record => {
                if (record.responses[currentItem] !== undefined) {
                    record.responses[trimmedNewItem] = record.responses[currentItem];
                    delete record.responses[currentItem];
                }
            });
            
            this.evaluationItems[index] = trimmedNewItem;
            this.lastUsedItems = [...this.evaluationItems];
            this._updateWeekDataWithNewItems();
            this.uiRenderer.renderDiary();
            this.markAsChanged();
        }
    }

    removeItem(index) {
        if (confirm('この項目を削除しますか？関連するすべてのデータも削除されます。')) {
            const removedItem = this.evaluationItems[index];
            
            // weekDataから該当項目を削除
            this.weekData.dailyRecords.forEach(record => {
                delete record.responses[removedItem];
            });
            
            this.evaluationItems.splice(index, 1);
            // lastUsedItemsを更新
            this.lastUsedItems = [...this.evaluationItems];
            this._updateWeekDataWithNewItems();
            this.uiRenderer.renderDiary();
            this.markAsChanged();
        }
    }
    
    /**
     * 評価グリッドから項目を削除
     * @param {number} index - 項目のインデックス
     */
    removeItemFromEval(index) {
        if (confirm('この項目を削除しますか？関連するすべてのデータも削除されます。')) {
            const removedItem = this.evaluationItems[index];
            
            // weekDataから該当項目を削除
            this.weekData.dailyRecords.forEach(record => {
                delete record.responses[removedItem];
            });
            
            this.evaluationItems.splice(index, 1);
            this.lastUsedItems = [...this.evaluationItems];
            this._updateWeekDataWithNewItems();
            this.uiRenderer.renderDiary();
            this.markAsChanged();
            this.uiRenderer.showStatusMessage('項目を削除しました', 'success');
        }
    }
    
    /**
     * 項目名を更新
     * @param {number} index - 項目のインデックス
     * @param {string} newName - 新しい項目名
     */
    updateItemName(index, newName) {
        const currentItem = this.evaluationItems[index];
        const trimmedNewName = newName.trim();
        
        if (trimmedNewName === currentItem) {
            return; // 変更なし
        }
        
        // 重複チェック（自分以外）
        const isDuplicate = this.evaluationItems.some((item, i) => 
            i !== index && item === trimmedNewName
        );
        
        if (isDuplicate) {
            this.uiRenderer.showStatusMessage('この項目は既に存在します', 'error');
            this.uiRenderer.renderDiary(); // 元に戻す
            return;
        }
        
        // weekDataの全レコードで項目名を更新
        this.weekData.dailyRecords.forEach(record => {
            if (record.responses[currentItem] !== undefined) {
                record.responses[trimmedNewName] = record.responses[currentItem];
                delete record.responses[currentItem];
            }
        });
        
        this.evaluationItems[index] = trimmedNewName;
        this.lastUsedItems = [...this.evaluationItems];
        this._updateWeekDataWithNewItems();
        this.uiRenderer.renderDiary();
        this.markAsChanged();
        this.uiRenderer.showStatusMessage('項目名を更新しました', 'success');
    }

    /**
     * 新しい項目でweekDataを更新
     * @private
     */
    _updateWeekDataWithNewItems() {
        this.weekData.evaluationItems = [...this.evaluationItems];
        
        // 既存のレコードに新しい項目を追加（値は空）
        this.weekData.dailyRecords.forEach(record => {
            this.evaluationItems.forEach(item => {
                if (record.responses[item] === undefined) {
                    record.responses[item] = '';
                }
            });
        });
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
        
        this._saveSettingsToStorage();
        
        this.uiRenderer.showStatusMessage('設定が保存されました', 'success');
        this.hideSettings();
        
        // 設定保存後、GitHubからデータを同期
        if (this._hasValidSettings()) {
            this.loadData();
        }
    }

    /**
     * 設定をlocalStorageに保存
     * @private
     */
    _saveSettingsToStorage() {
        try {
            localStorage.setItem(
                APP_CONSTANTS.STORAGE_KEY_SETTINGS, 
                JSON.stringify(this.syncSettings)
            );
        } catch (error) {
            console.error('Failed to save settings to localStorage:', error);
        }
    }

    loadSettings() {
        try {
            const savedSettings = localStorage.getItem(APP_CONSTANTS.STORAGE_KEY_SETTINGS);
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
            this.showPreview();
            await this._waitForRender();
            
            const element = document.getElementById('previewContent');
            element.classList.add('export-mode');
            
            const canvas = await this._captureElementAsCanvas(element);
            this._downloadCanvas(canvas, `diary-${this.currentWeek}.png`);
            
            element.classList.remove('export-mode');
            this.uiRenderer.showStatusMessage('画像がダウンロードされました', 'success');
            
        } catch (error) {
            console.error('Export error:', error);
            this.uiRenderer.showStatusMessage('画像出力エラー: ' + error.message, 'error');
        } finally {
            this.uiRenderer.hideLoading();
        }
    }

    /**
     * レンダリング完了を待つ
     * @private
     */
    async _waitForRender() {
        await new Promise(resolve => setTimeout(resolve, APP_CONSTANTS.RENDER_DELAY));
    }

    /**
     * 要素をキャンバスとしてキャプチャ
     * @param {HTMLElement} element - キャプチャする要素
     * @returns {Promise<HTMLCanvasElement>}
     * @private
     */
    async _captureElementAsCanvas(element) {
        // Calculate actual content width based on the table
        const table = element.querySelector('.preview-table');
        const actualContentWidth = table ? table.offsetWidth : element.scrollWidth;
        const exportWidth = actualContentWidth;
        const exportHeight = element.scrollHeight;
        
        const options = {
            scale: APP_CONSTANTS.EXPORT_SCALE,
            useCORS: true,
            allowTaint: true,
            backgroundColor: '#ffffff',
            width: exportWidth,
            height: exportHeight,
            windowWidth: exportWidth,
            windowHeight: exportHeight,
            scrollX: 0,
            scrollY: 0,
            imageTimeout: APP_CONSTANTS.EXPORT_TIMEOUT
        };
        
        return await html2canvas(element, options);
    }

    /**
     * キャンバスを画像ファイルとしてダウンロード
     * @param {HTMLCanvasElement} canvas - キャンバス
     * @param {string} filename - ファイル名
     * @private
     */
    _downloadCanvas(canvas, filename) {
        const link = document.createElement('a');
        link.download = filename;
        link.href = canvas.toDataURL('image/png');
        link.click();
    }

    async copyEvaluationTable() {
        try {
            this.showPreview();
            await this._waitForRender();
            
            const tsvText = this._generateEvaluationTableTSV();
            await navigator.clipboard.writeText(tsvText);
            this.uiRenderer.showStatusMessage('✅ 評価表をクリップボードにコピーしました', 'success');
            
        } catch (error) {
            console.error('Copy error:', error);
            this.uiRenderer.showStatusMessage('❌ コピーエラー: ' + error.message, 'error');
        }
    }

    /**
     * 評価表のTSVテキストを生成
     * @returns {string} - TSV形式のテキスト
     * @private
     */
    _generateEvaluationTableTSV() {
        const tsvLines = [];
        
        // ヘッダー行1: 「評価項目」と各日の日付
        const headerRow1 = ['評価項目'];
        this.weekData.dailyRecords.forEach(record => {
            const date = new Date(record.date);
            headerRow1.push(`${date.getMonth() + 1}月${date.getDate()}日`);
        });
        tsvLines.push(headerRow1.join('\t'));
        
        // ヘッダー行2: 空白と曜日
        const headerRow2 = [''];
        this.weekData.dailyRecords.forEach(record => {
            headerRow2.push(`(${record.dayOfWeek})`);
        });
        tsvLines.push(headerRow2.join('\t'));
        
        // 各評価項目の行
        this.evaluationItems.forEach(item => {
            const row = [item];
            this.weekData.dailyRecords.forEach(record => {
                row.push(record.responses[item] || '-');
            });
            tsvLines.push(row.join('\t'));
        });
        
        return tsvLines.join('\n');
    }

    async copyReflectionTable() {
        try {
            this.showPreview();
            await this._waitForRender();
            
            const tsvText = this._generateReflectionTableTSV();
            await navigator.clipboard.writeText(tsvText);
            this.uiRenderer.showStatusMessage('✅ 感想・気づきをクリップボードにコピーしました', 'success');
            
        } catch (error) {
            console.error('Copy error:', error);
            this.uiRenderer.showStatusMessage('❌ コピーエラー: ' + error.message, 'error');
        }
    }

    /**
     * 感想表のTSVテキストを生成
     * @returns {string} - TSV形式のテキスト
     * @private
     */
    _generateReflectionTableTSV() {
        const tsvLines = [];
        
        // ヘッダー行
        tsvLines.push(['日付', '感想・気づき'].join('\t'));
        
        // 各日の感想
        this.weekData.dailyRecords.forEach(record => {
            const date = new Date(record.date);
            const formattedDate = `${date.getMonth() + 1}/${date.getDate()}(${record.dayOfWeek})`;
            const reflection = record.reflection || '';
            tsvLines.push([formattedDate, reflection].join('\t'));
        });
        
        return tsvLines.join('\n');
    }

    async copyImageToClipboard() {
        this.uiRenderer.showLoading();
        
        try {
            this.showPreview();
            await this._waitForRender();
            
            const element = document.getElementById('previewContent');
            element.classList.add('export-mode');
            
            const canvas = await this._captureElementAsCanvas(element);
            const blob = await this._canvasToBlob(canvas);
            
            await this._copyBlobToClipboard(blob);
            
            element.classList.remove('export-mode');
            this.uiRenderer.showStatusMessage('✅ 画像をクリップボードにコピーしました', 'success');
            
        } catch (error) {
            console.error('Copy image error:', error);
            this.uiRenderer.showStatusMessage('❌ 画像コピーエラー: ' + error.message, 'error');
        } finally {
            this.uiRenderer.hideLoading();
        }
    }

    /**
     * キャンバスをBlobに変換
     * @param {HTMLCanvasElement} canvas - キャンバス
     * @returns {Promise<Blob>}
     * @private
     */
    async _canvasToBlob(canvas) {
        return new Promise(resolve => {
            canvas.toBlob(resolve, 'image/png');
        });
    }

    /**
     * Blobをクリップボードにコピー
     * @param {Blob} blob - 画像Blob
     * @private
     */
    async _copyBlobToClipboard(blob) {
        if (navigator.clipboard && navigator.clipboard.write) {
            const clipboardItem = new ClipboardItem({ 'image/png': blob });
            await navigator.clipboard.write([clipboardItem]);
        } else {
            throw new Error('お使いのブラウザはクリップボードへの画像コピーに対応していません');
        }
    }
}

// アプリケーション初期化
const diaryApp = new DiaryApp();

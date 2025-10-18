// UI描画機能モジュール

class UIRenderer {
    // 定数
    static CONSTANTS = {
        STATUS_MESSAGE_DURATION: 3000, // 3秒（ミリ秒）
        ITEM_TEXT_MAX_LENGTH: 15,
        RADIO_UNCHECK_DELAY: 10 // ミリ秒
    };

    constructor(app) {
        this.app = app;
    }

    /**
     * 日記入力画面を描画
     */
    renderDiary() {
        this._renderWeekGoal();
        this._renderDailyEntries();
    }

    /**
     * 週目標の描画
     * @private
     */
    _renderWeekGoal() {
        const weekGoal = document.getElementById('weekGoal');
        weekGoal.value = this.app.weekData.goal;
        
        // 既存のリスナーを削除して新しいリスナーを追加
        const newWeekGoal = weekGoal.cloneNode(true);
        weekGoal.parentNode.replaceChild(newWeekGoal, weekGoal);
        
        newWeekGoal.addEventListener('input', () => {
            this.app.debugLog('weekGoal input event');
            this.app.weekData.goal = newWeekGoal.value;
            this.app.markAsChanged();
        });
    }

    /**
     * 日別エントリーの描画
     * @private
     */
    _renderDailyEntries() {
        const container = document.getElementById('dailyEntries');
        container.innerHTML = '';

        // 日別ナビゲーションを表示
        container.appendChild(this.createDayNavigation());

        // 現在選択中の日のエントリーのみを表示
        const currentRecord = this.app.weekData.dailyRecords[this.app.currentDayIndex];
        container.appendChild(this.createDayEntry(currentRecord, this.app.currentDayIndex));

        // 週間サマリーを追加
        container.appendChild(this._createWeekSummarySection());

        // 親からのコメント欄を追加
        container.appendChild(this.createParentsCommentSection());
    }

    /**
     * 週間サマリーセクションを作成
     * @returns {HTMLElement}
     * @private
     */
    _createWeekSummarySection() {
        const section = document.createElement('section');
        section.className = 'week-summary-section';
        section.innerHTML = '<h3>今週の記録</h3>';
        section.appendChild(this.createWeekSummary());
        return section;
    }

    /**
     * 週間サマリーを作成
     * @returns {HTMLElement} - 週間サマリー要素
     */
    createWeekSummary() {
        const summary = document.createElement('div');
        summary.className = 'week-summary';
        summary.innerHTML = `<div class="week-summary-grid">${this._generateWeekSummaryHTML()}</div>`;
        return summary;
    }

    /**
     * 週間サマリーのHTMLを生成
     * @returns {string}
     * @private
     */
    _generateWeekSummaryHTML() {
        return this.app.weekData.dailyRecords
            .map((record, index) => this._createWeekSummaryDayHTML(record, index))
            .join('');
    }

    /**
     * 1日分のサマリーHTMLを作成
     * @param {Object} record - 日別レコード
     * @param {number} index - インデックス
     * @returns {string}
     * @private
     */
    _createWeekSummaryDayHTML(record, index) {
        const date = new Date(record.date);
        const formattedDate = `${date.getMonth() + 1}/${date.getDate()}`;
        const isActive = index === this.app.currentDayIndex;
        const counts = this._countEvaluations(record);
        
        return `
            <div class="week-summary-day ${isActive ? 'active' : ''}" 
                 onclick="diaryApp.currentDayIndex = ${index}; diaryApp.uiRenderer.renderDiary();">
                <div class="summary-date">${formattedDate}(${record.dayOfWeek})</div>
                <div class="summary-counts">
                    <span class="count-success">⭕️${counts['⭕️']}</span>
                    <span class="count-error">✖️${counts['✖️']}</span>
                    <span class="count-warning">△${counts['△']}</span>
                </div>
            </div>
        `;
    }

    /**
     * 評価のカウントを計算
     * @param {Object} record - 日別レコード
     * @returns {Object} - カウント結果
     * @private
     */
    _countEvaluations(record) {
        const counts = { '⭕️': 0, '✖️': 0, '△': 0 };
        Object.values(record.responses).forEach(value => {
            if (counts.hasOwnProperty(value)) {
                counts[value]++;
            }
        });
        return counts;
    }

    /**
     * 親からのコメント欄を作成
     * @returns {HTMLElement} - 親コメント欄要素
     */
    createParentsCommentSection() {
        const section = document.createElement('section');
        section.className = 'parents-comment-section';
        
        const toggleButton = document.createElement('button');
        toggleButton.className = 'btn btn--outline btn--sm toggle-parents-comment';
        toggleButton.textContent = this.app.showParentsComment ? '👪 親からのコメント欄を非表示' : '👪 親からのコメント欄を表示';
        toggleButton.onclick = () => this.app.toggleParentsComment();
        
        section.appendChild(toggleButton);
        
        if (this.app.showParentsComment) {
            const commentArea = document.createElement('div');
            commentArea.className = 'parents-comment-area';
            
            const label = document.createElement('label');
            label.className = 'form-label';
            label.textContent = '親からのコメント（週に1回）';
            
            const textarea = document.createElement('textarea');
            textarea.className = 'form-control';
            textarea.rows = 4;
            textarea.placeholder = '親御さんからのコメントをこちらに記入してください';
            textarea.value = this.app.weekData.parentsComment || '';
            
            textarea.addEventListener('input', (e) => {
                this.app.setParentsComment(e.target.value);
            });
            
            commentArea.appendChild(label);
            commentArea.appendChild(textarea);
            section.appendChild(commentArea);
        }
        
        return section;
    }

    /**
     * 日別ナビゲーションを作成
     * @returns {HTMLElement} - 日別ナビゲーション要素
     */
    createDayNavigation() {
        const navigation = document.createElement('div');
        navigation.className = 'day-navigation';
        
        const currentRecord = this.app.weekData.dailyRecords[this.app.currentDayIndex];
        const date = new Date(currentRecord.date);
        const formattedDate = `${date.getMonth() + 1}/${date.getDate()}`;
        
        navigation.innerHTML = `
            <button class="btn btn--secondary btn--sm" 
                    onclick="diaryApp.changeDay(-1)" 
                    ${this.app.currentDayIndex === 0 ? 'disabled' : ''}>
                ← 前日
            </button>
            <span class="current-day">${formattedDate} (${currentRecord.dayOfWeek})</span>
            <button class="btn btn--secondary btn--sm" 
                    onclick="diaryApp.changeDay(1)"
                    ${this.app.currentDayIndex === 6 ? 'disabled' : ''}>
                次日 →
            </button>
        `;
        
        return navigation;
    }

    /**
     * 1日分のエントリーを作成
     * @param {Object} record - 日別レコード
     * @param {number} dayIndex - 日のインデックス
     * @returns {HTMLElement} - 日記エントリー要素
     */
    createDayEntry(record, dayIndex) {
        const dayEntry = document.createElement('div');
        dayEntry.className = 'daily-entry';
        
        const date = new Date(record.date);
        const formattedDate = `${date.getMonth() + 1}/${date.getDate()}`;
        
        dayEntry.innerHTML = `
            <h4>${formattedDate} (${record.dayOfWeek})</h4>
            <div class="evaluation-grid">
                ${this._createEvaluationItemsHTML(record, dayIndex)}
            </div>
            ${this._createReflectionFieldHTML(record, dayIndex)}
        `;
        
        this._attachEvaluationListeners(dayEntry, dayIndex);
        this._attachReflectionListener(dayEntry);
        
        return dayEntry;
    }

    /**
     * 評価項目のHTMLを作成
     * @param {Object} record - 日別レコード
     * @param {number} dayIndex - 日のインデックス
     * @returns {string}
     * @private
     */
    _createEvaluationItemsHTML(record, dayIndex) {
        return this.app.evaluationItems
            .map((item, itemIndex) => this._createEvaluationItemHTML(item, itemIndex, record, dayIndex))
            .join('');
    }

    /**
     * 1つの評価項目HTMLを作成
     * @param {string} item - 評価項目
     * @param {number} itemIndex - 項目のインデックス
     * @param {Object} record - 日別レコード
     * @param {number} dayIndex - 日のインデックス
     * @returns {string}
     * @private
     */
    _createEvaluationItemHTML(item, itemIndex, record, dayIndex) {
        const safeItemId = `item-${dayIndex}-${itemIndex}`;
        const radioButtons = DiaryApp.CHECK_OPTIONS
            .map(option => this._createRadioButtonHTML(safeItemId, option, record.responses[item]))
            .join('');
        
        return `
            <div class="evaluation-item" data-item="${this.escapeHtml(item)}" data-day="${dayIndex}">
                <label>${this.escapeHtml(item)}</label>
                <div class="rating-group">${radioButtons}</div>
            </div>
        `;
    }

    /**
     * ラジオボタンのHTMLを作成
     * @param {string} safeItemId - 安全なID
     * @param {Object} option - チェックオプション
     * @param {string} currentValue - 現在の値
     * @returns {string}
     * @private
     */
    _createRadioButtonHTML(safeItemId, option, currentValue) {
        const checked = currentValue === option.value ? 'checked' : '';
        return `
            <div class="rating-option rating-option--${option.class}">
                <input type="radio" 
                       id="${safeItemId}-${option.class}" 
                       name="${safeItemId}" 
                       value="${option.value}"
                       ${checked}>
                <label for="${safeItemId}-${option.class}">${option.value}</label>
            </div>
        `;
    }

    /**
     * 感想フィールドのHTMLを作成
     * @param {Object} record - 日別レコード
     * @param {number} dayIndex - 日のインデックス
     * @returns {string}
     * @private
     */
    _createReflectionFieldHTML(record, dayIndex) {
        return `
            <div class="reflection-field">
                <label class="form-label">感想・気づき</label>
                <textarea class="form-control" rows="3" 
                    placeholder="今日の感想や気づきを記録してください"
                    data-day="${dayIndex}">${this.escapeHtml(record.reflection)}</textarea>
            </div>
        `;
    }

    /**
     * 評価項目のイベントリスナーを追加
     * @param {HTMLElement} dayEntry - 日記エントリー要素
     * @param {number} dayIndex - 日のインデックス
     * @private
     */
    _attachEvaluationListeners(dayEntry, dayIndex) {
    /**
     * 評価項目のイベントリスナーを追加
     * @param {HTMLElement} dayEntry - 日記エントリー要素
     * @param {number} dayIndex - 日のインデックス
     * @private
     */
    _attachEvaluationListeners(dayEntry, dayIndex) {
        dayEntry.querySelectorAll('.evaluation-item').forEach((evalItem) => {
            const item = evalItem.dataset.item;
            const dayIdx = parseInt(evalItem.dataset.day);
            const radioInputs = evalItem.querySelectorAll('input[type="radio"]');
            
            radioInputs.forEach(radio => {
                radio.addEventListener('click', (e) => {
                    this._handleRadioClick(e, radio, radioInputs, dayIdx, item);
                });
            });
        });
    }

    /**
     * ラジオボタンクリックを処理
     * @param {Event} e - イベント
     * @param {HTMLInputElement} radio - クリックされたラジオボタン
     * @param {NodeList} radioInputs - すべてのラジオボタン
     * @param {number} dayIdx - 日のインデックス
     * @param {string} item - 評価項目
     * @private
     */
    _handleRadioClick(e, radio, radioInputs, dayIdx, item) {
        const currentValue = this.app.weekData.dailyRecords[dayIdx].responses[item];
        
        if (currentValue === radio.value) {
            // 同じ値が既に選択されている場合は解除
            e.preventDefault();
            setTimeout(() => {
                radioInputs.forEach(r => r.checked = false);
                this.app.setEvaluation(dayIdx, item, '');
            }, UIRenderer.CONSTANTS.RADIO_UNCHECK_DELAY);
        } else {
            // 新しい値を設定
            this.app.setEvaluation(dayIdx, item, radio.value);
        }
    }

    /**
     * 感想のイベントリスナーを追加
     * @param {HTMLElement} dayEntry - 日記エントリー要素
     * @private
     */
    _attachReflectionListener(dayEntry) {
    /**
     * 感想のイベントリスナーを追加
     * @param {HTMLElement} dayEntry - 日記エントリー要素
     * @private
     */
    _attachReflectionListener(dayEntry) {
        const textarea = dayEntry.querySelector('textarea[data-day]');
        textarea.addEventListener('input', (e) => {
            this.app.debugLog('Textarea INPUT event');
            const dayIdx = parseInt(e.target.dataset.day);
            this.app.setReflection(dayIdx, e.target.value);
        });
    }

    /**
     * プレビュー画面を描画（項目を行、日付を列に配置）
     */
    renderPreview() {
        const container = document.getElementById('previewContent');
        container.innerHTML = `
            ${this._createPreviewHeader()}
            ${this._createPreviewTable()}
            ${this._createReflectionsSection()}
        `;
    }

    /**
     * プレビューヘッダーを作成
     * @returns {string}
     * @private
     */
    _createPreviewHeader() {
        return `
            <div class="preview-header">
                <h4>週間目標: ${this.escapeHtml(this.app.weekData.goal) || '未設定'}</h4>
                <p>期間: ${this.app.currentWeek}</p>
            </div>
        `;
    }

    /**
     * プレビューテーブルを作成
     * @returns {string}
     * @private
     */
    _createPreviewTable() {
        return `
            <div class="preview-table-wrapper">
                <table class="preview-table">
                    <thead>${this._createTableHeader()}</thead>
                    <tbody>${this._createTableBody()}</tbody>
                </table>
            </div>
        `;
    }

    /**
     * テーブルヘッダーを作成
     * @returns {string}
     * @private
     */
    _createTableHeader() {
        const dateHeaders = this.app.weekData.dailyRecords
            .map(record => {
                const date = new Date(record.date);
                const formattedDate = `${date.getMonth() + 1}/${date.getDate()}`;
                return `<th class="date-cell">${formattedDate}<br/>(${record.dayOfWeek})</th>`;
            })
            .join('');
        
        return `<tr><th class="item-cell">評価項目</th>${dateHeaders}</tr>`;
    }

    /**
     * テーブルボディを作成
     * @returns {string}
     * @private
     */
    _createTableBody() {
        return this.app.evaluationItems
            .map(item => this._createTableRow(item))
            .join('');
    }

    /**
     * テーブル行を作成
     * @param {string} item - 評価項目
     * @returns {string}
     * @private
     */
    _createTableRow(item) {
        const displayText = item.length > UIRenderer.CONSTANTS.ITEM_TEXT_MAX_LENGTH 
            ? item.substring(0, UIRenderer.CONSTANTS.ITEM_TEXT_MAX_LENGTH) + '...' 
            : item;
        
        const cells = this.app.weekData.dailyRecords
            .map(record => `<td class="eval-cell">${record.responses[item] || '-'}</td>`)
            .join('');
        
        return `
            <tr>
                <td class="item-cell" title="${this.escapeHtml(item)}">${this.escapeHtml(displayText)}</td>
                ${cells}
            </tr>
        `;
    }

    /**
     * 感想セクションを作成
     * @returns {string}
     * @private
     */
    _createReflectionsSection() {
        const reflections = this.app.weekData.dailyRecords
            .map(record => this._createReflectionItem(record))
            .join('');
        
        return `
            <div class="reflections-section">
                <h4>感想・気づき</h4>
                <div class="reflections-grid">${reflections}</div>
            </div>
        `;
    }

    /**
     * 感想アイテムを作成
     * @param {Object} record - 日別レコード
     * @returns {string}
     * @private
     */
    _createReflectionItem(record) {
        const date = new Date(record.date);
        const formattedDate = `${date.getMonth() + 1}/${date.getDate()}`;
        
        return `
            <div class="reflection-item">
                <div class="reflection-date">${formattedDate}(${record.dayOfWeek})</div>
                <div class="reflection-text">${this.escapeHtml(record.reflection) || '記録なし'}</div>
            </div>
        `;
    }

    /**
     * 設定画面を描画
     */
    renderSettings() {
        // 評価項目一覧を表示
        const itemsList = document.getElementById('itemsList');
        itemsList.innerHTML = '';

        this.app.evaluationItems.forEach((item, index) => {
            const itemRow = document.createElement('div');
            itemRow.className = 'item-row';
            itemRow.innerHTML = `
                <span class="item-text">${this.escapeHtml(item)}</span>
                <button class="delete-item-btn" data-index="${index}">削除</button>
            `;
            
            // 削除ボタンのイベントリスナーを追加
            const deleteBtn = itemRow.querySelector('.delete-item-btn');
            deleteBtn.addEventListener('click', () => {
                this.app.removeItem(index);
            });
            
            itemsList.appendChild(itemRow);
        });

        // GitHub設定を表示
        document.getElementById('githubToken').value = this.app.syncSettings.githubToken;
        document.getElementById('repoOwner').value = this.app.syncSettings.repoOwner;
        document.getElementById('repoName').value = this.app.syncSettings.repoName;
    }

    /**
     * HTMLエスケープ処理
     * @param {string} text - エスケープするテキスト
     * @returns {string} - エスケープされたテキスト
     */
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * ローディング表示
     */
    showLoading() {
        document.getElementById('loadingOverlay').classList.remove('hidden');
    }

    /**
     * ローディング非表示
     */
    hideLoading() {
        document.getElementById('loadingOverlay').classList.add('hidden');
    }

    /**
     * 同期ステータス表示
     * @param {string} message - 表示メッセージ
     * @param {string} type - メッセージタイプ (success/error/loading)
     */
    showSyncStatus(message, type) {
        const statusElement = document.getElementById('syncStatus');
        statusElement.textContent = message;
        statusElement.className = `sync-status ${type}`;
        
        // 3秒後に消去（successとerrorの場合）
        if (type !== 'loading') {
            setTimeout(() => {
                statusElement.textContent = '';
                statusElement.className = 'sync-status';
            }, UIRenderer.CONSTANTS.STATUS_MESSAGE_DURATION);
        }
    }

    /**
     * トーストメッセージ表示
     * @param {string} message - 表示メッセージ
     * @param {string} type - メッセージタイプ (success/error/info)
     */
    showStatusMessage(message, type) {
        const messageDiv = this._createStatusMessageElement(message, type);
        document.body.appendChild(messageDiv);
        
        setTimeout(() => {
            document.body.removeChild(messageDiv);
        }, UIRenderer.CONSTANTS.STATUS_MESSAGE_DURATION);
    }

    /**
     * ステータスメッセージ要素を作成
     * @param {string} message - メッセージ
     * @param {string} type - タイプ
     * @returns {HTMLElement}
     * @private
     */
    _createStatusMessageElement(message, type) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `status-message ${type}`;
        messageDiv.textContent = message;
        messageDiv.style.position = 'fixed';
        messageDiv.style.top = '20px';
        messageDiv.style.right = '20px';
        messageDiv.style.zIndex = '3000';
        messageDiv.style.minWidth = '250px';
        return messageDiv;
    }
}

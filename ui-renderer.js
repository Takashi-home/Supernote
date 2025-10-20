// UI描画機能モジュール

// UI描画定数
const UI_CONSTANTS = {
    STATUS_MESSAGE_DURATION: 3000, // 3秒（ミリ秒）
    ITEM_TEXT_MAX_LENGTH: 15,
    RADIO_UNCHECK_DELAY: 10 // ミリ秒
};

class UIRenderer {
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

        // 項目管理セクション
        container.appendChild(this.createItemManagementSection());

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
     * 項目管理セクションを作成
     * @returns {HTMLElement} - 項目管理セクション要素
     */
    createItemManagementSection() {
        const section = document.createElement('section');
        section.className = 'item-management-section';
        
        const header = document.createElement('div');
        header.className = 'item-management-header';
        
        const title = document.createElement('h4');
        title.textContent = '評価項目の管理';
        header.appendChild(title);
        
        const toggleBtn = document.createElement('button');
        toggleBtn.className = 'btn btn--outline btn--sm';
        toggleBtn.textContent = '▼ 項目を編集';
        toggleBtn.id = 'toggleItemManagement';
        header.appendChild(toggleBtn);
        
        section.appendChild(header);
        
        const managementArea = document.createElement('div');
        managementArea.className = 'item-management-area hidden';
        managementArea.id = 'itemManagementArea';
        
        const itemsList = document.createElement('div');
        itemsList.className = 'items-list-inline';
        
        this.app.evaluationItems.forEach((item, index) => {
            const itemCard = document.createElement('div');
            itemCard.className = 'item-card';
            
            const itemText = document.createElement('span');
            itemText.className = 'item-card-text';
            itemText.textContent = item;
            itemCard.appendChild(itemText);
            
            const actionsDiv = document.createElement('div');
            actionsDiv.className = 'item-card-actions';
            
            const editBtn = document.createElement('button');
            editBtn.className = 'item-action-btn edit-btn';
            editBtn.textContent = '✏️';
            editBtn.title = '編集';
            editBtn.onclick = () => this.app.editItem(index);
            actionsDiv.appendChild(editBtn);
            
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'item-action-btn delete-btn';
            deleteBtn.textContent = '🗑️';
            deleteBtn.title = '削除';
            deleteBtn.onclick = () => this.app.removeItem(index);
            actionsDiv.appendChild(deleteBtn);
            
            itemCard.appendChild(actionsDiv);
            itemsList.appendChild(itemCard);
        });
        
        managementArea.appendChild(itemsList);
        
        const addForm = document.createElement('div');
        addForm.className = 'add-item-form-inline';
        
        const input = document.createElement('input');
        input.type = 'text';
        input.id = 'newItemInputInline';
        input.className = 'form-control';
        input.placeholder = '新しい項目を追加';
        addForm.appendChild(input);
        
        const addBtn = document.createElement('button');
        addBtn.className = 'btn btn--primary btn--sm';
        addBtn.textContent = '追加';
        addBtn.onclick = () => this.app.addItemInline();
        addForm.appendChild(addBtn);
        
        managementArea.appendChild(addForm);
        section.appendChild(managementArea);
        
        // トグルボタンのイベントリスナー
        toggleBtn.addEventListener('click', () => {
            managementArea.classList.toggle('hidden');
            if (managementArea.classList.contains('hidden')) {
                toggleBtn.textContent = '▼ 項目を編集';
            } else {
                toggleBtn.textContent = '▲ 項目を閉じる';
            }
        });
        
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
        const radioButtons = CHECK_OPTIONS
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
            }, UI_CONSTANTS.RADIO_UNCHECK_DELAY);
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
            ${this._createPreviewEditModeControls()}
            ${this._createPreviewTable()}
            ${this._createReflectionsSection()}
        `;
        
        // 編集モードの場合、イベントリスナーを設定
        if (this.app.previewEditMode) {
            this._attachPreviewEditListeners();
        }
    }

    /**
     * プレビュー編集モードコントロールを作成
     * @returns {string}
     * @private
     */
    _createPreviewEditModeControls() {
        if (this.app.previewEditMode) {
            return `
                <div class="preview-edit-controls">
                    <div class="edit-mode-indicator">
                        <span>✏️ 編集モード</span>
                    </div>
                    <div class="edit-mode-actions">
                        <button class="btn btn--primary btn--sm" onclick="diaryApp.applyPreviewEdits()">✓ 変更を適用</button>
                        <button class="btn btn--outline btn--sm" onclick="diaryApp.cancelPreviewEdits()">✕ キャンセル</button>
                    </div>
                </div>
            `;
        } else {
            return `
                <div class="preview-view-controls">
                    <button class="btn btn--outline btn--sm" onclick="diaryApp.togglePreviewEditMode()">✏️ 表を編集</button>
                </div>
            `;
        }
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
        const rows = this.app.evaluationItems
            .map((item, index) => this._createTableRow(item, index))
            .join('');
        
        // 編集モードの場合、新規行追加ボタンを表示
        if (this.app.previewEditMode) {
            return rows + this._createAddItemRow();
        }
        
        return rows;
    }

    /**
     * 新規項目追加行を作成
     * @returns {string}
     * @private
     */
    _createAddItemRow() {
        return `
            <tr class="add-item-row">
                <td colspan="8" class="add-item-cell">
                    <div class="add-item-form-table">
                        <input type="text" 
                               id="newItemInputTable" 
                               class="form-control form-control-table" 
                               placeholder="新しい評価項目を追加">
                        <button class="btn btn--primary btn--sm" onclick="diaryApp.uiRenderer.addItemFromTable()">
                            ＋ 項目を追加
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }

    /**
     * テーブルから新規項目を追加
     */
    addItemFromTable() {
        const input = document.getElementById('newItemInputTable');
        const newItem = input.value.trim();
        
        if (newItem && !this.app.evaluationItems.includes(newItem)) {
            this.app.evaluationItems.push(newItem);
            this.app.lastUsedItems = [...this.app.evaluationItems];
            this.app._updateWeekDataWithNewItems();
            this.renderPreview();
            this.app.markAsChanged();
        } else if (this.app.evaluationItems.includes(newItem)) {
            this.showStatusMessage('この項目は既に存在します', 'error');
        }
    }

    /**
     * テーブル行を作成
     * @param {string} item - 評価項目
     * @param {number} itemIndex - 項目のインデックス
     * @returns {string}
     * @private
     */
    _createTableRow(item, itemIndex) {
        const displayText = item.length > UI_CONSTANTS.ITEM_TEXT_MAX_LENGTH 
            ? item.substring(0, UI_CONSTANTS.ITEM_TEXT_MAX_LENGTH) + '...' 
            : item;
        
        let itemCell;
        if (this.app.previewEditMode) {
            // 編集モード: 項目名を編集可能に
            itemCell = `
                <td class="item-cell editable-item-cell" title="${this.escapeHtml(item)}">
                    <div class="item-cell-content">
                        <span class="item-name" 
                              contenteditable="true" 
                              data-item-index="${itemIndex}"
                              data-original-value="${this.escapeHtml(item)}">${this.escapeHtml(displayText)}</span>
                        <button class="btn-delete-item" 
                                onclick="diaryApp.uiRenderer.deleteItemFromTable(${itemIndex})"
                                title="この項目を削除">
                            🗑️
                        </button>
                    </div>
                </td>
            `;
        } else {
            // 表示モード: 通常表示
            itemCell = `
                <td class="item-cell" title="${this.escapeHtml(item)}">${this.escapeHtml(displayText)}</td>
            `;
        }
        
        const cells = this.app.weekData.dailyRecords
            .map((record, dayIndex) => this._createTableCell(record, item, dayIndex))
            .join('');
        
        return `<tr>${itemCell}${cells}</tr>`;
    }

    /**
     * テーブルセルを作成
     * @param {Object} record - 日別レコード
     * @param {string} item - 評価項目
     * @param {number} dayIndex - 日のインデックス
     * @returns {string}
     * @private
     */
    _createTableCell(record, item, dayIndex) {
        const value = record.responses[item] || '-';
        
        if (this.app.previewEditMode) {
            // 編集モード: セルをクリック可能に
            return `
                <td class="eval-cell editable-eval-cell" 
                    data-day="${dayIndex}" 
                    data-item="${this.escapeHtml(item)}"
                    onclick="diaryApp.uiRenderer.cycleEvaluation(${dayIndex}, '${this.escapeHtml(item)}')"
                    title="クリックして変更">
                    ${value}
                </td>
            `;
        } else {
            // 表示モード: 通常表示
            return `<td class="eval-cell">${value}</td>`;
        }
    }

    /**
     * テーブルから項目を削除
     * @param {number} itemIndex - 項目のインデックス
     */
    deleteItemFromTable(itemIndex) {
        if (confirm('この項目を削除しますか？関連するすべてのデータも削除されます。')) {
            const removedItem = this.app.evaluationItems[itemIndex];
            
            // weekDataから該当項目を削除
            this.app.weekData.dailyRecords.forEach(record => {
                delete record.responses[removedItem];
            });
            
            this.app.evaluationItems.splice(itemIndex, 1);
            this.app.lastUsedItems = [...this.app.evaluationItems];
            this.app._updateWeekDataWithNewItems();
            this.renderPreview();
            this.app.markAsChanged();
        }
    }

    /**
     * 評価値を循環的に変更（- → ⭕️ → ✖️ → △ → -）
     * @param {number} dayIndex - 日のインデックス
     * @param {string} item - 評価項目
     */
    cycleEvaluation(dayIndex, item) {
        const currentValue = this.app.weekData.dailyRecords[dayIndex].responses[item];
        const values = ['', '⭕️', '✖️', '△'];
        const currentIndex = values.indexOf(currentValue);
        const nextIndex = (currentIndex + 1) % values.length;
        const nextValue = values[nextIndex];
        
        this.app.weekData.dailyRecords[dayIndex].responses[item] = nextValue;
        this.app.markAsChanged();
        
        // セルの内容を更新
        const cell = document.querySelector(
            `td.eval-cell[data-day="${dayIndex}"][data-item="${this.escapeHtml(item)}"]`
        );
        if (cell) {
            cell.textContent = nextValue || '-';
        }
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
                <div class="reflections-list">${reflections}</div>
            </div>
        `;
    }

    /**
     * プレビュー編集モードのイベントリスナーを追加
     * @private
     */
    _attachPreviewEditListeners() {
        // 項目名の編集イベント
        document.querySelectorAll('.item-name[contenteditable="true"]').forEach(element => {
            element.addEventListener('blur', (e) => {
                this._handleItemNameEdit(e);
            });
            
            // Enterキーで確定
            element.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    e.target.blur();
                }
            });
        });
    }

    /**
     * 項目名の編集を処理
     * @param {Event} e - イベント
     * @private
     */
    _handleItemNameEdit(e) {
        const element = e.target;
        const itemIndex = parseInt(element.dataset.itemIndex);
        const originalValue = element.dataset.originalValue;
        const newValue = element.textContent.trim();
        
        if (newValue && newValue !== originalValue) {
            // 重複チェック
            const isDuplicate = this.app.evaluationItems.some((item, i) => 
                i !== itemIndex && item === newValue
            );
            
            if (isDuplicate) {
                this.showStatusMessage('この項目は既に存在します', 'error');
                element.textContent = originalValue;
                return;
            }
            
            // 項目名を更新
            const oldItem = this.app.evaluationItems[itemIndex];
            this.app.evaluationItems[itemIndex] = newValue;
            
            // weekDataの全レコードで項目名を更新
            this.app.weekData.dailyRecords.forEach(record => {
                if (record.responses[oldItem] !== undefined) {
                    record.responses[newValue] = record.responses[oldItem];
                    delete record.responses[oldItem];
                }
            });
            
            this.app.lastUsedItems = [...this.app.evaluationItems];
            this.app._updateWeekDataWithNewItems();
            this.app.markAsChanged();
            
            // 表示を更新
            this.renderPreview();
        } else if (!newValue) {
            // 空の場合は元に戻す
            element.textContent = originalValue;
        }
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
            }, UI_CONSTANTS.STATUS_MESSAGE_DURATION);
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
        }, UI_CONSTANTS.STATUS_MESSAGE_DURATION);
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

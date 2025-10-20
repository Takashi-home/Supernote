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
     * 週間サマリーを更新（リアルタイム更新用）
     */
    updateWeekSummary() {
        const summarySection = document.querySelector('.week-summary-section .week-summary');
        if (summarySection) {
            const grid = summarySection.querySelector('.week-summary-grid');
            if (grid) {
                grid.innerHTML = this._generateWeekSummaryHTML();
            }
        }
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
                ${this._createAddItemFormHTML()}
            </div>
            ${this._createReflectionFieldHTML(record, dayIndex)}
            <button class="btn btn--primary daily-entry-submit-btn" onclick="diaryApp.showDailySubmitModal(${dayIndex})">
                📤 この日を提出
            </button>
        `;
        
        this._attachEvaluationListeners(dayEntry, dayIndex);
        this._attachReflectionListener(dayEntry);
        this._attachItemNameEditListeners(dayEntry);
        this._attachAddItemListener(dayEntry);
        
        return dayEntry;
    }
    
    /**
     * 項目追加フォームのHTMLを作成
     * @returns {string}
     * @private
     */
    _createAddItemFormHTML() {
        return `
            <div class="evaluation-item add-item-form-eval">
                <div class="add-item-form-inline-eval">
                    <input type="text" 
                           id="newItemInputEval" 
                           class="form-control form-control-inline"
                           placeholder="新しい項目を追加">
                    <button class="btn btn--primary btn--sm" 
                            id="addItemBtnEval">
                        ＋ 追加
                    </button>
                </div>
            </div>
        `;
    }
    
    /**
     * 項目名の編集リスナーをアタッチ
     * @param {HTMLElement} dayEntry - 日記エントリー要素
     * @private
     */
    _attachItemNameEditListeners(dayEntry) {
        const labels = dayEntry.querySelectorAll('.evaluation-item-label[contenteditable="true"]');
        labels.forEach(label => {
            // フォーカス時に元の値を保存
            label.addEventListener('focus', (e) => {
                e.target.dataset.editingValue = e.target.textContent;
            });
            
            // Enterキーで編集を確定
            label.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    e.target.blur();
                }
            });
            
            // ブラー時に変更を保存
            label.addEventListener('blur', (e) => {
                const newValue = e.target.textContent.trim();
                const itemIndex = parseInt(e.target.dataset.itemIndex);
                const originalValue = e.target.dataset.originalValue;
                
                if (newValue === '') {
                    // 空の場合は元に戻す
                    e.target.textContent = originalValue;
                    this.showStatusMessage('項目名を空にすることはできません', 'error');
                    return;
                }
                
                if (newValue !== originalValue) {
                    // 項目名を更新
                    this.app.updateItemName(itemIndex, newValue);
                }
            });
        });
    }
    
    /**
     * 項目追加フォームのリスナーをアタッチ
     * @param {HTMLElement} dayEntry - 日記エントリー要素
     * @private
     */
    _attachAddItemListener(dayEntry) {
        const addBtn = dayEntry.querySelector('#addItemBtnEval');
        const input = dayEntry.querySelector('#newItemInputEval');
        
        if (addBtn && input) {
            const addItem = () => {
                const newItem = input.value.trim();
                if (newItem && !this.app.evaluationItems.includes(newItem)) {
                    this.app.evaluationItems.push(newItem);
                    this.app.lastUsedItems = [...this.app.evaluationItems];
                    this.app._updateWeekDataWithNewItems();
                    this.renderDiary();
                    this.app.markAsChanged();
                    this.showStatusMessage('項目を追加しました', 'success');
                } else if (this.app.evaluationItems.includes(newItem)) {
                    this.showStatusMessage('この項目は既に存在します', 'error');
                }
            };
            
            addBtn.addEventListener('click', addItem);
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    addItem();
                }
            });
        }
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
                <div class="evaluation-item-header">
                    <label class="evaluation-item-label" 
                           contenteditable="true" 
                           data-item-index="${itemIndex}"
                           data-original-value="${this.escapeHtml(item)}">${this.escapeHtml(item)}</label>
                    <button class="btn-delete-eval-item" 
                            onclick="diaryApp.removeItemFromEval(${itemIndex})"
                            title="この項目を削除">🗑️</button>
                </div>
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
            ${this._createPreviewTable()}
            ${this._createReflectionsSection()}
            ${this._createParentsCommentSection()}
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
        const rows = this.app.evaluationItems
            .map((item, index) => this._createTableRow(item, index))
            .join('');
        
        return rows;
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
        
        const itemCell = `
            <td class="item-cell" title="${this.escapeHtml(item)}">${this.escapeHtml(displayText)}</td>
        `;
        
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
        return `<td class="eval-cell">${value}</td>`;
    }

    /**
     * テーブルから項目を削除
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
     * 親からのコメントセクションを作成（プレビュー用）
     * @returns {string}
     * @private
     */
    _createParentsCommentSection() {
        const parentsComment = this.app.weekData.parentsComment || '';
        
        // コメントが空の場合は表示しない
        if (!parentsComment.trim()) {
            return '';
        }
        
        return `
            <div class="reflections-section parents-comment-preview">
                <h4>親からのコメント</h4>
                <div class="reflections-list">
                    <div class="reflection-item">
                        <div class="reflection-date">親より</div>
                        <div class="reflection-text">${this.escapeHtml(parentsComment)}</div>
                    </div>
                </div>
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

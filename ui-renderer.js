// UI描画機能モジュール

class UIRenderer {
    constructor(app) {
        this.app = app;
    }

    /**
     * 日記入力画面を描画
     */
    renderDiary() {
        const weekGoal = document.getElementById('weekGoal');
        weekGoal.value = this.app.weekData.goal;
        
        // 既存のリスナーを削除して新しいリスナーを追加
        const newWeekGoal = weekGoal.cloneNode(true);
        weekGoal.parentNode.replaceChild(newWeekGoal, weekGoal);
        
        newWeekGoal.addEventListener('input', () => {
            this.app.weekData.goal = newWeekGoal.value;
        });

        const container = document.getElementById('dailyEntries');
        container.innerHTML = '';

        this.app.weekData.dailyRecords.forEach((record, dayIndex) => {
            const dayEntry = this.createDayEntry(record, dayIndex);
            container.appendChild(dayEntry);
        });
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
                ${this.app.evaluationItems.map((item, itemIndex) => {
                    const safeItemId = `item-${dayIndex}-${itemIndex}`;
                    return `
                    <div class="evaluation-item" data-item="${this.escapeHtml(item)}" data-day="${dayIndex}">
                        <label>${this.escapeHtml(item)}</label>
                        <div class="rating-group">
                            ${this.app.checkOptions.map(option => `
                                <div class="rating-option rating-option--${option.class}">
                                    <input type="radio" 
                                           id="${safeItemId}-${option.class}" 
                                           name="${safeItemId}" 
                                           value="${option.value}"
                                           ${record.responses[item] === option.value ? 'checked' : ''}>
                                    <label for="${safeItemId}-${option.class}">${option.value}</label>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `}).join('')}
            </div>
            <div class="reflection-field">
                <label class="form-label">感想・気づき</label>
                <textarea class="form-control" rows="3" 
                    placeholder="今日の感想や気づきを記録してください"
                    data-day="${dayIndex}">${this.escapeHtml(record.reflection)}</textarea>
            </div>
        `;
        
        // ラジオボタンのイベントリスナーを追加
        dayEntry.querySelectorAll('.evaluation-item').forEach((evalItem) => {
            const item = evalItem.dataset.item;
            const dayIdx = parseInt(evalItem.dataset.day);
            const radioInputs = evalItem.querySelectorAll('input[type="radio"]');
            radioInputs.forEach(radio => {
                radio.addEventListener('change', (e) => {
                    if (e.target.checked) {
                        this.app.setEvaluation(dayIdx, item, e.target.value);
                    }
                });
            });
        });
        
        // 感想テキストエリアのイベントリスナーを追加
        const textarea = dayEntry.querySelector('textarea[data-day]');
        textarea.addEventListener('input', (e) => {
            const dayIdx = parseInt(e.target.dataset.day);
            this.app.setReflection(dayIdx, e.target.value);
        });
        
        return dayEntry;
    }

    /**
     * プレビュー画面を描画
     */
    renderPreview() {
        const container = document.getElementById('previewContent');
        
        let html = `
            <div class="preview-header">
                <h4>週間目標: ${this.escapeHtml(this.app.weekData.goal) || '未設定'}</h4>
                <p>期間: ${this.app.currentWeek}</p>
            </div>
            
            <table class="preview-table">
                <thead>
                    <tr>
                        <th class="date-cell">日付</th>
                        ${this.app.evaluationItems.map(item => {
                            const displayText = item.length > 10 ? item.substring(0, 10) + '...' : item;
                            return `<th class="eval-cell">${this.escapeHtml(displayText)}</th>`;
                        }).join('')}
                        <th class="reflection-cell">感想・気づき</th>
                    </tr>
                </thead>
                <tbody>
                    ${this.app.weekData.dailyRecords.map(record => {
                        const date = new Date(record.date);
                        const formattedDate = `${date.getMonth() + 1}/${date.getDate()}`;
                        
                        return `
                            <tr>
                                <td class="date-cell">${formattedDate}(${record.dayOfWeek})</td>
                                ${this.app.evaluationItems.map(item => `
                                    <td class="eval-cell">${record.responses[item] || ''}</td>
                                `).join('')}
                                <td class="reflection-cell">${this.escapeHtml(record.reflection) || ''}</td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        `;
        
        container.innerHTML = html;
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
            }, 3000);
        }
    }

    /**
     * トーストメッセージ表示
     * @param {string} message - 表示メッセージ
     * @param {string} type - メッセージタイプ (success/error/info)
     */
    showStatusMessage(message, type) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `status-message ${type}`;
        messageDiv.textContent = message;
        messageDiv.style.position = 'fixed';
        messageDiv.style.top = '20px';
        messageDiv.style.right = '20px';
        messageDiv.style.zIndex = '3000';
        messageDiv.style.minWidth = '250px';
        
        document.body.appendChild(messageDiv);
        
        setTimeout(() => {
            document.body.removeChild(messageDiv);
        }, 3000);
    }
}

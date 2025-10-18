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
            this.app.debugLog('weekGoal input event');
            this.app.weekData.goal = newWeekGoal.value;
            this.app.markAsChanged(); // 変更を検知
        });

        const container = document.getElementById('dailyEntries');
        container.innerHTML = '';

        // 日別ナビゲーションを表示
        const dayNavigation = this.createDayNavigation();
        container.appendChild(dayNavigation);

        // 現在選択中の日のエントリーのみを表示
        const currentRecord = this.app.weekData.dailyRecords[this.app.currentDayIndex];
        const dayEntry = this.createDayEntry(currentRecord, this.app.currentDayIndex);
        container.appendChild(dayEntry);

        // 週間サマリーを日記セクション内の下部に表示
        const weekSummarySection = document.createElement('section');
        weekSummarySection.className = 'week-summary-section';
        weekSummarySection.innerHTML = '<h3>今週の記録</h3>';
        const weekSummary = this.createWeekSummary();
        weekSummarySection.appendChild(weekSummary);
        container.appendChild(weekSummarySection);

        // 親からのコメント欄を追加
        const parentsCommentSection = this.createParentsCommentSection();
        container.appendChild(parentsCommentSection);
    }

    /**
     * 週間サマリーを作成
     * @returns {HTMLElement} - 週間サマリー要素
     */
    createWeekSummary() {
        const summary = document.createElement('div');
        summary.className = 'week-summary';
        
        let html = '<div class="week-summary-grid">';
        
        this.app.weekData.dailyRecords.forEach((record, index) => {
            const date = new Date(record.date);
            const formattedDate = `${date.getMonth() + 1}/${date.getDate()}`;
            const isActive = index === this.app.currentDayIndex;
            
            // 各評価の数をカウント
            const counts = { '⭕️': 0, '✖️': 0, '△': 0 };
            Object.values(record.responses).forEach(value => {
                if (counts.hasOwnProperty(value)) {
                    counts[value]++;
                }
            });
            
            html += `
                <div class="week-summary-day ${isActive ? 'active' : ''}" onclick="diaryApp.currentDayIndex = ${index}; diaryApp.uiRenderer.renderDiary();">
                    <div class="summary-date">${formattedDate}(${record.dayOfWeek})</div>
                    <div class="summary-counts">
                        <span class="count-success">⭕️${counts['⭕️']}</span>
                        <span class="count-error">✖️${counts['✖️']}</span>
                        <span class="count-warning">△${counts['△']}</span>
                    </div>
                </div>
            `;
        });
        
        html += '</div>';
        summary.innerHTML = html;
        
        return summary;
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
                // クリックイベントで選択解除を処理
                radio.addEventListener('click', (e) => {
                    const currentValue = this.app.weekData.dailyRecords[dayIdx].responses[item];
                    
                    // 同じ値が既に選択されている場合は解除
                    if (currentValue === radio.value) {
                        e.preventDefault();
                        // 少し遅延させてから解除
                        setTimeout(() => {
                            radio.checked = false;
                            radioInputs.forEach(r => r.checked = false);
                            this.app.setEvaluation(dayIdx, item, '');
                        }, 10);
                    } else {
                        // 新しい値を設定
                        this.app.setEvaluation(dayIdx, item, radio.value);
                    }
                });
            });
        });
        
        // 感想テキストエリアのイベントリスナーを追加
        const textarea = dayEntry.querySelector('textarea[data-day]');
        textarea.addEventListener('input', (e) => {
            this.app.debugLog('Textarea INPUT event');
            const dayIdx = parseInt(e.target.dataset.day);
            this.app.setReflection(dayIdx, e.target.value);
        });
        
        return dayEntry;
    }

    /**
     * プレビュー画面を描画（項目を行、日付を列に配置）
     */
    renderPreview() {
        const container = document.getElementById('previewContent');
        
        let html = `
            <div class="preview-header">
                <h4>週間目標: ${this.escapeHtml(this.app.weekData.goal) || '未設定'}</h4>
                <p>期間: ${this.app.currentWeek}</p>
            </div>
            
            <div class="preview-table-wrapper">
                <table class="preview-table">
                    <thead>
                        <tr>
                            <th class="item-cell">評価項目</th>
                            ${this.app.weekData.dailyRecords.map(record => {
                                const date = new Date(record.date);
                                const formattedDate = `${date.getMonth() + 1}/${date.getDate()}`;
                                return `<th class="date-cell">${formattedDate}<br/>(${record.dayOfWeek})</th>`;
                            }).join('')}
                        </tr>
                    </thead>
                    <tbody>
                        ${this.app.evaluationItems.map(item => {
                            const displayText = item.length > 15 ? item.substring(0, 15) + '...' : item;
                            return `
                                <tr>
                                    <td class="item-cell" title="${this.escapeHtml(item)}">${this.escapeHtml(displayText)}</td>
                                    ${this.app.weekData.dailyRecords.map(record => `
                                        <td class="eval-cell">${record.responses[item] || '-'}</td>
                                    `).join('')}
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
            
            <div class="reflections-section">
                <h4>感想・気づき</h4>
                <div class="reflections-grid">
                    ${this.app.weekData.dailyRecords.map(record => {
                        const date = new Date(record.date);
                        const formattedDate = `${date.getMonth() + 1}/${date.getDate()}`;
                        return `
                            <div class="reflection-item">
                                <div class="reflection-date">${formattedDate}(${record.dayOfWeek})</div>
                                <div class="reflection-text">${this.escapeHtml(record.reflection) || '記録なし'}</div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
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

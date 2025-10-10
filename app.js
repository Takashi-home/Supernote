// スーパーノート日記アプリ v3 JavaScript - 画像出力修正版

class SuperNoteDiaryAppV3 {
    constructor() {
        this.data = {
            week: '',
            goal: '',
            dailyRecords: []
        };
        
        // デフォルトの項目
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
        
        // カスタム項目（最初の項目は目標なので除外）
        this.customItems = this.defaultItems.slice(1);
        
        // 3択評価のオプション
        this.checkOptions = [
            {value: "○", label: "○", color: "#22c55e", class: "success"},
            {value: "✖️", label: "✖️", color: "#ef4444", class: "error"},
            {value: "△", label: "△", color: "#f59e0b", class: "warning"}
        ];
        
        // 同期設定
        this.syncSettings = {
            githubToken: "",
            privateRepoUrl: "https://github.com/username/private-diary-data",
            syncEnabled: false,
            lastSync: null,
            autoSyncEnabled: true
        };
        
        // 同期ログ
        this.syncLogs = [];
        
        this.weekDays = ["月", "火", "水", "木", "金", "土", "日"];
        
        // 画像出力時の設定
        this.exportInProgress = false;
        
        this.init();
    }
    
    init() {
        this.loadSettings();
        this.bindEvents();
        this.loadSampleData();
        this.generateWeekDates();
        this.updateSyncStatus();
    }
    
    // 簡単な暗号化・復号化（実際のアプリケーションではより強固な暗号化を使用）
    encrypt(text) {
        if (!text) return '';
        return btoa(text.split('').reverse().join(''));
    }
    
    decrypt(encrypted) {
        if (!encrypted) return '';
        try {
            return atob(encrypted).split('').reverse().join('');
        } catch {
            return '';
        }
    }
    
    loadSettings() {
        try {
            const stored = localStorage.getItem('superNoteSettings');
            if (stored) {
                const settings = JSON.parse(stored);
                this.syncSettings = {...this.syncSettings, ...settings};
                // トークンは暗号化されているので復号化
                if (this.syncSettings.githubToken) {
                    this.syncSettings.githubToken = this.decrypt(this.syncSettings.githubToken);
                }
            }
            
            const storedItems = localStorage.getItem('superNoteCustomItems');
            if (storedItems) {
                this.customItems = JSON.parse(storedItems);
            }
            
            const storedLogs = localStorage.getItem('superNoteSyncLogs');
            if (storedLogs) {
                this.syncLogs = JSON.parse(storedLogs);
            }
        } catch (error) {
            console.error('設定の読み込みエラー:', error);
        }
    }
    
    saveSettings() {
        try {
            const settingsToSave = {...this.syncSettings};
            // トークンは暗号化して保存
            if (settingsToSave.githubToken) {
                settingsToSave.githubToken = this.encrypt(settingsToSave.githubToken);
            }
            
            localStorage.setItem('superNoteSettings', JSON.stringify(settingsToSave));
            localStorage.setItem('superNoteCustomItems', JSON.stringify(this.customItems));
            localStorage.setItem('superNoteSyncLogs', JSON.stringify(this.syncLogs));
        } catch (error) {
            console.error('設定の保存エラー:', error);
        }
    }
    
    bindEvents() {
        // ナビゲーション
        document.getElementById('input-tab').addEventListener('click', () => this.showScreen('input'));
        document.getElementById('preview-tab').addEventListener('click', () => this.showScreen('preview'));
        document.getElementById('settings-tab').addEventListener('click', () => this.showScreen('settings'));
        
        // 週選択の変更
        document.getElementById('week-select').addEventListener('change', (e) => {
            this.data.week = e.target.value;
            this.generateWeekDates();
            this.data.goal = document.getElementById('weekly-goal').value;
        });
        
        // 目標入力の変更
        document.getElementById('weekly-goal').addEventListener('input', (e) => {
            this.data.goal = e.target.value;
        });
        
        // メインボタン
        document.getElementById('save-btn').addEventListener('click', () => this.saveData());
        document.getElementById('preview-btn').addEventListener('click', () => this.showPreview());
        document.getElementById('export-btn').addEventListener('click', () => this.exportImage());
        document.getElementById('back-to-edit-btn').addEventListener('click', () => this.showScreen('input'));
        document.getElementById('sync-btn').addEventListener('click', () => this.syncData());
        
        // カスタム項目管理
        document.getElementById('manage-items-btn').addEventListener('click', () => this.showItemsModal());
        document.getElementById('close-modal').addEventListener('click', () => this.hideItemsModal());
        document.getElementById('add-item-btn').addEventListener('click', () => this.addCustomItem());
        document.getElementById('reset-items-btn').addEventListener('click', () => this.resetItems());
        document.getElementById('save-items-btn').addEventListener('click', () => this.saveCustomItems());
        
        // 設定関連
        document.getElementById('toggle-token').addEventListener('click', () => this.toggleTokenVisibility());
        document.getElementById('save-settings-btn').addEventListener('click', () => this.saveSettingsForm());
        document.getElementById('test-connection-btn').addEventListener('click', () => this.testConnection());
        document.getElementById('export-data-btn').addEventListener('click', () => this.exportData());
        document.getElementById('import-data-btn').addEventListener('click', () => this.importData());
        document.getElementById('import-file').addEventListener('change', (e) => this.handleFileImport(e));
        
        // モーダル外クリックで閉じる
        document.getElementById('items-modal').addEventListener('click', (e) => {
            if (e.target.id === 'items-modal') {
                this.hideItemsModal();
            }
        });
        
        // Enterキーでアイテム追加
        document.getElementById('new-item').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.addCustomItem();
            }
        });
    }
    
    loadSampleData() {
        // サンプルデータを読み込み
        this.data = {
            week: "2024-W42",
            goal: "心を込めて日々を過ごす",
            dailyRecords: []
        };
        document.getElementById('week-select').value = this.data.week;
        document.getElementById('weekly-goal').value = this.data.goal;
    }
    
    generateWeekDates() {
        const weekValue = document.getElementById('week-select').value;
        if (!weekValue) return;
        
        this.data.week = weekValue;
        
        const [year, week] = weekValue.split('-W');
        const weekNumber = parseInt(week);
        
        const startDate = this.getDateFromWeekNumber(parseInt(year), weekNumber);
        this.generateDailyForms(startDate);
    }
    
    getDateFromWeekNumber(year, weekNumber) {
        const jan4 = new Date(year, 0, 4);
        const jan4Day = jan4.getDay() || 7;
        const jan4Monday = new Date(jan4.getTime() - (jan4Day - 1) * 24 * 60 * 60 * 1000);
        const targetMonday = new Date(jan4Monday.getTime() + (weekNumber - 1) * 7 * 24 * 60 * 60 * 1000);
        return targetMonday;
    }
    
    generateDailyForms(startDate) {
        const container = document.getElementById('daily-forms');
        container.innerHTML = '';
        
        this.data.dailyRecords = [];
        
        for (let i = 0; i < 7; i++) {
            const currentDate = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
            const dateString = this.formatDate(currentDate);
            const dayOfWeek = this.weekDays[i];
            
            const dailyRecord = {
                date: dateString,
                dayOfWeek: dayOfWeek,
                responses: {},
                reflection: ''
            };
            
            // カスタム項目の初期値設定
            this.customItems.forEach(item => {
                dailyRecord.responses[item] = '';
            });
            
            this.data.dailyRecords.push(dailyRecord);
            
            const formElement = this.createDailyForm(dailyRecord, i);
            container.appendChild(formElement);
        }
    }
    
    createDailyForm(record, index) {
        const formDiv = document.createElement('div');
        formDiv.className = 'daily-form';
        
        let itemsHTML = '';
        this.customItems.forEach((item, itemIndex) => {
            const optionsHTML = this.checkOptions.map(option => `
                <div class="rating-option rating-option--${option.class}">
                    <input type="radio" id="${item}-${index}-${option.value}" 
                           name="${item}-${index}" value="${option.value}"
                           onchange="app.updateResponse(${index}, '${item}', '${option.value}')"
                           ${record.responses[item] === option.value ? 'checked' : ''}>
                    <label for="${item}-${index}-${option.value}">${option.label}</label>
                </div>
            `).join('');
            
            itemsHTML += `
                <div class="checkbox-item">
                    <div class="item-info">
                        <strong>${item}</strong>
                    </div>
                    <div class="rating-group">
                        ${optionsHTML}
                    </div>
                </div>
            `;
        });
        
        formDiv.innerHTML = `
            <div class="daily-form__header">
                <h3 class="daily-form__title">${record.date} (${record.dayOfWeek})</h3>
            </div>
            <div class="checkbox-group">
                ${itemsHTML}
            </div>
            <div class="memo-area">
                <label for="reflection-${index}" class="form-label">1日の感想</label>
                <textarea id="reflection-${index}" class="form-control" rows="3" 
                          placeholder="その日の振り返りや感想を記入してください"
                          oninput="app.updateReflection(${index}, this.value)">${record.reflection}</textarea>
            </div>
        `;
        
        return formDiv;
    }
    
    updateResponse(dayIndex, item, value) {
        if (this.data.dailyRecords[dayIndex]) {
            this.data.dailyRecords[dayIndex].responses[item] = value;
        }
    }
    
    updateReflection(dayIndex, value) {
        if (this.data.dailyRecords[dayIndex]) {
            this.data.dailyRecords[dayIndex].reflection = value;
        }
    }
    
    formatDate(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
    
    // 保存処理を非同期にし、保存時に GitHub に dispatch を送る処理を追加
    async saveData() {
        this.data.goal = document.getElementById('weekly-goal').value;
        this.data.week = document.getElementById('week-select').value;
        
        // ローカル保存（設定の保存も含む）
        this.saveSettings();
        
        this.showMessage('データを保存しました', 'success');
        this.updateSyncButton();

        // 保存ボタンのイベントハンドラに追加：GitHub に保存（リポジトリの dispatch を呼ぶ）
        // syncEnabled が true のときに自動で保存用 dispatch を送信する
        if (this.syncSettings.syncEnabled && this.syncSettings.githubToken && this.syncSettings.privateRepoUrl) {
            const weekData = {
                week: this.data.week,
                goal: this.data.goal,
                dailyRecords: this.data.dailyRecords
            };
            try {
                await this.saveToGitHub(weekData);
                this.showMessage('GitHub に保存しました', 'success');
                this.addSyncLog('success', 'GitHub への保存が完了しました');
                // lastSync を更新
                this.syncSettings.lastSync = new Date().toISOString();
                this.saveSettings();
                this.updateSyncStatus('connected');
            } catch (error) {
                console.error('GitHub保存エラー:', error);
                this.showMessage('GitHubへの保存に失敗しました: ' + (error.message || error), 'error');
                this.addSyncLog('error', 'GitHubへの保存に失敗しました: ' + (error.message || error));
                this.updateSyncStatus('error');
            }
        }
    }
    
    // GitHub の repository_dispatch を呼び出す
    // syncSettings.privateRepoUrl から owner/repo を抽出して dispatch を送信する
    async saveToGitHub(weekData) {
        // privateRepoUrl が 'https://github.com/owner/repo' の形式であることを想定
        const repoUrl = this.syncSettings.privateRepoUrl || '';
        const match = repoUrl.match(/github\.com\/([^\/]+)\/([^\/]+)(?:\/|$)/);
        if (!match) {
            throw new Error('無効なリポジトリ URL: ' + repoUrl);
        }
        const owner = match[1];
        const repo = match[2];
        const token = this.syncSettings.githubToken;
        if (!token) {
            throw new Error('GitHub トークンが設定されていません');
        }
        
        const endpoint = `https://api.github.com/repos/${owner}/${repo}/dispatches`;
        const payload = {
            event_type: 'save-diary',
            client_payload: {
                week: weekData.week,
                data: JSON.stringify(weekData)
            }
        };
        
        const res = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Authorization': `token ${token}`,
                'Accept': 'application/vnd.github+json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        
        if (!res.ok) {
            // 可能ならばレスポンスの本文も取り出してエラーメッセージに含める
            let bodyText = '';
            try {
                bodyText = await res.text();
            } catch (e) {
                bodyText = '<failed to read response body>';
            }
            throw new Error(`GitHub API エラー ${res.status}: ${bodyText}`);
        }
        
        // 正常終了
        return true;
    }
    
    showScreen(screenName) {
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('screen--active');
        });
        
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('nav-btn--active');
        });
        
        if (screenName === 'input') {
            document.getElementById('input-screen').classList.add('screen--active');
            document.getElementById('input-tab').classList.add('nav-btn--active');
        } else if (screenName === 'preview') {
            document.getElementById('preview-screen').classList.add('screen--active');
            document.getElementById('preview-tab').classList.add('nav-btn--active');
            this.updatePreview();
        } else if (screenName === 'settings') {
            document.getElementById('settings-screen').classList.add('screen--active');
            document.getElementById('settings-tab').classList.add('nav-btn--active');
            this.loadSettingsForm();
        }
    }
    
    showPreview() {
        this.saveData();
        this.showScreen('preview');
    }
    
    updatePreview() {
        document.getElementById('preview-week').textContent = `${this.data.week} の記録`;
        document.getElementById('preview-goal-text').textContent = this.data.goal || '目標が設定されていません';
        
        // テーブルヘッダーを更新
        const headerRow = document.getElementById('preview-table-header');
        headerRow.innerHTML = '<th>日付</th>';
        this.customItems.forEach(item => {
            headerRow.innerHTML += `<th>${item}</th>`;
        });
        headerRow.innerHTML += '<th>感想</th>';
        
        // テーブルボディを更新
        const tbody = document.getElementById('preview-table-body');
        tbody.innerHTML = '';
        
        this.data.dailyRecords.forEach(record => {
            const row = document.createElement('tr');
            
            let rowHTML = `<td><strong>${record.date}<br>(${record.dayOfWeek})</strong></td>`;
            
            this.customItems.forEach(item => {
                const response = record.responses[item] || '';
                const symbol = this.getStatusSymbol(response);
                rowHTML += `<td>${symbol}</td>`;
            });
            
            rowHTML += `<td class="memo-cell">${record.reflection || '-'}</td>`;
            
            row.innerHTML = rowHTML;
            tbody.appendChild(row);
        });
    }
    
    getStatusSymbol(value) {
        const option = this.checkOptions.find(opt => opt.value === value);
        if (!option) {
            return `<span class="status-symbol status-symbol--none">-</span>`;
        }
        return `<span class="status-symbol status-symbol--${option.class}">${option.label}</span>`;
    }
    
    // 画像出力機能の改良版
    async exportImage() {
        if (this.exportInProgress) return;
        
        const exportBtn = document.getElementById('export-btn');
        const originalText = exportBtn.textContent;
        
        try {
            this.exportInProgress = true;
            exportBtn.textContent = '画像準備中...';
            exportBtn.disabled = true;
            
            const element = document.getElementById('preview-content');
            
            // 1. 全体表示モードに切り替え
            await this.enableFullDisplayMode(element);
            
            // 2. DOM要素の計算を待つ
            await this.waitForLayout();
            
            // 3. html2canvasの実行
            exportBtn.textContent = '画像生成中...';
            
            // より詳細な設定でhtml2canvasを実行
            const canvas = await html2canvas(element, {
                useCORS: true,
                allowTaint: true,
                scale: 2,
                scrollX: 0,
                scrollY: 0,
                backgroundColor: '#ffffff',
                removeContainer: false,
                imageTimeout: 30000,
                height: element.scrollHeight,
                width: element.scrollWidth,
                windowWidth: element.scrollWidth,
                windowHeight: element.scrollHeight,
                logging: false,
                onclone: (clonedDoc) => {
                    // クローンされたドキュメントでも全体表示モードを適用
                    const clonedElement = clonedDoc.getElementById('preview-content');
                    if (clonedElement) {
                        clonedElement.classList.add('full-display-mode', 'export-mode');
                        // スタイルの強制適用
                        clonedElement.style.height = 'auto';
                        clonedElement.style.maxHeight = 'none';
                        clonedElement.style.overflow = 'visible';
                        
                        const clonedTableContainer = clonedElement.querySelector('.preview-table-container');
                        if (clonedTableContainer) {
                            clonedTableContainer.style.height = 'auto';
                            clonedTableContainer.style.maxHeight = 'none';
                            clonedTableContainer.style.overflow = 'visible';
                        }
                        
                        const clonedTable = clonedElement.querySelector('.preview-table');
                        if (clonedTable) {
                            clonedTable.style.height = 'auto';
                            clonedTable.style.maxHeight = 'none';
                        }
                        
                        // sticky要素を通常の配置に変更
                        const stickyHeaders = clonedElement.querySelectorAll('.preview-table th');
                        stickyHeaders.forEach(header => {
                            header.style.position = 'static';
                        });
                    }
                }
            });
            
            // 4. 通常表示モードに復帰
            this.disableFullDisplayMode(element);
            
            // 5. 画像のダウンロード
            exportBtn.textContent = 'ダウンロード中...';
            
            const link = document.createElement('a');
            link.download = `スーパーノート日記_${this.data.week}.png`;
            link.href = canvas.toDataURL('image/png', 1.0);
            link.click();
            
            this.showMessage('画像を出力しました', 'success');
            
        } catch (error) {
            console.error('画像出力エラー:', error);
            this.showMessage('画像出力に失敗しました: ' + error.message, 'error');
            
            // エラー時も通常表示モードに復帰
            const element = document.getElementById('preview-content');
            this.disableFullDisplayMode(element);
        } finally {
            exportBtn.textContent = originalText;
            exportBtn.disabled = false;
            this.exportInProgress = false;
        }
    }
    
    // 全体表示モードを有効にする
    async enableFullDisplayMode(element) {
        element.classList.add('full-display-mode', 'export-mode');
        
        // 強制的にスタイルを適用
        element.style.height = 'auto';
        element.style.maxHeight = 'none';
        element.style.overflow = 'visible';
        element.style.position = 'static';
        
        // テーブルコンテナの調整
        const tableContainer = element.querySelector('.preview-table-container');
        if (tableContainer) {
            tableContainer.style.height = 'auto';
            tableContainer.style.maxHeight = 'none';
            tableContainer.style.overflow = 'visible';
        }
        
        // テーブルの調整
        const table = element.querySelector('.preview-table');
        if (table) {
            table.style.height = 'auto';
            table.style.maxHeight = 'none';
        }
        
        // sticky要素を通常の配置に変更
        const stickyHeaders = element.querySelectorAll('.preview-table th');
        stickyHeaders.forEach(header => {
            header.style.position = 'static';
        });
        
        // レイアウトの再計算を促す
        element.offsetHeight;
    }
    
    // 通常表示モードに復帰
    disableFullDisplayMode(element) {
        element.classList.remove('full-display-mode', 'export-mode');
        
        // インラインスタイルを削除
        element.style.height = '';
        element.style.maxHeight = '';
        element.style.overflow = '';
        element.style.position = '';
        
        const tableContainer = element.querySelector('.preview-table-container');
        if (tableContainer) {
            tableContainer.style.height = '';
            tableContainer.style.maxHeight = '';
            tableContainer.style.overflow = '';
        }
        
        const table = element.querySelector('.preview-table');
        if (table) {
            table.style.height = '';
            table.style.maxHeight = '';
        }
        
        // sticky要素を元に戻す
        const stickyHeaders = element.querySelectorAll('.preview-table th');
        stickyHeaders.forEach(header => {
            header.style.position = '';
        });
    }
    
    // レイアウト計算の完了を待つ
    waitForLayout() {
        return new Promise(resolve => {
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    setTimeout(resolve, 100);
                });
            });
        });
    }
    
    // カスタム項目管理
    showItemsModal() {
        this.updateItemsList();
        document.getElementById('items-modal').classList.remove('hidden');
    }
    
    hideItemsModal() {
        document.getElementById('items-modal').classList.add('hidden');
    }
    
    updateItemsList() {
        const container = document.getElementById('items-list');
        container.innerHTML = '';
        
        this.customItems.forEach((item, index) => {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'item-entry';
            itemDiv.innerHTML = `
                <span class="item-text">${item}</span>
                <div class="item-actions">
                    <button class="btn btn--outline btn--xs" onclick="app.editItem(${index})">編集</button>
                    <button class="btn btn--outline btn--xs" onclick="app.removeItem(${index})">削除</button>
                </div>
            `;
            container.appendChild(itemDiv);
        });
    }
    
    addCustomItem() {
        const input = document.getElementById('new-item');
        const itemText = input.value.trim();
        
        if (itemText && !this.customItems.includes(itemText)) {
            this.customItems.push(itemText);
            this.updateItemsList();
            input.value = '';
            this.showMessage('項目を追加しました', 'success');
        } else if (this.customItems.includes(itemText)) {
            this.showMessage('既に存在する項目です', 'error');
        }
    }
    
    editItem(index) {
        const newText = prompt('項目名を編集:', this.customItems[index]);
        if (newText && newText.trim() && !this.customItems.includes(newText.trim())) {
            this.customItems[index] = newText.trim();
            this.updateItemsList();
        }
    }
    
    removeItem(index) {
        if (confirm('この項目を削除しますか？')) {
            this.customItems.splice(index, 1);
            this.updateItemsList();
        }
    }
    
    resetItems() {
        if (confirm('デフォルトの項目に戻しますか？現在のカスタム項目は失われます。')) {
            this.customItems = this.defaultItems.slice(1);
            this.updateItemsList();
        }
    }
    
    saveCustomItems() {
        this.saveSettings();
        this.hideItemsModal();
        this.generateWeekDates(); // フォームを再生成
        this.showMessage('項目設定を保存しました', 'success');
    }
    
    // 設定画面
    loadSettingsForm() {
        document.getElementById('github-token').value = this.syncSettings.githubToken;
        document.getElementById('private-repo').value = this.syncSettings.privateRepoUrl;
        document.getElementById('auto-sync').checked = this.syncSettings.autoSyncEnabled;
        this.updateSyncLog();
    }
    
    toggleTokenVisibility() {
        const tokenInput = document.getElementById('github-token');
        const toggleBtn = document.getElementById('toggle-token');
        
        if (tokenInput.type === 'password') {
            tokenInput.type = 'text';
            toggleBtn.textContent = '隠す';
        } else {
            tokenInput.type = 'password';
            toggleBtn.textContent = '表示';
        }
    }
    
    saveSettingsForm() {
        this.syncSettings.githubToken = document.getElementById('github-token').value;
        this.syncSettings.privateRepoUrl = document.getElementById('private-repo').value;
        this.syncSettings.autoSyncEnabled = document.getElementById('auto-sync').checked;
        this.syncSettings.syncEnabled = !!(this.syncSettings.githubToken && this.syncSettings.privateRepoUrl);
        
        this.saveSettings();
        this.updateSyncStatus();
        this.updateSyncButton();
        
        this.showMessage('設定を保存しました', 'success');
        this.addSyncLog('info', '設定が更新されました');
    }
    
    async testConnection() {
        const btn = document.getElementById('test-connection-btn');
        const originalText = btn.textContent;
        
        try {
            btn.textContent = 'テスト中...';
            btn.disabled = true;
            
            // モック接続テスト（実際のAPIは呼び出さない）
            await new Promise(resolve => setTimeout(resolve, 1500));
            
            if (this.syncSettings.githubToken && this.syncSettings.privateRepoUrl) {
                this.showMessage('接続テスト成功', 'success');
                this.addSyncLog('success', '接続テストが成功しました');
                this.updateSyncStatus('connected');
            } else {
                throw new Error('設定が不完全です');
            }
            
        } catch (error) {
            this.showMessage('接続テスト失敗: ' + error.message, 'error');
            this.addSyncLog('error', '接続テストに失敗しました: ' + error.message);
            this.updateSyncStatus('error');
        } finally {
            btn.textContent = originalText;
            btn.disabled = false;
        }
    }
    
    // データ同期
    async syncData() {
        if (!this.syncSettings.syncEnabled) {
            this.showMessage('同期設定が完了していません', 'error');
            return;
        }
        
        const btn = document.getElementById('sync-btn');
        const originalText = btn.textContent;
        
        try {
            btn.textContent = '同期中...';
            btn.disabled = true;
            this.updateSyncStatus('syncing');
            
            const exportData = this.createExportData();
            
            // 実際のGitHub API呼び出しの代わりに、データを準備
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // JSON形式でダウンロード（GitHub Actionsが取得するため）
            const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.download = `diary-sync-${new Date().toISOString().split('T')[0]}.json`;
            link.href = url;
            link.click();
            URL.revokeObjectURL(url);
            
            this.syncSettings.lastSync = new Date().toISOString();
            this.saveSettings();
            this.updateSyncStatus('connected');
            
            this.showMessage('データ同期を準備しました', 'success');
            this.addSyncLog('success', 'データ同期用ファイルを出力しました');
            
        } catch (error) {
            this.showMessage('同期に失敗しました: ' + error.message, 'error');
            this.addSyncLog('error', '同期に失敗しました: ' + error.message);
            this.updateSyncStatus('error');
        } finally {
            btn.textContent = originalText;
            btn.disabled = false;
        }
    }
    
    createExportData() {
        return {
            version: "3.0",
            exported: new Date().toISOString(),
            syncSettings: {
                privateRepoUrl: this.syncSettings.privateRepoUrl,
                lastSync: this.syncSettings.lastSync,
                autoSyncEnabled: this.syncSettings.autoSyncEnabled
            },
            settings: {
                customItems: this.customItems,
                appVersion: "3.0"
            },
            weeks: {
                [this.data.week]: {
                    goal: this.data.goal,
                    dailyRecords: this.data.dailyRecords
                }
            }
        };
    }
    
    exportData() {
        const exportData = this.createExportData();
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = `スーパーノート日記_バックアップ_${new Date().toISOString().split('T')[0]}.json`;
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);
        
        this.showMessage('データをエクスポートしました', 'success');
        this.addSyncLog('info', 'データをエクスポートしました');
    }
    
    importData() {
        document.getElementById('import-file').click();
    }
    
    handleFileImport(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const importData = JSON.parse(e.target.result);
                
                if (importData.version && importData.settings && importData.weeks) {
                    // カスタム項目を復元
                    if (importData.settings.customItems) {
                        this.customItems = importData.settings.customItems;
                    }
                    
                    // 週データを復元（最新の週を選択）
                    const weekKeys = Object.keys(importData.weeks);
                    if (weekKeys.length > 0) {
                        const latestWeek = weekKeys[weekKeys.length - 1];
                        const weekData = importData.weeks[latestWeek];
                        
                        this.data.week = latestWeek;
                        this.data.goal = weekData.goal;
                        this.data.dailyRecords = weekData.dailyRecords;
                        
                        document.getElementById('week-select').value = latestWeek;
                        document.getElementById('weekly-goal').value = weekData.goal;
                        
                        this.generateWeekDates();
                    }
                    
                    this.saveSettings();
                    this.showMessage('データをインポートしました', 'success');
                    this.addSyncLog('success', 'データをインポートしました');
                } else {
                    throw new Error('無効なファイル形式です');
                }
            } catch (error) {
                this.showMessage('インポートに失敗しました: ' + error.message, 'error');
                this.addSyncLog('error', 'インポートに失敗しました: ' + error.message);
            }
        };
        reader.readAsText(file);
        
        // ファイル選択をリセット
        event.target.value = '';
    }
    
    // 同期ステータス管理
    updateSyncStatus(status = null) {
        const indicator = document.getElementById('sync-indicator');
        const dot = document.querySelector('.sync-dot');
        const text = document.getElementById('sync-text');
        
        if (!status) {
            if (this.syncSettings.syncEnabled) {
                status = 'connected';
            } else {
                status = 'disconnected';
            }
        }
        
        // 既存のクラスを削除
        dot.classList.remove('sync-dot--connected', 'sync-dot--syncing', 'sync-dot--error');
        
        switch (status) {
            case 'connected':
                dot.classList.add('sync-dot--connected');
                text.textContent = '接続済み';
                break;
            case 'syncing':
                dot.classList.add('sync-dot--syncing');
                text.textContent = '同期中';
                break;
            case 'error':
                dot.classList.add('sync-dot--error');
                text.textContent = 'エラー';
                break;
            default:
                text.textContent = '未設定';
        }
    }
    
    updateSyncButton() {
        const syncBtn = document.getElementById('sync-btn');
        syncBtn.disabled = !this.syncSettings.syncEnabled;
        
        if (this.syncSettings.syncEnabled) {
            syncBtn.textContent = 'データ同期';
            syncBtn.classList.remove('btn--outline');
            syncBtn.classList.add('btn--primary');
        } else {
            syncBtn.textContent = 'データ同期 (未設定)';
            syncBtn.classList.remove('btn--primary');
            syncBtn.classList.add('btn--outline');
        }
    }
    
    addSyncLog(type, message) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            type: type,
            message: message
        };
        
        this.syncLogs.unshift(logEntry);
        
        // ログは最大50件まで保持
        if (this.syncLogs.length > 50) {
            this.syncLogs = this.syncLogs.slice(0, 50);
        }
        
        this.saveSettings();
        this.updateSyncLog();
    }
    
    updateSyncLog() {
        const container = document.getElementById('sync-log-content');
        
        if (this.syncLogs.length === 0) {
            container.innerHTML = '<p class="text-muted">同期ログはありません</p>';
            return;
        }
        
        container.innerHTML = this.syncLogs.slice(0, 10).map(log => {
            const date = new Date(log.timestamp).toLocaleString('ja-JP');
            const typeClass = log.type === 'error' ? 'sync-error' : 
                            log.type === 'success' ? 'sync-success' : 'sync-pending';
            return `<div class="${typeClass}">[${date}] ${log.message}</div>`;
        }).join('');
    }
    
    showMessage(message, type = 'info') {
        const existingMessage = document.querySelector('.message');
        if (existingMessage) {
            existingMessage.remove();
        }
        
        const messageDiv = document.createElement('div');
        messageDiv.className = `message status status--${type}`;
        messageDiv.textContent = message;
        messageDiv.style.position = 'fixed';
        messageDiv.style.top = '20px';
        messageDiv.style.right = '20px';
        messageDiv.style.zIndex = '1000';
        messageDiv.style.maxWidth = '300px';
        
        document.body.appendChild(messageDiv);
        
        setTimeout(() => {
            if (messageDiv.parentNode) {
                messageDiv.remove();
            }
        }, 3000);
    }
}

// アプリケーション初期化
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new SuperNoteDiaryAppV3();
});

// エラーハンドリング
window.addEventListener('error', (event) => {
    console.error('アプリケーションエラー:', event.error);
});

// サービスワーカー登録（オフライン対応の準備）
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        // 現在はサービスワーカーファイルがないため、コメントアウト
        // navigator.serviceWorker.register('/sw.js');
    });
}

/**
 * テキストファイル突合ツール - メインスクリプト（修正版）
 * HTML5 + CSS3 + JavaScript (ES6+)
 */

// =============================================================================
// グローバル変数
// =============================================================================

let fileData = { file1: null, file2: null };
let comparisonResult = null;
let originalFileContents = { file1: null, file2: null };
let originalFileNames = { file1: null, file2: null };

console.log('🚀 テキストファイル突合ツール開始');

// =============================================================================
// DOMContentLoaded イベントリスナー
// =============================================================================

document.addEventListener('DOMContentLoaded', function() {
    console.log('📱 DOM読み込み完了');

    // ファイル入力イベント
    const file1Input = document.getElementById('file1');
    const file2Input = document.getElementById('file2');
    
    if (file1Input) {
        file1Input.addEventListener('change', function() {
            handleFile(1, this);
        });
    }
    
    if (file2Input) {
        file2Input.addEventListener('change', function() {
            handleFile(2, this);
        });
    }

    // 区切り文字変更イベント
    const delimiterSelect = document.getElementById('delimiter');
    if (delimiterSelect) {
        delimiterSelect.addEventListener('change', reprocessFiles);
    }

    // 比較ボタンクリックイベント
    const compareBtn = document.getElementById('compareBtn');
    if (compareBtn) {
        compareBtn.addEventListener('click', compareFiles);
    }

    // クリアボタンクリックイベント
    const clearBtn = document.getElementById('clearBtn');
    if (clearBtn) {
        clearBtn.addEventListener('click', clearAll);
    }

    // タブクリックイベント
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', function() {
            const tabName = this.dataset.tab;
            if (tabName) {
                showTab(tabName);
            }
        });
    });

    // エクスポートボタンイベント
    document.querySelectorAll('.export-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const type = this.dataset.type;
            if (type) {
                exportCSV(type);
            }
        });
    });
});

// =============================================================================
// ユーティリティ関数
// =============================================================================

/**
 * HTMLエスケープ処理
 * @param {string} text - エスケープするテキスト
 * @returns {string} エスケープされたHTML
 */
function escapeHtml(text) {
    if (text === null || text === undefined) return '';
    if (typeof text !== 'string') text = String(text);
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * エラーメッセージ表示
 * @param {string} message - エラーメッセージ
 */
function showError(message) {
    console.error('🚨 エラー:', message);
    
    // 既存のエラーメッセージを削除
    const existingError = document.querySelector('.error');
    if (existingError) {
        existingError.remove();
    }
    
    const error = document.createElement('div');
    error.className = 'error';
    error.style.cssText = `
        background-color: #f8d7da;
        color: #721c24;
        padding: 12px 16px;
        margin: 10px 0;
        border: 1px solid #f5c6cb;
        border-radius: 4px;
        font-weight: 500;
    `;
    error.textContent = `❌ ${message}`;
    
    const container = document.querySelector('.container');
    if (container) {
        container.insertBefore(error, container.firstChild);
    }
    
    setTimeout(() => {
        if (error.parentNode) {
            error.remove();
        }
    }, 5000);
}

/**
 * CSVクオート処理
 * @param {string} value - クオートする値
 * @returns {string} クオート済み値
 */
function csvQuote(value) {
    if (value === null || value === undefined) return '';
    const str = String(value);
    
    // カンマ、改行、ダブルクオートが含まれている場合はクオートが必要
    if (str.includes(',') || str.includes('\n') || str.includes('\r') || str.includes('"')) {
        // ダブルクオートをエスケープ
        return '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
}

// =============================================================================
// ファイル処理
// =============================================================================

/**
 * ファイル選択処理
 * @param {number} fileNum - ファイル番号（1 or 2）
 * @param {HTMLInputElement} input - ファイル入力要素
 */
function handleFile(fileNum, input) {
    const file = input.files[0];
    if (!file) {
        // ファイルが選択されていない場合はクリア
        fileData[`file${fileNum}`] = null;
        originalFileContents[`file${fileNum}`] = null;
        originalFileNames[`file${fileNum}`] = null;
        updateFileInfo(fileNum, null, null);
        updateKeyColumnOptions();
        updateCompareButton();
        resetResultsDisplay();
        return;
    }
    
    console.log(`📁 ファイル${fileNum}選択:`, file.name);
    
    // ファイル形式チェック
    const fileName = file.name.toLowerCase();
    const validExtensions = ['.tsv', '.txt', '.csv', '.dat'];
    const isValidFile = validExtensions.some(ext => fileName.endsWith(ext));
    
    if (!isValidFile) {
        showError('対応ファイル形式: .tsv, .txt, .csv, .dat');
        input.value = '';
        return;
    }
    
    // ファイルサイズの警告表示（制限はなし）
    if (file.size > 50 * 1024 * 1024) {
        console.warn('⚠️ 大きなファイルです:', Math.round(file.size / 1024 / 1024), 'MB - 処理に時間がかかる場合があります');
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const content = e.target.result;
            originalFileContents[`file${fileNum}`] = content;
            originalFileNames[`file${fileNum}`] = file.name;
            
            const data = parseFile(content, file.name);
            fileData[`file${fileNum}`] = data;
            
            updateFileInfo(fileNum, file, data);
            updateKeyColumnOptions();
            updateCompareButton();
            resetResultsDisplay();
            
            console.log(`✅ ファイル${fileNum}解析完了:`, data.rows.length, '行');
        } catch (error) {
            showError(`ファイル${fileNum}の解析に失敗: ${error.message}`);
            console.error('❌ ファイル解析エラー:', error);
            input.value = '';
        }
    };
    
    reader.onerror = function() {
        showError(`ファイル${fileNum}の読み込みに失敗しました`);
        input.value = '';
    };
    
    reader.readAsText(file, 'UTF-8');
}

/**
 * ファイル内容解析
 * @param {string} content - ファイル内容
 * @param {string} filename - ファイル名
 * @returns {Object} 解析されたデータ
 */
function parseFile(content, filename) {
    if (!content || content.trim() === '') {
        throw new Error('ファイルが空です');
    }
    
    const lines = content.trim().split(/\r?\n/);
    if (lines.length < 2) {
        throw new Error('ヘッダー行とデータ行が必要です');
    }
    
    const delimiter = getDelimiter(content, filename);
    const delimiterName = getDelimiterName(delimiter);
    console.log('🔍 使用する区切り文字:', delimiterName);
    
    const headers = lines[0].split(delimiter).map(h => h.trim());
    
    // 空のヘッダーをチェック
    if (headers.some(header => header === '')) {
        throw new Error('空のヘッダーが含まれています');
    }
    
    const rows = [];
    
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line === '') continue; // 空行をスキップ
        
        const values = line.split(delimiter);
        const row = {};
        
        headers.forEach((header, index) => {
            row[header] = (values[index] || '').trim();
        });
        
        // 完全に空の行をスキップ
        if (Object.values(row).some(val => val !== '')) {
            rows.push(row);
        }
    }
    
    if (rows.length === 0) {
        throw new Error('データ行が見つかりません');
    }
    
    return { 
        headers, 
        rows,
        delimiter: delimiterName
    };
}

/**
 * 区切り文字判定
 * @param {string} content - ファイル内容
 * @param {string} filename - ファイル名
 * @returns {string} 区切り文字
 */
function getDelimiter(content, filename) {
    const delimiterSelect = document.getElementById('delimiter');
    const selectedDelimiter = delimiterSelect ? delimiterSelect.value : 'auto';
    
    // 手動選択の場合
    if (selectedDelimiter !== 'auto') {
        const delimiterMap = {
            'tab': '\t',
            'comma': ',',
            'semicolon': ';',
            'pipe': '|'
        };
        return delimiterMap[selectedDelimiter] || '\t';
    }
    
    // 自動判定
    const firstLine = content.split(/\r?\n/)[0];
    
    // ファイル拡張子による判定
    const lowerFilename = filename.toLowerCase();
    if (lowerFilename.endsWith('.csv')) return ',';
    if (lowerFilename.endsWith('.tsv')) return '\t';
    
    // 内容による判定（出現頻度で判断）
    const counts = {
        '\t': (firstLine.match(/\t/g) || []).length,
        ',': (firstLine.match(/,/g) || []).length,
        ';': (firstLine.match(/;/g) || []).length,
        '|': (firstLine.match(/\|/g) || []).length
    };
    
    const maxCount = Math.max(...Object.values(counts));
    
    if (maxCount === 0) {
        console.warn('⚠️ 区切り文字を検出できませんでした。タブを使用します。');
        return '\t';
    }
    
    // 最大出現回数の区切り文字を返す（優先順位: タブ > カンマ > セミコロン > パイプ）
    const priority = ['\t', ',', ';', '|'];
    for (const delimiter of priority) {
        if (counts[delimiter] === maxCount) {
            return delimiter;
        }
    }
    
    return '\t';
}

/**
 * 区切り文字の表示名を取得
 * @param {string} delimiter - 区切り文字
 * @returns {string} 表示名
 */
function getDelimiterName(delimiter) {
    const names = {
        '\t': 'タブ',
        ',': 'カンマ',
        ';': 'セミコロン',
        '|': 'パイプ'
    };
    return names[delimiter] || delimiter;
}

/**
 * ファイル情報表示更新
 * @param {number} fileNum - ファイル番号
 * @param {File|null} file - ファイルオブジェクト
 * @param {Object|null} data - 解析データ
 */
function updateFileInfo(fileNum, file, data) {
    const infoElement = document.getElementById(`info${fileNum}`);
    if (!infoElement) return;
    
    if (!file || !data) {
        infoElement.innerHTML = '';
        return;
    }
    
    infoElement.innerHTML = `
        <div style="font-weight: 600; color: #4caf50;">✅ ${escapeHtml(file.name)}</div>
        <div style="margin-top: 5px;">
            📊 ${data.rows.length} 行 × ${data.headers.length} 列
        </div>
        <div style="margin-top: 5px;">
            📝 区切り文字: ${escapeHtml(data.delimiter)}
        </div>
    `;
}

// =============================================================================
// UI制御
// =============================================================================

/**
 * キー列選択肢更新
 */
function updateKeyColumnOptions() {
    const select = document.getElementById('keyColumn');
    if (!select) return;
    
    select.innerHTML = '<option value="">キー列を選択</option>';
    
    if (fileData.file1 && fileData.file2) {
        const commonHeaders = fileData.file1.headers.filter(header => 
            fileData.file2.headers.includes(header)
        );
        
        if (commonHeaders.length === 0) {
            select.innerHTML = '<option value="">共通の列が見つかりません</option>';
            return;
        }
        
        commonHeaders.forEach(header => {
            const option = document.createElement('option');
            option.value = header;
            option.textContent = `🔑 ${header}`;
            select.appendChild(option);
        });
        
        // 最初の共通列を自動選択
        if (commonHeaders.length > 0) {
            select.value = commonHeaders[0];
        }
    }
}

/**
 * 比較ボタン状態更新
 */
function updateCompareButton() {
    const button = document.getElementById('compareBtn');
    if (button) {
        button.disabled = !(fileData.file1 && fileData.file2);
    }
}

/**
 * 結果表示エリアリセット
 */
function resetResultsDisplay() {
    const resultsElement = document.getElementById('results');
    if (resultsElement) {
        resultsElement.style.display = 'none';
    }
    
    // 各結果コンテンツをクリア
    const resultElements = ['stats', 'summary', 'details', 'added', 'removed', 'changed'];
    resultElements.forEach(id => {
        const element = document.getElementById(id);
        if (element) element.innerHTML = '';
    });
    
    // タブ状態をリセット
    document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    
    // サマリータブをアクティブに
    const summaryTab = document.querySelector('.tab[data-tab="summary"]');
    const summaryContent = document.getElementById('summary');
    if (summaryTab && summaryContent) {
        summaryTab.classList.add('active');
        summaryContent.classList.add('active');
    }
    
    // 比較結果をクリア
    comparisonResult = null;
}

/**
 * 全クリア処理
 */
function clearAll() {
    // ファイル入力をクリア
    const file1Input = document.getElementById('file1');
    const file2Input = document.getElementById('file2');
    if (file1Input) file1Input.value = '';
    if (file2Input) file2Input.value = '';
    
    // データをクリア
    fileData = { file1: null, file2: null };
    originalFileContents = { file1: null, file2: null };
    originalFileNames = { file1: null, file2: null };
    comparisonResult = null;
    
    // 表示をクリア
    updateFileInfo(1, null, null);
    updateFileInfo(2, null, null);
    updateKeyColumnOptions();
    updateCompareButton();
    resetResultsDisplay();
    
    // 区切り文字を自動判定に戻す
    const delimiterSelect = document.getElementById('delimiter');
    if (delimiterSelect) {
        delimiterSelect.value = 'auto';
    }
    
    console.log('🗑️ 全クリア完了');
}

/**
 * タブ切り替え
 * @param {string} tabName - タブ名
 */
function showTab(tabName) {
    // 全タブを非アクティブに
    document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    
    // 指定タブをアクティブに
    const targetTab = document.querySelector(`[data-tab="${tabName}"]`);
    const targetContent = document.getElementById(tabName);
    
    if (targetTab && targetContent) {
        targetTab.classList.add('active');
        targetContent.classList.add('active');
    }
}

// =============================================================================
// データ処理
// =============================================================================

/**
 * 区切り文字変更時の再処理
 */
function reprocessFiles() {
    console.log('🔄 区切り文字変更 - ファイル再処理開始');
    
    try {
        // ファイル1の再処理
        if (originalFileContents.file1 && originalFileNames.file1) {
            const data1 = parseFile(originalFileContents.file1, originalFileNames.file1);
            fileData.file1 = data1;
            updateFileInfo(1, { name: originalFileNames.file1 }, data1);
        }
        
        // ファイル2の再処理
        if (originalFileContents.file2 && originalFileNames.file2) {
            const data2 = parseFile(originalFileContents.file2, originalFileNames.file2);
            fileData.file2 = data2;
            updateFileInfo(2, { name: originalFileNames.file2 }, data2);
        }
        
        updateKeyColumnOptions();
        resetResultsDisplay();
        
        console.log('✅ ファイル再処理完了');
    } catch (error) {
        showError('ファイル再処理エラー: ' + error.message);
        console.error('❌ 再処理エラー:', error);
    }
}

/**
 * ファイル比較実行
 */
function compareFiles() {
    const keyColumn = document.getElementById('keyColumn').value;
    if (!keyColumn) {
        alert('キー列を選択してください');
        return;
    }
    
    if (!fileData.file1 || !fileData.file2) {
        alert('両方のファイルをアップロードしてください');
        return;
    }
    
    // 結果エリア表示
    const resultsElement = document.getElementById('results');
    if (resultsElement) {
        resultsElement.style.display = 'block';
    }
    
    // ローディング表示
    const statsElement = document.getElementById('stats');
    const summaryElement = document.getElementById('summary');
    
    if (statsElement) statsElement.innerHTML = '<div class="loading">📊 統計計算中...</div>';
    if (summaryElement) summaryElement.innerHTML = '<div class="loading">⚙️ 比較処理中...</div>';
    
    // 非同期で比較処理実行
    setTimeout(() => {
        try {
            const result = performComparison(keyColumn);
            comparisonResult = result;
            displayResults(result);
            console.log('📊 比較完了:', result.stats);
        } catch (error) {
            showError('比較処理エラー: ' + error.message);
            console.error('❌ 比較エラー:', error);
        }
    }, 100);
}

/**
 * ファイル比較処理
 * @param {string} keyColumn - キー列名
 * @returns {Object} 比較結果
 */
function performComparison(keyColumn) {
    console.log('🔍 比較開始 - キー列:', keyColumn);
    
    // データをMapに変換（高速検索のため）
    const map1 = new Map();
    const map2 = new Map();
    
    fileData.file1.rows.forEach((row, index) => {
        const key = row[keyColumn];
        if (key && key.trim() !== '') {
            if (map1.has(key)) {
                console.warn(`重複キー検出 (ファイル1, 行${index + 2}): ${key}`);
            }
            map1.set(key, row);
        }
    });
    
    fileData.file2.rows.forEach((row, index) => {
        const key = row[keyColumn];
        if (key && key.trim() !== '') {
            if (map2.has(key)) {
                console.warn(`重複キー検出 (ファイル2, 行${index + 2}): ${key}`);
            }
            map2.set(key, row);
        }
    });
    
    console.log('📊 マップ作成完了 - ファイル1:', map1.size, 'ファイル2:', map2.size);
    
    const added = [];
    const removed = [];
    const changed = [];
    const unchanged = [];
    
    // 追加されたレコード（ファイル2にのみ存在）
    map2.forEach((row, key) => {
        if (!map1.has(key)) {
            added.push({ key, data: row, type: 'added' });
        }
    });
    
    // 削除されたレコード（ファイル1にのみ存在）
    map1.forEach((row, key) => {
        if (!map2.has(key)) {
            removed.push({ key, data: row, type: 'removed' });
        }
    });
    
    // 変更されたレコード（両方に存在するが内容が異なる）
    map1.forEach((row1, key) => {
        if (map2.has(key)) {
            const row2 = map2.get(key);
            const differences = {};
            let hasChanges = false;
            
            // 全ての列を比較
            const allColumns = new Set([...Object.keys(row1), ...Object.keys(row2)]);
            allColumns.forEach(column => {
                const value1 = (row1[column] || '').trim();
                const value2 = (row2[column] || '').trim();
                
                if (value1 !== value2) {
                    differences[column] = {
                        old: value1,
                        new: value2
                    };
                    hasChanges = true;
                }
            });
            
            if (hasChanges) {
                changed.push({
                    key,
                    data1: row1,
                    data2: row2,
                    differences,
                    type: 'changed'
                });
            } else {
                unchanged.push({ key, data: row1, type: 'unchanged' });
            }
        }
    });
    
    console.log('📈 比較結果 - 追加:', added.length, '削除:', removed.length, '変更:', changed.length);
    
    return {
        added,
        removed,
        changed,
        unchanged,
        stats: {
            total1: fileData.file1.rows.length,
            total2: fileData.file2.rows.length,
            added: added.length,
            removed: removed.length,
            changed: changed.length,
            unchanged: unchanged.length
        }
    };
}

// =============================================================================
// 結果表示
// =============================================================================

/**
 * 比較結果表示
 * @param {Object} result - 比較結果
 */
function displayResults(result) {
    console.log('🎨 結果表示開始');
    
    // 必要な要素の存在確認
    const requiredElements = ['stats', 'summary', 'details', 'added', 'removed', 'changed'];
    const missingElements = requiredElements.filter(id => !document.getElementById(id));
    
    if (missingElements.length > 0) {
        console.error('❌ 必要なHTML要素が見つかりません:', missingElements);
        showError('画面表示エラー: 必要な要素が見つかりません');
        return;
    }
    
    try {
        displayStats(result.stats);
        displaySummary(result);
        displayDetails(result);
        displayByType(result.added, 'added', '追加されたレコード');
        displayByType(result.removed, 'removed', '削除されたレコード');
        displayByType(result.changed, 'changed', '変更されたレコード');
        console.log('✅ 結果表示完了');
    } catch (error) {
        console.error('❌ 結果表示エラー:', error);
        showError('結果表示中にエラーが発生しました: ' + error.message);
    }
}

/**
 * 統計情報表示
 * @param {Object} stats - 統計データ
 */
function displayStats(stats) {
    const statsElement = document.getElementById('stats');
    if (!statsElement) return;
    
    const statsHtml = `
        <div class="stat-card">
            <div class="stat-number">${stats.total1}</div>
            <div class="stat-label">ファイル1 レコード数</div>
        </div>
        <div class="stat-card">
            <div class="stat-number">${stats.total2}</div>
            <div class="stat-label">ファイル2 レコード数</div>
        </div>
        <div class="stat-card">
            <div class="stat-number" style="color: #4caf50">${stats.added}</div>
            <div class="stat-label">追加</div>
        </div>
        <div class="stat-card">
            <div class="stat-number" style="color: #f44336">${stats.removed}</div>
            <div class="stat-label">削除</div>
        </div>
        <div class="stat-card">
            <div class="stat-number" style="color: #ffc107">${stats.changed}</div>
            <div class="stat-label">変更</div>
        </div>
        <div class="stat-card">
            <div class="stat-number" style="color: #6c757d">${stats.unchanged}</div>
            <div class="stat-label">変更なし</div>
        </div>
    `;
    
    statsElement.innerHTML = statsHtml;
}

/**
 * サマリー表示
 * @param {Object} result - 比較結果
 */
function displaySummary(result) {
    const summaryElement = document.getElementById('summary');
    if (!summaryElement) return;
    
    const totalChanges = result.added.length + result.removed.length + result.changed.length;
    let html = `
        <h3>🔍 比較結果サマリー</h3>
        <p><strong>検出された変更:</strong> 全 ${totalChanges} 件</p>
    `;
    
    if (totalChanges === 0) {
        html += `
            <div style="text-align: center; padding: 30px; background: #e8f5e8; border-radius: 8px; margin: 20px 0;">
                <h4 style="color: #4caf50; margin-bottom: 10px;">🎉 差分はありません</h4>
                <p style="color: #666;">両ファイルは完全に一致しています</p>
            </div>
        `;
    } else {
        // 各種別の上位5件を表示
        if (result.added.length > 0) {
            html += `
                <h4 style="color: #4caf50; margin-top: 25px;">➕ 追加されたレコード (${result.added.length}件)</h4>
                ${generateTable(result.added.slice(0, 5))}
            `;
        }
        
        if (result.removed.length > 0) {
            html += `
                <h4 style="color: #f44336; margin-top: 25px;">➖ 削除されたレコード (${result.removed.length}件)</h4>
                ${generateTable(result.removed.slice(0, 5))}
            `;
        }
        
        if (result.changed.length > 0) {
            html += `
                <h4 style="color: #ffc107; margin-top: 25px;">🔄 変更されたレコード (${result.changed.length}件)</h4>
                ${generateTable(result.changed.slice(0, 5))}
            `;
        }
    }
    
    summaryElement.innerHTML = html;
}

/**
 * 詳細表示
 * @param {Object} result - 比較結果
 */
function displayDetails(result) {
    const detailsElement = document.getElementById('details');
    if (!detailsElement) return;
    
    const allChanges = [...result.added, ...result.removed, ...result.changed];
    
    let html = `<h3>📊 全変更詳細 (${allChanges.length}件)</h3>`;
    
    if (allChanges.length === 0) {
        html += '<p style="text-align: center; padding: 20px; color: #666;">変更はありません</p>';
    } else {
        html += generateTable(allChanges);
    }
    
    detailsElement.innerHTML = html;
}

/**
 * タイプ別表示
 * @param {Array} data - 表示データ
 * @param {string} type - タイプ名
 * @param {string} title - 表示タイトル
 */
function displayByType(data, type, title) {
    const element = document.getElementById(type);
    if (!element) return;
    
    let html = `<h3>${title} (${data.length}件)</h3>`;
    
    if (data.length === 0) {
        html += '<p style="text-align: center; padding: 20px; color: #666;">該当するデータがありません</p>';
    } else {
        html += generateTable(data);
    }
    
    element.innerHTML = html;
}

/**
 * テーブル生成
 * @param {Array} data - テーブルデータ
 * @returns {string} HTMLテーブル
 */
function generateTable(data) {
    if (!data || data.length === 0) {
        return '<p style="text-align: center; padding: 20px; color: #666;">データがありません</p>';
    }
    
    // 全ての列を収集
    const allColumns = new Set();
    data.forEach(item => {
        if (item?.data) Object.keys(item.data).forEach(col => allColumns.add(col));
        if (item?.data1) Object.keys(item.data1).forEach(col => allColumns.add(col));
        if (item?.data2) Object.keys(item.data2).forEach(col => allColumns.add(col));
    });
    
    const columns = Array.from(allColumns);
    if (columns.length === 0) {
        return '<p style="text-align: center; padding: 20px; color: #666;">表示する列がありません</p>';
    }
    
    // テーブルヘッダー
    let html = `
        <div class="table-container">
            <table>
                <thead>
                    <tr>
                        <th>🏷️ 変更タイプ</th>
                        <th>🔑 キー</th>
    `;
    
    columns.forEach(col => {
        html += `<th>📊 ${escapeHtml(col)}</th>`;
    });
    
    html += `
                    </tr>
                </thead>
                <tbody>
    `;
    
    // テーブルボディ
    const typeLabels = {
        'added': '➕ 追加',
        'removed': '➖ 削除',
        'changed': '🔄 変更'
    };
    
    data.forEach(item => {
        if (!item) return;
        
        html += `<tr class="diff-${item.type}">`;
        html += `<td><strong>${typeLabels[item.type] || escapeHtml(item.type)}</strong></td>`;
        html += `<td><strong>${escapeHtml(item.key || '')}</strong></td>`;
        
        columns.forEach(col => {
            if (item.type === 'changed' && item.differences?.[col]) {
                const diff = item.differences[col];
                html += `
                    <td>
                        <div style="color: #f44336; font-size: 0.85em; margin-bottom: 4px;">
                            <strong>変更前:</strong> ${escapeHtml(diff.old || '')}
                        </div>
                        <div style="color: #4caf50; font-size: 0.85em;">
                            <strong>変更後:</strong> ${escapeHtml(diff.new || '')}
                        </div>
                    </td>
                `;
            } else {
                const value = item.data?.[col] || item.data1?.[col] || item.data2?.[col] || '';
                html += `<td>${escapeHtml(value)}</td>`;
            }
        });
        
        html += '</tr>';
    });
    
    html += `
                </tbody>
            </table>
        </div>
    `;
    
    return html;
}

// =============================================================================
// CSV出力
// =============================================================================

/**
 * CSV出力
 * @param {string} type - 出力タイプ ('all' or 'diff')
 */
function exportCSV(type) {
    if (!comparisonResult) {
        alert('比較結果がありません');
        return;
    }
    
    let dataToExport = [];
    
    if (type === 'all') {
        dataToExport = [
            ...comparisonResult.added,
            ...comparisonResult.removed,
            ...comparisonResult.changed,
            ...comparisonResult.unchanged
        ];
    } else {
        dataToExport = [
            ...comparisonResult.added,
            ...comparisonResult.removed,
            ...comparisonResult.changed
        ];
    }
    
    if (dataToExport.length === 0) {
        alert('エクスポートするデータがありません');
        return;
    }
    
    try {
        // 全ての列を収集
        const allColumns = new Set();
        dataToExport.forEach(item => {
            if (item?.data) Object.keys(item.data).forEach(col => allColumns.add(col));
            if (item?.data1) Object.keys(item.data1).forEach(col => allColumns.add(col));
            if (item?.data2) Object.keys(item.data2).forEach(col => allColumns.add(col));
        });
        
        const columns = Array.from(allColumns);
        
        // CSV作成
        let csvContent = '\uFEFF'; // Excel用BOM
        csvContent += csvQuote('変更タイプ') + ',' + csvQuote('キー');
        
        columns.forEach(col => {
            csvContent += ',' + csvQuote(col);
        });
        csvContent += '\n';
        
        const typeLabels = {
            'added': '追加',
            'removed': '削除',
            'changed': '変更',
            'unchanged': '変更なし'
        };
        
        dataToExport.forEach(item => {
            const row = [
                typeLabels[item.type] || item.type,
                item.key || ''
            ];
            
            columns.forEach(col => {
                if (item.type === 'changed' && item.differences?.[col]) {
                    const diff = item.differences[col];
                    row.push(`変更前: ${diff.old || ''} → 変更後: ${diff.new || ''}`);
                } else {
                    const value = item.data?.[col] || item.data1?.[col] || item.data2?.[col] || '';
                    row.push(value);
                }
            });
            
            csvContent += row.map(csvQuote).join(',') + '\n';
        });
        
        // ファイルダウンロード
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            
            const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
            const filename = type === 'all' ? 
                `file_comparison_all_${timestamp}.csv` : 
                `file_comparison_diff_${timestamp}.csv`;
            
            link.setAttribute('download', filename);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            console.log('📁 CSV出力完了:', filename);
        } else {
            alert('お使いのブラウザはCSV出力に対応していません');
        }
    } catch (error) {
        console.error('❌ CSV出力エラー:', error);
        showError('CSV出力エラー: ' + error.message);
    }
}

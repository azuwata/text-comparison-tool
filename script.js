/**
 * テキストファイル突合ツール - メインスクリプト
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
// ユーティリティ関数
// =============================================================================

/**
 * HTMLエスケープ処理
 * @param {string} text - エスケープするテキスト
 * @returns {string} エスケープされたHTML
 */
function escapeHtml(text) {
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
    const error = document.createElement('div');
    error.className = 'error';
    error.textContent = message;
    document.querySelector('.container').appendChild(error);
    
    setTimeout(() => error.remove(), 5000);
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
    if (!file) return;
    
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
            
            console.log(`✅ ファイル${fileNum}解析完了:`, data.rows.length, '行');
        } catch (error) {
            showError(`ファイル${fileNum}の解析に失敗: ${error.message}`);
            console.error('❌ ファイル解析エラー:', error);
        }
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
    const lines = content.trim().split('\n');
    if (lines.length < 2) {
        throw new Error('ヘッダー行とデータ行が必要です');
    }
    
    const delimiter = getDelimiter(content, filename);
    const delimiterName = getDelimiterName(delimiter);
    console.log('🔍 使用する区切り文字:', delimiterName);
    
    const headers = lines[0].split(delimiter).map(h => h.trim());
    const rows = [];
    
    for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(delimiter);
        const row = {};
        
        headers.forEach((header, index) => {
            row[header] = (values[index] || '').trim();
        });
        
        // 空行をスキップ
        if (Object.values(row).some(val => val !== '')) {
            rows.push(row);
        }
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
    const firstLine = content.split('\n')[0];
    
    // ファイル拡張子による判定
    if (filename.toLowerCase().endsWith('.csv')) return ',';
    if (filename.toLowerCase().endsWith('.tsv')) return '\t';
    
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
 * @param {File} file - ファイルオブジェクト
 * @param {Object} data - 解析データ
 */
function updateFileInfo(fileNum, file, data) {
    const infoElement = document.getElementById(`info${fileNum}`);
    infoElement.innerHTML = `
        <div style="font-weight: 600; color: #4caf50;">✅ ${file.name}</div>
        <div style="margin-top: 5px;">
            📊 ${data.rows.length} 行 × ${data.headers.length} 列
        </div>
        <div style="margin-top: 5px;">
            📝 区切り文字: ${data.delimiter}
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
        select.value = commonHeaders[0];
    }
}

/**
 * 比較ボタン状態更新
 */
function updateCompareButton() {
    const button = document.getElementById('compareBtn');
    button.disabled = !(fileData.file1 && fileData.file2);
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
        if (originalFileContents.file1) {
            const data1 = parseFile(originalFileContents.file1, originalFileNames.file1);
            fileData.file1 = data1;
            updateFileInfo(1, { name: originalFileNames.file1 }, data1);
        }
        
        // ファイル2の再処理
        if (originalFileContents.file2) {
            const data2 = parseFile(originalFileContents.file2, originalFileNames.file2);
            fileData.file2 = data2;
            updateFileInfo(2, { name: originalFileNames.file2 }, data2);
        }
        
        updateKeyColumnOptions();
        resetResultsDisplay();
        comparisonResult = null;

// @ts-check

(function() {
    const vscode = acquireVsCodeApi();

    // DOM elements
    const sourceText = document.getElementById('sourceText');
    const targetText = document.getElementById('targetText');
    const charCount = document.getElementById('charCount');
    const loadingSpinner = document.getElementById('loadingSpinner');
    const statusMessage = document.getElementById('statusMessage');
    const copyBtn = document.getElementById('copyBtn');
    const getSelectedTextBtn = document.getElementById('getSelectedTextBtn');
    const modalCloseBtn = document.getElementById('modalCloseBtn');

    // State
    let translationTimeout;
    const DEBOUNCE_DELAY = 500; // 500ms delay for real-time translation
    let lastTranslatedText = '';
    let isTranslating = false;

    // Initialize
    init();

    function init() {
        setupEventListeners();
        updateCharCount();
        
        // Request selected text from editor if available
        vscode.postMessage({ command: 'getSelectedText' });
    }

    function setupEventListeners() {
        // Real-time translation with debouncing
        sourceText.addEventListener('input', handleTextInput);
        sourceText.addEventListener('paste', handlePaste);
        
        // Copy functionality
        copyBtn.addEventListener('click', copyTranslation);
        
        // Get selected text from editor
        getSelectedTextBtn.addEventListener('click', getSelectedText);

        // Modal close button
        modalCloseBtn.addEventListener('click', closeModal);

        // Handle keyboard shortcuts (including ESC for modal)
        document.addEventListener('keydown', handleKeyboardShortcuts);

        // Handle messages from extension
        window.addEventListener('message', handleMessage);
    }

    function handleTextInput(event) {
        updateCharCount();
        debounceTranslation();
    }

    function handlePaste(event) {
        // Allow paste to complete, then update
        setTimeout(() => {
            updateCharCount();
            debounceTranslation();
        }, 0);
    }

    function updateCharCount() {
        const text = sourceText.value;
        const count = text.length;
        const maxLength = 5000;
        
        charCount.textContent = `${count} / ${maxLength}`;
        
        // Update character count styling
        charCount.classList.remove('warning', 'error');
        if (count > maxLength * 0.9) {
            charCount.classList.add('warning');
        }
        if (count >= maxLength) {
            charCount.classList.add('error');
        }
    }

    function debounceTranslation() {
        const text = sourceText.value.trim();
        
        // Clear existing timeout
        if (translationTimeout) {
            clearTimeout(translationTimeout);
        }

        // Don't translate if text is empty or hasn't changed
        if (!text || text === lastTranslatedText) {
            return;
        }

        // Don't start new translation if one is in progress
        if (isTranslating) {
            return;
        }

        // Set up new translation with debounce
        translationTimeout = setTimeout(() => {
            requestTranslation(text);
        }, DEBOUNCE_DELAY);
    }

    function requestTranslation(text) {
        if (!text.trim() || text === lastTranslatedText) {
            return;
        }

        lastTranslatedText = text;
        showTranslatingState();
        
        vscode.postMessage({
            command: 'translate',
            text: text,
            sourceLang: 'JA',
            targetLang: 'EN'
        });
    }

    function showTranslatingState() {
        isTranslating = true;
        loadingSpinner.classList.add('visible');
        targetText.classList.add('translating');
        setStatusMessage('翻訳中...', '');
    }

    function hideTranslatingState() {
        isTranslating = false;
        loadingSpinner.classList.remove('visible');
        targetText.classList.remove('translating');
    }

    function copyTranslation() {
        const translation = targetText.textContent;
        if (!translation || translation === targetText.getAttribute('data-placeholder')) {
            setStatusMessage('コピーする翻訳結果がありません', 'error');
            return;
        }

        navigator.clipboard.writeText(translation).then(() => {
            setStatusMessage('翻訳結果をクリップボードにコピーしました', 'success');
        }).catch(() => {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = translation;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            setStatusMessage('翻訳結果をクリップボードにコピーしました', 'success');
        });
    }

    function getSelectedText() {
        vscode.postMessage({ command: 'getSelectedText' });
        setStatusMessage('選択されたテキストを取得中...', '');
    }

    function handleKeyboardShortcuts(event) {
        // ESC key to close modal
        if (event.key === 'Escape') {
            event.preventDefault();
            closeModal();
            return;
        }

        // Ctrl/Cmd + Enter to translate immediately
        if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
            event.preventDefault();
            const text = sourceText.value.trim();
            if (text) {
                requestTranslation(text);
            }
        }
        
        // Ctrl/Cmd + K to clear all
        if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
            event.preventDefault();
            clearAll();
        }

        // Ctrl/Cmd + C when focus is on translation result
        if ((event.ctrlKey || event.metaKey) && event.key === 'c' && 
            document.activeElement === targetText) {
            event.preventDefault();
            copyTranslation();
        }
    }

    function closeModal() {
        setStatusMessage('モーダルを閉じています...', '');
        vscode.postMessage({ command: 'closeModal' });
    }

    function clearAll() {
        sourceText.value = '';
        targetText.textContent = '';
        lastTranslatedText = '';
        updateCharCount();
        setStatusMessage('', '');
        sourceText.focus();
    }

    function setStatusMessage(message, type = '') {
        statusMessage.textContent = message;
        statusMessage.className = 'status-message' + (type ? ' ' + type : '');
        
        if (message && type !== 'error') {
            setTimeout(() => {
                setStatusMessage('', '');
            }, 3000);
        }
    }

    function handleMessage(event) {
        const message = event.data;

        switch (message.command) {
            case 'translating':
                if (message.isTranslating) {
                    showTranslatingState();
                } else {
                    hideTranslatingState();
                }
                break;

            case 'translationResult':
                hideTranslatingState();
                targetText.textContent = message.translation;
                setStatusMessage('翻訳完了', 'success');
                break;

            case 'translationError':
                hideTranslatingState();
                setStatusMessage(`エラー: ${message.error}`, 'error');
                break;

            case 'selectedText':
                if (message.text) {
                    sourceText.value = message.text;
                    updateCharCount();
                    sourceText.focus();
                    setStatusMessage('選択されたテキストを取得しました', 'success');
                    
                    // Trigger translation for the selected text
                    debounceTranslation();
                } else {
                    setStatusMessage('選択されたテキストがありません', 'error');
                }
                break;
        }
    }

    // Focus on source text when the webview is loaded
    if (sourceText) {
        sourceText.focus();
    }
})();
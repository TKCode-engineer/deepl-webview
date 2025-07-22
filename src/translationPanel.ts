import * as vscode from 'vscode';
import { DeepLService } from './deepLService';

export class DeepLTranslationPanel {
    public static currentPanel: DeepLTranslationPanel | undefined;
    public static readonly viewType = 'deeplTranslation';

    private readonly _panel: vscode.WebviewPanel;
    private readonly _extensionUri: vscode.Uri;
    private _disposables: vscode.Disposable[] = [];
    private _deepLService: DeepLService;

    public static createOrShow(extensionUri: vscode.Uri) {
        console.log('🎨 Creating or showing modal translation panel...');

        // If we already have a panel, bring it to focus
        if (DeepLTranslationPanel.currentPanel) {
            console.log('📋 Existing panel found, bringing to focus');
            DeepLTranslationPanel.currentPanel._panel.reveal(vscode.ViewColumn.Active, false);
            return;
        }

        // Create modal-style panel in active column with focus
        console.log('🆕 Creating new modal webview panel');
        const panel = vscode.window.createWebviewPanel(
            DeepLTranslationPanel.viewType,
            'DeepL 翻訳',
            {
                viewColumn: vscode.ViewColumn.Active,
                preserveFocus: false // Take focus immediately
            },
            {
                enableScripts: true,
                retainContextWhenHidden: false, // Don't keep in background
                localResourceRoots: [
                    vscode.Uri.joinPath(extensionUri, 'media'),
                    vscode.Uri.joinPath(extensionUri, 'out')
                ]
            }
        );

        console.log('🎉 Modal webview panel created successfully');
        DeepLTranslationPanel.currentPanel = new DeepLTranslationPanel(panel, extensionUri);
        console.log('✅ Modal DeepLTranslationPanel instance created');
    }

    public static kill() {
        DeepLTranslationPanel.currentPanel?.dispose();
        DeepLTranslationPanel.currentPanel = undefined;
    }

    private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
        this._panel = panel;
        this._extensionUri = extensionUri;
        this._deepLService = new DeepLService();

        // Set the webview's initial html content
        this._update();

        // Modal-like behavior: Auto-focus management
        this._setupModalBehavior();

        // Listen for when the panel is disposed
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

        // Handle messages from the webview
        this._panel.webview.onDidReceiveMessage(
            message => {
                switch (message.command) {
                    case 'translate':
                        this._handleTranslate(message.text, message.sourceLang, message.targetLang);
                        return;
                    case 'getSelectedText':
                        this._sendSelectedText();
                        return;
                    case 'closeModal':
                        console.log('🚪 Closing modal via webview message');
                        this.dispose();
                        return;
                }
            },
            null,
            this._disposables
        );
    }

    private _setupModalBehavior() {
        // Auto-focus when switching between editors
        const onDidChangeActiveEditor = vscode.window.onDidChangeActiveTextEditor(editor => {
            if (editor && this._panel.visible) {
                // Small delay to ensure the editor change is complete
                setTimeout(() => {
                    this._panel.reveal(vscode.ViewColumn.Active, false);
                }, 100);
            }
        });
        this._disposables.push(onDidChangeActiveEditor);

        // Keep panel active and focused
        const onDidChangeViewState = this._panel.onDidChangeViewState(e => {
            if (e.webviewPanel.active && e.webviewPanel.visible) {
                console.log('🎯 Panel became active - maintaining modal focus');
            }
        });
        this._disposables.push(onDidChangeViewState);

        console.log('🎭 Modal behavior setup completed');
    }

    private async _handleTranslate(text: string, sourceLang: string = 'JA', targetLang: string = 'EN') {
        if (!text.trim()) {
            return;
        }

        try {
            this._panel.webview.postMessage({
                command: 'translating',
                isTranslating: true
            });

            const translation = await this._deepLService.translate(text, sourceLang, targetLang);
            
            this._panel.webview.postMessage({
                command: 'translationResult',
                translation: translation,
                isTranslating: false
            });
        } catch (error) {
            this._panel.webview.postMessage({
                command: 'translationError',
                error: error instanceof Error ? error.message : 'Translation failed',
                isTranslating: false
            });
        }
    }

    private _sendSelectedText() {
        const editor = vscode.window.activeTextEditor;
        if (editor && !editor.selection.isEmpty) {
            const selectedText = editor.document.getText(editor.selection);
            this._panel.webview.postMessage({
                command: 'selectedText',
                text: selectedText
            });
        }
    }

    public dispose() {
        DeepLTranslationPanel.currentPanel = undefined;

        // Clean up our resources
        this._panel.dispose();

        while (this._disposables.length) {
            const x = this._disposables.pop();
            if (x) {
                x.dispose();
            }
        }
    }

    private _update() {
        const webview = this._panel.webview;
        this._panel.webview.html = this._getHtmlForWebview(webview);
    }

    private _getHtmlForWebview(webview: vscode.Webview) {
        // Get the local path to main script run in the webview
        const scriptPathOnDisk = vscode.Uri.joinPath(this._extensionUri, 'media', 'main.js');
        const scriptUri = webview.asWebviewUri(scriptPathOnDisk);

        // Get the local path to css file
        const stylePathOnDisk = vscode.Uri.joinPath(this._extensionUri, 'media', 'main.css');
        const styleUri = webview.asWebviewUri(stylePathOnDisk);

        // Use a nonce to only allow specific scripts to be run
        const nonce = getNonce();

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource}; script-src 'nonce-${nonce}';">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link href="${styleUri}" rel="stylesheet">
    <title>DeepL Translation</title>
</head>
<body>
    <div class="container">
        <button id="modalCloseBtn" class="modal-close-btn" title="閉じる (ESC)">&times;</button>
        
        <div class="header">
            <h1>DeepL 翻訳</h1>
            <button id="getSelectedTextBtn" class="btn-secondary">選択テキストを取得</button>
        </div>
        
        <div class="translation-area">
            <div class="input-section">
                <div class="language-header">
                    <span class="language-label">日本語</span>
                    <span class="char-count" id="charCount">0 / 5000</span>
                </div>
                <textarea 
                    id="sourceText" 
                    placeholder="翻訳したいテキストを入力してください..."
                    maxlength="5000"
                ></textarea>
            </div>

            <div class="translation-divider">
                <div class="translation-arrow">→</div>
            </div>

            <div class="output-section">
                <div class="language-header">
                    <span class="language-label">English</span>
                    <div class="output-actions">
                        <button id="copyBtn" class="btn-action" title="コピー">📋</button>
                        <div class="loading-spinner" id="loadingSpinner"></div>
                    </div>
                </div>
                <div id="targetText" class="translation-output" data-placeholder="翻訳結果がここに表示されます..."></div>
            </div>
        </div>

        <div class="footer">
            <div class="status-message" id="statusMessage"></div>
        </div>
    </div>

    <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
    }
}

function getNonce() {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}
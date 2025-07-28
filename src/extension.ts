import * as vscode from 'vscode';
import { DeepLTranslationPanel } from './translationPanel';

export async function activate(context: vscode.ExtensionContext) {
    console.log('🚀 DeepL Webview extension is now active!');
    console.log('📁 Extension path:', context.extensionUri.fsPath);
    
    // Check API key configuration
    const config = vscode.workspace.getConfiguration('deeplWebview');
    const apiKey = config.get<string>('apiKey');
    console.log('🔑 API Key configured:', apiKey ? 'Yes' : 'No');
    
    // Show warning if API key is not configured
    if (!apiKey || apiKey.trim() === '') {
        const selection = await vscode.window.showWarningMessage(
            'DeepL APIキーが設定されていません。設定を開いて設定しますか？',
            '設定を開く',
            '後で設定する'
        );
        
        if (selection === '設定を開く') {
            vscode.commands.executeCommand('workbench.action.openSettings', 'deeplWebview.apiKey');
        }
    }

    // Register the translateInput command
    const disposable = vscode.commands.registerCommand('deepl-webview.translateInput', async () => {
        console.log('🎯 Command deepl-webview.translateInput triggered!');
        try {
            DeepLTranslationPanel.createOrShow(context.extensionUri);
            console.log('✅ Translation panel creation attempted');
        } catch (error) {
            console.error('❌ Error creating translation panel:', error);
            
            // Check if it's an API key error and provide helpful guidance
            const errorMessage = error instanceof Error ? error.message : String(error);
            if (errorMessage.includes('API key')) {
                const selection = await vscode.window.showErrorMessage(
                    'DeepL APIキーが未設定または無効です。',
                    '設定を開く'
                );
                if (selection === '設定を開く') {
                    vscode.commands.executeCommand('workbench.action.openSettings', 'deeplWebview.apiKey');
                }
            } else {
                vscode.window.showErrorMessage(`翻訳パネルの開くに失敗しました: ${errorMessage}`);
            }
        }
    });

    context.subscriptions.push(disposable);
    console.log('✅ DeepL extension activation completed');
}

export function deactivate() {}
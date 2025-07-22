import * as vscode from 'vscode';
import { DeepLTranslationPanel } from './translationPanel';

export function activate(context: vscode.ExtensionContext) {
    console.log('🚀 DeepL Webview extension is now active!');
    console.log('📁 Extension path:', context.extensionUri.fsPath);
    
    // Check API key configuration
    const config = vscode.workspace.getConfiguration('deeplWebview');
    const apiKey = config.get<string>('apiKey');
    console.log('🔑 API Key configured:', apiKey ? 'Yes' : 'No');

    // Register the translateInput command
    const disposable = vscode.commands.registerCommand('deepl-webview.translateInput', () => {
        console.log('🎯 Command deepl-webview.translateInput triggered!');
        try {
            DeepLTranslationPanel.createOrShow(context.extensionUri);
            console.log('✅ Translation panel creation attempted');
        } catch (error) {
            console.error('❌ Error creating translation panel:', error);
            vscode.window.showErrorMessage(`Failed to open translation panel: ${error}`);
        }
    });

    context.subscriptions.push(disposable);
    console.log('✅ DeepL extension activation completed');
}

export function deactivate() {}
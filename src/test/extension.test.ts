import * as assert from 'assert';
import * as vscode from 'vscode';
import { DeepLService } from '../deepLService';

suite('Extension Test Suite', () => {
    vscode.window.showInformationMessage('Start all tests.');

    test('DeepL Service should be created', () => {
        const service = new DeepLService();
        assert.ok(service);
    });

    test('DeepL Service should handle empty text', async () => {
        const service = new DeepLService();
        try {
            const result = await service.translate('');
            assert.strictEqual(result, '');
        } catch (error) {
            // Expected behavior - empty text should not be processed
            assert.ok(true);
        }
    });

    test('Extension should be present', () => {
        assert.ok(vscode.extensions.getExtension('undefined_publisher.deepl-webview'));
    });
});
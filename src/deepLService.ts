import * as vscode from 'vscode';
import axios from 'axios';

export interface DeepLTranslationResponse {
    translations: {
        text: string;
        detected_source_language: string;
    }[];
}

export class DeepLService {
    private readonly baseUrl = 'https://api-free.deepl.com/v2/translate';
    private apiKey: string | undefined;

    constructor() {
        this.loadApiKey();
    }

    private loadApiKey() {
        const config = vscode.workspace.getConfiguration('deeplWebview');
        this.apiKey = config.get<string>('apiKey');
    }

    async translate(text: string, sourceLang: string = 'JA', targetLang: string = 'EN'): Promise<string> {
        if (!this.apiKey) {
            throw new Error('DeepL API key is not configured. Please set "deeplWebview.apiKey" in VS Code settings.');
        }

        if (!text.trim()) {
            return '';
        }

        try {
            const params = new URLSearchParams();
            params.append('text', text);
            params.append('source_lang', sourceLang);
            params.append('target_lang', targetLang);
            params.append('auth_key', this.apiKey);

            const response = await axios.post<DeepLTranslationResponse>(
                this.baseUrl,
                params,
                {
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                    timeout: 10000 // 10 seconds timeout
                }
            );

            if (response.data.translations && response.data.translations.length > 0) {
                return response.data.translations[0].text;
            }

            throw new Error('No translation found in response');
        } catch (error) {
            if (axios.isAxiosError(error)) {
                if (error.response?.status === 403) {
                    throw new Error('Invalid DeepL API key. Please check your configuration.');
                } else if (error.response?.status === 456) {
                    throw new Error('DeepL API quota exceeded. Please check your usage.');
                } else if (error.code === 'ECONNABORTED') {
                    throw new Error('Translation request timed out. Please try again.');
                } else {
                    throw new Error(`Translation failed: ${error.response?.statusText || error.message}`);
                }
            }
            throw error;
        }
    }

    refreshApiKey() {
        this.loadApiKey();
    }
}
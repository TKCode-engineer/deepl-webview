import * as vscode from 'vscode';
import axios from 'axios';

interface CacheEntry {
    translation: string;
    timestamp: number;
}

interface RateLimitState {
    lastRequest: number;
    requestCount: number;
    resetTime: number;
}

export interface DeepLTranslationResponse {
    translations: {
        text: string;
        detected_source_language: string;
    }[];
}

export class DeepLService {
    private readonly baseUrl = 'https://api-free.deepl.com/v2/translate';
    private apiKey: string | undefined;
    private translationCache = new Map<string, CacheEntry>();
    private readonly CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours
    private readonly MAX_CACHE_SIZE = 1000;
    private rateLimit: RateLimitState = {
        lastRequest: 0,
        requestCount: 0,
        resetTime: 0
    };
    private readonly RATE_LIMIT_PER_MINUTE = 10;
    private readonly RETRY_ATTEMPTS = 3;
    private readonly RETRY_BASE_DELAY = 1000;

    constructor() {
        this.loadApiKey();
    }

    private loadApiKey() {
        const config = vscode.workspace.getConfiguration('deeplWebview');
        this.apiKey = config.get<string>('apiKey');
    }

    async translate(text: string, sourceLang?: string, targetLang?: string): Promise<string> {
        // Get language settings from VS Code configuration
        const config = vscode.workspace.getConfiguration('deeplWebview');
        sourceLang = sourceLang || config.get<string>('defaultSourceLanguage') || 'JA';
        targetLang = targetLang || config.get<string>('defaultTargetLanguage') || 'EN';
        if (!this.apiKey) {
            throw new Error('DeepL API key is not configured. Please set "deeplWebview.apiKey" in VS Code settings.');
        }

        if (!text.trim()) {
            return '';
        }

        // Check cache first
        const cacheKey = `${text}-${sourceLang}-${targetLang}`;
        const cached = this.getCachedTranslation(cacheKey);
        if (cached) {
            return cached;
        }

        // Check rate limit
        await this.checkRateLimit();

        // Attempt translation with retry logic
        return await this.translateWithRetry(text, sourceLang, targetLang, cacheKey);
    }

    private async translateWithRetry(text: string, sourceLang: string, targetLang: string, cacheKey: string, attempt: number = 1): Promise<string> {
        try {
            const params = new URLSearchParams();
            params.append('text', text);
            params.append('source_lang', sourceLang);
            params.append('target_lang', targetLang);
            params.append('auth_key', this.apiKey!);

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
                const translation = response.data.translations[0].text;
                this.cacheTranslation(cacheKey, translation);
                return translation;
            }

            throw new Error('No translation found in response');
        } catch (error) {
            if (axios.isAxiosError(error)) {
                if (error.response?.status === 403) {
                    throw new Error('Invalid DeepL API key. Please check your configuration.');
                } else if (error.response?.status === 456) {
                    // Rate limit exceeded - add delay before next request
                    this.updateRateLimit(true);
                    throw new Error('DeepL API quota exceeded. Please check your usage.');
                } else if (error.code === 'ECONNABORTED' || (error.response?.status && error.response.status >= 500)) {
                    // Retry on timeout or server errors
                    if (attempt < this.RETRY_ATTEMPTS) {
                        const delay = this.RETRY_BASE_DELAY * Math.pow(2, attempt - 1);
                        await new Promise(resolve => setTimeout(resolve, delay));
                        return this.translateWithRetry(text, sourceLang, targetLang, cacheKey, attempt + 1);
                    }
                    throw new Error('Translation request timed out after retries. Please try again.');
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

    private getCachedTranslation(cacheKey: string): string | null {
        const entry = this.translationCache.get(cacheKey);
        if (entry && Date.now() - entry.timestamp < this.CACHE_TTL) {
            return entry.translation;
        }
        if (entry) {
            this.translationCache.delete(cacheKey);
        }
        return null;
    }

    private cacheTranslation(cacheKey: string, translation: string): void {
        // Implement LRU eviction if cache is full
        if (this.translationCache.size >= this.MAX_CACHE_SIZE) {
            const firstKey = this.translationCache.keys().next().value;
            if (firstKey) {
                this.translationCache.delete(firstKey);
            }
        }
        
        this.translationCache.set(cacheKey, {
            translation,
            timestamp: Date.now()
        });
    }

    private async checkRateLimit(): Promise<void> {
        const now = Date.now();
        const oneMinute = 60 * 1000;
        
        // Reset counter if a minute has passed
        if (now - this.rateLimit.resetTime > oneMinute) {
            this.rateLimit.requestCount = 0;
            this.rateLimit.resetTime = now;
        }
        
        // Check if we've exceeded the rate limit
        if (this.rateLimit.requestCount >= this.RATE_LIMIT_PER_MINUTE) {
            const waitTime = oneMinute - (now - this.rateLimit.resetTime);
            await new Promise(resolve => setTimeout(resolve, waitTime));
            this.rateLimit.requestCount = 0;
            this.rateLimit.resetTime = Date.now();
        }
        
        this.rateLimit.requestCount++;
        this.rateLimit.lastRequest = now;
    }

    private updateRateLimit(quotaExceeded: boolean): void {
        if (quotaExceeded) {
            // Add additional delay when quota is exceeded
            this.rateLimit.resetTime = Date.now() + (5 * 60 * 1000); // 5 minute penalty
            this.rateLimit.requestCount = this.RATE_LIMIT_PER_MINUTE;
        }
    }

    clearCache(): void {
        this.translationCache.clear();
    }

    getCacheStats(): { size: number; maxSize: number } {
        return {
            size: this.translationCache.size,
            maxSize: this.MAX_CACHE_SIZE
        };
    }
}
# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 【MUST GLOBAL】Zenを活用した壁打ち (プロジェクトのCLAUDE.mdより優先)

### N位一体の開発原則
人間の**意思決定**、Claude Codeの**分析と実行**、Gemini MCP/Zen MCP/o3 MCPの**検証と助言**を組み合わせ、開発の質と速度を最大化する：
- **人間 (ユーザー)**：プロジェクトの目的・要件・最終ゴールを定義し、最終的な意思決定を行う**意思決定者**
  - 反面、具体的なコーディングや詳細な計画を立てる力、タスク管理能力ははありません。
- **Claude Code**：高度なタスク分解・高品質な実装・リファクタリング・ファイル操作・タスク管理を担う**実行者**
  - 指示に対して忠実に、順序立てて実行する能力はありますが、意志がなく、思い込みは勘違いも多く、思考力は少し劣ります。
- **Zen MCP**：プロセス全体の交通整理・適切な専門家への振り分け・タスク進捗管理を行う**指揮者**
  - 自身でコードを記述するのではなく、最適なAIエージェントに指示を出してコード生成を統括します。
  - ルーティングロジックが外れるとコスト増・レスポンス遅延・品質低下が生じるリスクがあり、モデル優先度設計を誤ると真価を発揮できません。

### 実践ガイド
- **ユーザーの要求を受けたら即座に壁打ち**を必ず実施
- 壁打ち結果は鵜呑みにしすぎず、1意見として判断
- 結果を元に聞き方を変えて多角的な意見を抽出するのも効果的

### 主要な活用場面
1. **実現不可能な依頼**: Claude Code では実現できない要求への対処 (例: `最新のニュース記事を取得して`)
2. **前提確認**: 要求の理解や実装方針の妥当性を確認 (例: `この実装方針で要件を満たせるか確認して`)
3. **技術調査**: 最新情報・エラー解決・ドキュメント検索 (例: `Rails 7.2の新機能を調べて`)
4. **設計立案**: 新機能の設計・アーキテクチャ構築 (例: `認証システムの設計案を作成して`)
5. **問題解決**: エラーや不具合の原因究明と対処 (例: `このTypeScriptエラーの解決方法を教えて`)
6. **コードレビュー**: 品質・保守性・パフォーマンスの評価 (例: `このコードの改善点は？`)
7. **計画立案**: タスク分解・実装方針の策定 (例: `ユーザー認証機能を実装するための計画を立てて`)
8. **技術選定**: ライブラリ・フレームワークの比較検討 (例: `状態管理にReduxとZustandどちらが適切か？`)
9. **リスク評価**: 実装前の潜在的問題の洗い出し (例: `この実装のセキュリティリスクは？`)
10. **設計検証**: 既存設計の妥当性確認・改善提案 (例: `現在のAPI設計の問題点と改善案は？`)

## Project Overview

This is a VS Code extension called "DeepL 翻訳モーダル" (DeepL Translation Modal) that provides Japanese-to-English translation using the DeepL API through a webview modal interface.

Key features:
- Keyboard shortcut: `Ctrl+Alt+T` to open translation modal
- Command: `deepl-webview.translateInput`
- Uses DeepL API for translation
- Displays results in a webview modal
- Requires API key configuration in VS Code settings

## Development Commands

### Build and Compilation
- `npm run compile` - Compile TypeScript to JavaScript
- `npm run watch` - Watch mode compilation
- `npm run vscode:prepublish` - Prepare for publishing (runs compile)

### Testing and Quality
- `npm run test` - Run tests (runs pretest first)
- `npm run pretest` - Compile and lint before testing
- `npm run lint` - Run ESLint on source code

### Extension Development
- Press `F5` in VS Code to launch extension development host
- Use `Ctrl+Shift+P` and search for "DeepL 翻訳（入力モーダル）" to test the command

## Configuration

The extension requires a DeepL API key to be configured in VS Code settings:

```json
{
  "deeplWebview.apiKey": "your-deepl-api-key-here"
}
```

## Architecture

This is a standard VS Code extension with:
- **Main extension file**: Expected at `src/extension.ts` (entry point: `./out/extension.js`)
- **Package manifest**: `package.json` defines commands, keybindings, and extension metadata
- **TypeScript compilation**: Source files in `src/` compiled to `out/`
- **Dependencies**: Uses `axios` for HTTP requests to DeepL API
- **Testing**: Uses `@vscode/test-electron` and Mocha for testing

### TypeScript Configuration
- Target: ES2022
- Module: Node16
- Strict type checking enabled
- Source maps enabled for debugging

### ESLint Configuration
- TypeScript ESLint parser and plugin
- Custom naming convention rules
- Semi-colon and curly brace enforcement

## File Structure

```
├── src/                    # TypeScript source files
│   └── test/              # Test files (*.test.ts pattern)
├── out/                   # Compiled JavaScript output
├── package.json           # Extension manifest and dependencies
├── tsconfig.json          # TypeScript compiler configuration
├── eslint.config.mjs      # ESLint configuration
└── .vscodeignore          # Files to ignore when packaging
```

## Extension Packaging

The project includes a pre-built VSIX file (`deepl-webview-0.0.1.vsix`) for distribution. To create a new package, use the `vsce package` command (requires `@vscode/vsce` to be installed).
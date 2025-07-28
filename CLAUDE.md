# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a VS Code extension called "DeepL 翻訳モーダル" (DeepL Translation Modal) that provides Japanese-to-English translation using the DeepL API through a webview modal interface.

Key features:
- Keyboard shortcut: `Ctrl+Alt+T` to open translation modal
- Command: `deepl-webview.translateInput`
- Uses DeepL API for translation
- Displays results in a webview modal
- Requires API key configuration in VS Code settings

## AI Collaboration Guide for This Project

### Core Development Philosophy
This VS Code extension project follows a collaborative development approach where humans provide strategic direction and AI assistants handle implementation details:

- **Human (Developer)**: Defines requirements, makes architectural decisions, and provides final approval on features
- **Claude Code**: Handles code implementation, refactoring, testing, and detailed technical analysis
- **AI Consultation (Zen MCP)**: Provides expert validation, best practices guidance, and cross-domain insights

### Effective Prompting Strategies for This Extension

#### 1. Feature Implementation
When requesting new features, provide context about the extension's architecture and existing patterns.

**Example - Adding Configuration Options:**
```
I want to add a new configuration option `deeplWebview.showSourceTextInResult` (boolean, default false). 
When true, the translation result should display the original Japanese text above the English translation.

Please outline the necessary changes in:
1. package.json (to add the configuration property)
2. src/extension.ts (to read the configuration and pass it to the webview)
3. The webview HTML generation logic (to conditionally render the source text)
```

#### 2. Webview Development
When working with webview components, always specify security requirements and VS Code best practices.

**Example - UI Improvements:**
```
The webview modal needs better styling to match VS Code's theme. Please:
1. Update the CSS to use VS Code CSS custom properties (var(--vscode-*))
2. Implement proper focus management for accessibility
3. Add loading states during API calls
4. Ensure the modal is responsive and works in small editor windows

Show how to properly implement CSP headers and secure resource loading.
```

#### 3. DeepL API Integration
When modifying API interactions, include error handling and user experience considerations.

**Example - API Enhancement:**
```
Enhance the DeepL API error handling to provide better user feedback:
1. Handle specific DeepL error codes (403, 456, 429, etc.)
2. Show actionable error messages (e.g., "API key invalid" vs "Rate limit exceeded")
3. Implement retry logic for transient failures
4. Add API usage tracking if possible

Reference the DeepL API documentation for proper error code handling.
```

#### 4. Debugging and Troubleshooting
Provide specific error messages, steps to reproduce, and relevant code snippets.

**Example - Debug Request:**
```
When I trigger the translation command, I get this error in the Debug Console:
"TypeError: Cannot read property 'apiKey' of undefined"

This happens in src/extension.ts around line 25. My settings.json has:
{
  "deeplWebview.apiKey": "valid-key-here"
}

Please help debug why the configuration reading is failing and suggest improvements 
to the error handling for missing configuration.
```

### Development Workflow Integration

#### Before Making Changes
- Use `npm run watch` to enable auto-compilation
- Test in Extension Development Host (F5)
- Always verify API key configuration in test environment

#### During Development
- Use TodoWrite tool to track implementation steps
- Test both success and error scenarios
- Verify webview security and CSP compliance

#### After Implementation
- Run `npm run lint` and fix any issues
- Test keyboard shortcuts and command palette integration
- Verify the extension works with different VS Code themes

### Path Conversion Note
When specifying file paths, convert Windows paths to WSL mount format:
- Windows: `C:\Users\user1\file.txt`
- WSL: `/mnt/c/Users/user1/file.txt`

## Architecture

This extension follows a dual-component architecture consisting of the **Extension Host** (Node.js environment) and the **Webview UI** (browser-like environment).

### 1. Extension Host (`src/extension.ts`)

The Extension Host runs in VS Code's Node.js environment and handles:

- **Entry Point**: The `activate` function in `src/extension.ts`, triggered by `activationEvents` in `package.json`
- **VS Code API Integration**: 
  - Command registration (`vscode.commands.registerCommand`)
  - Configuration reading (`vscode.workspace.getConfiguration`)
  - Notification display (`vscode.window.showInformationMessage`)
- **DeepL API Client**: Uses `axios` to send translation requests to DeepL's REST API
- **Webview Management**: Creates and manages the webview panel using `vscode.window.createWebviewPanel`

### 2. Webview UI

The modal translation interface runs in an isolated webview environment:

- **Technology**: Standard VS Code Webview (essentially an isolated `iframe`)
- **Content Generation**: HTML/CSS/JavaScript generated dynamically in the Extension Host
- **Communication**: Bidirectional messaging between Extension Host and Webview:
  - **Extension → Webview**: `webview.postMessage(data)`
  - **Webview → Extension**: `vscode.postMessage(data)` via `acquireVsCodeApi()`
- **Security**: 
  - Content Security Policy (CSP) restricts resource loading and script execution
  - All local resources must use `panel.webview.asWebviewUri()` for secure loading
  - No direct access to Node.js APIs or file system

### Communication Protocol

```typescript
// Extension Host → Webview
interface ToWebviewMessage {
  type: 'translation-result' | 'error' | 'loading';
  data: string | ErrorInfo;
}

// Webview → Extension Host  
interface ToExtensionMessage {
  type: 'translate-request' | 'close-modal';
  text?: string;
}
```

### Key Dependencies

- **`@vscode/test-electron`**: Integration testing in VS Code-like environment
- **`axios`**: HTTP client for DeepL API requests
- **`typescript`**: Primary development language
- **`eslint`**: Code quality and style enforcement

### Build Configuration

#### TypeScript Configuration
- Target: ES2022 (Node.js 16+ compatible)
- Module: Node16 (VS Code extension requirement)
- Strict type checking enabled
- Source maps enabled for debugging

#### ESLint Configuration
- TypeScript ESLint parser and plugin
- Custom naming convention rules
- Semi-colon and curly brace enforcement

## Development Workflow & Debugging

### Complete Development Cycle

A typical development cycle for this extension follows these steps:

1. **Start Auto-Compilation**: Run `npm run watch` in your terminal. This automatically recompiles TypeScript files in `src/` to JavaScript in `out/` whenever you save a file.

2. **Launch Extension Host**: Press `F5` in VS Code. This opens a new "[Extension Development Host]" window with your extension loaded.

3. **Test the Feature**: In the new window:
   - Use `Ctrl+Shift+P` and search for "DeepL 翻訳（入力モーダル）"
   - Or use the keyboard shortcut `Ctrl+Alt+T`
   - Enter Japanese text and verify translation functionality

4. **Debug Issues**:
   - **Extension Code**: Set breakpoints directly in `.ts` files in the `src/` directory
   - **Console Logs**: Use `console.log()` in `src/extension.ts` - output appears in the "Debug Console" of your main VS Code window
   - **Webview Code**: Open Developer Tools for the webview using `Developer: Open Webview Developer Tools` command

### Development Commands

#### Build and Compilation
- `npm run compile` - Compile TypeScript to JavaScript
- `npm run watch` - Watch mode compilation (recommended during development)
- `npm run vscode:prepublish` - Prepare for publishing (runs compile)

#### Testing and Quality
- `npm run test` - Run tests (runs pretest first)
- `npm run pretest` - Compile and lint before testing
- `npm run lint` - Run ESLint on source code

#### Common Debugging Scenarios

**API Key Issues:**
- Check if API key is set: Open VS Code settings (Ctrl+,) and search for "deepl"
- Verify key format: DeepL API keys end with ":fx" (free) or ":pro" (paid)
- Test key validity: Make a simple API call outside the extension

**Webview Not Loading:**
- Check CSP headers in the generated HTML
- Verify all resource URIs use `panel.webview.asWebviewUri()`
- Look for errors in the Webview Developer Tools console

**Command Not Found:**
- Verify command registration in `package.json` under `contributes.commands`
- Check activation events in `package.json`
- Ensure command is properly registered in `src/extension.ts`

## Configuration

The extension requires a DeepL API key to be configured in VS Code settings:

```json
{
  "deeplWebview.apiKey": "your-deepl-api-key-here"
}
```

## Project-Specific Implementation Details

### DeepL API Integration

#### API Key Management
- **Configuration**: API key stored in VS Code settings under `deeplWebview.apiKey`
- **Validation**: Keys must end with `:fx` (free tier) or `:pro` (paid tier)
- **Security**: Never log or expose API keys in error messages or debug output

#### Error Handling Strategy
```typescript
// Common DeepL API error codes to handle:
// 400: Bad request (invalid parameters)
// 403: Forbidden (invalid API key)
// 404: Not found (invalid endpoint)
// 413: Request entity too large (text too long)
// 429: Too many requests (rate limit exceeded)
// 456: Quota exceeded (monthly limit reached)
// 503: Resource currently unavailable (temporary)
```

#### Rate Limiting & Best Practices
- Implement exponential backoff for rate limit errors (429)
- Consider adding request debouncing for user input
- Cache translation results for repeated requests
- Respect API usage limits based on subscription tier

### Webview Security & Best Practices

#### Content Security Policy (CSP)
```html
<meta http-equiv="Content-Security-Policy" 
      content="default-src 'none'; 
               style-src 'unsafe-inline' vscode-resource:; 
               script-src 'unsafe-inline' vscode-resource:;">
```

#### Resource Loading
- All local resources (CSS, JS, images) must use `panel.webview.asWebviewUri()`
- Use VS Code theme CSS variables for consistent styling: `var(--vscode-editor-background)`
- Implement proper focus management for accessibility

#### Message Passing Best Practices
- Always validate message types and data structure
- Implement timeout handling for async operations
- Use TypeScript interfaces for message contracts
- Handle webview disposal gracefully

### Future Enhancement Opportunities

#### UI/UX Improvements
- **VS Code UI Toolkit**: Consider migrating to `@vscode/webview-ui-toolkit` for consistent native components
- **Theme Integration**: Full support for VS Code themes including high contrast
- **Keyboard Navigation**: Complete keyboard accessibility for all UI elements

#### Feature Enhancements
- **Language Detection**: Auto-detect source language instead of assuming Japanese
- **Translation History**: Store and recall recent translations
- **Batch Translation**: Support for translating multiple text segments
- **Custom Shortcuts**: User-configurable keyboard shortcuts

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

# important-instruction-reminders
Do what has been asked; nothing more, nothing less.
NEVER create files unless they're absolutely necessary for achieving your goal.
ALWAYS prefer editing an existing file to creating a new one.
NEVER proactively create documentation files (*.md) or README files. Only create documentation files if explicitly requested by the User.
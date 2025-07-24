import { AnalysisData } from './types';

export class WebviewContent {
    static getLoadingContent(): string {
        return `<!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
                body {
                    font-family: var(--vscode-font-family);
                    padding: 20px;
                    color: var(--vscode-foreground);
                    background: var(--vscode-editor-background);
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    height: 100vh;
                    margin: 0;
                }
                
                .loading-container {
                    text-align: center;
                }
                
                .spinner {
                    border: 3px solid var(--vscode-panel-border);
                    border-radius: 50%;
                    border-top: 3px solid var(--vscode-focusBorder);
                    width: 40px;
                    height: 40px;
                    animation: spin 1s linear infinite;
                    margin: 0 auto 20px;
                }
                
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
                
                h2 {
                    color: var(--vscode-foreground);
                    margin: 10px 0;
                }
                
                .status {
                    color: var(--vscode-descriptionForeground);
                    font-size: 14px;
                }
            </style>
        </head>
        <body>
            <div class="loading-container">
                <div class="spinner"></div>
                <h2>Analyzing with Claude...</h2>
                <p class="status">Please wait while Claude analyzes your git changes</p>
            </div>
        </body>
        </html>`;
    }

    static getRawResponseContent(analysis: AnalysisData, iconUri: string): string {
        const responseText = analysis?.response || 'No response';
        const timestamp = analysis?.timestamp
            ? new Date(analysis.timestamp).toLocaleString()
            : new Date().toLocaleString();
        const diffLength = analysis?.diffLength || 0;

        const htmlContent = this.parseMarkdown(responseText);

        return `<!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
                body {
                    font-family: var(--vscode-font-family);
                    padding: 20px;
                    color: var(--vscode-foreground);
                    background: var(--vscode-editor-background);
                }
                .header {
                    margin-bottom: 24px;
                    padding-bottom: 16px;
                    border-bottom: 2px solid var(--vscode-panel-border);
                }
                
                .title-section {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    margin-bottom: 12px;
                }
                
                .title-section .icon {
                    font-size: 32px;
                    line-height: 1;
                }
                
                .title-section h1 {
                    flex: 0 0 auto;
                    margin: 0;
                    font-size: 28px;
                    font-weight: 600;
                    background: linear-gradient(to right, var(--vscode-foreground), var(--vscode-textLink-foreground));
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    background-clip: text;
                }
                
                .powered-by {
                    font-size: 12px;
                    color: var(--vscode-descriptionForeground);
                    font-style: italic;
                    margin-left: auto;
                    padding: 4px 8px;
                    background: var(--vscode-badge-background);
                    border-radius: 12px;
                }
                
                .info {
                    display: flex;
                    gap: 20px;
                    font-size: 13px;
                    color: var(--vscode-descriptionForeground);
                }
                
                .info-item {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                }
                
                .info-icon {
                    font-size: 14px;
                }
                .response-container h1 {
                    color: var(--vscode-foreground);
                    font-size: 24px;
                    margin: 20px 0 10px 0;
                    padding-bottom: 5px;
                    border-bottom: 1px solid var(--vscode-panel-border);
                }

                .response-container h2 {
                    color: var(--vscode-foreground);
                    font-size: 20px;
                    margin: 18px 0 8px 0;
                }
                
                .response-container h3 {
                    color: var(--vscode-foreground);
                    font-size: 16px;
                    margin: 16px 0 6px 0;
                }
                
                .response-container p {
                    margin: 10px 0;
                    line-height: 1.5;
                }
                
                .response-container ul, .response-container ol {
                    margin: 10px 0;
                    padding-left: 30px;
                }
                
                .response-container li {
                    margin: 5px 0;
                    line-height: 1.5;
                }

                .response-container code {
                    background: var(--vscode-textBlockQuote-background);
                    padding: 2px 4px;
                    border-radius: 3px;
                    font-family: var(--vscode-editor-font-family);
                    font-size: 0.9em;
                }

                .response-container pre code {
                    background: none;
                    padding: 0;
                }
                
                .response-container strong {
                    font-weight: 600;
                    color: var(--vscode-foreground);
                }
                
                .response-container em {
                    font-style: italic;
                }
                
                .response-container blockquote {
                    border-left: 3px solid var(--vscode-panel-border);
                    margin: 10px 0;
                    padding-left: 15px;
                    color: var(--vscode-descriptionForeground);
                }
                
                .actions {
                    margin-top: 20px;
                    display: flex;
                    gap: 10px;
                }
                
                button {
                    padding: 8px 16px;
                    background: var(--vscode-button-background);
                    color: var(--vscode-button-foreground);
                    border: none;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 14px;
                }
                
                button:hover {
                    background: var(--vscode-button-hoverBackground);
                }
                
                .header-icon {
                    width: 32px;
                    height: 32px;
                    filter: brightness(0.4) contrast(1.2);
                    opacity: 0.8;
                }
            </style>
        </head>
        <body>
            <div class="header">
                <div class="title-section">
                    <img src="${iconUri}" alt="Git Diff Icon" class="header-icon">
                    <h1>Git Diff</h1>
                    <span class="powered-by">Powered by Claude</span>
                </div>
                <div class="info">
                    <div class="info-item">
                        <span class="info-icon">📅</span>
                        <span>${timestamp}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-icon">📊</span>
                        <span>${diffLength.toLocaleString()} characters analyzed</span>
                    </div>
                </div>
            </div>
            
            <div class="response-container" id="markdown-content">
                ${htmlContent}
            </div>
            
            <script>
                const vscode = acquireVsCodeApi();

                // Make file paths clickable
                document.addEventListener('DOMContentLoaded', () => {
                    document.querySelectorAll('code').forEach(codeEl => {
                        const text = codeEl.textContent;
                        // Match file paths (e.g., src/file.ts, path/to/file.js)
                        if (text && /^[\w-/]+\.(ts|js|tsx|jsx|css|html|json|md)$/.test(text)) {
                            codeEl.style.cursor = 'pointer';
                            codeEl.style.textDecoration = 'underline';
                            codeEl.style.color = 'var(--vscode-textLink-foreground)';
                            codeEl.addEventListener('click', () => {
                                vscode.postMessage({ command: 'openFile', file: text });
                            });
                        }
                    });
                });
                
            </script>
        </body>
        </html>`;
    }

    static getErrorContent(error: any): string {
        return `<!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
                body {
                    font-family: var(--vscode-font-family);
                    padding: 40px;
                    color: var(--vscode-foreground);
                    background: var(--vscode-editor-background);
                }
                
                .error-container {
                    max-width: 600px;
                    margin: 0 auto;
                }
                
                .error-icon {
                    font-size: 48px;
                    color: var(--vscode-errorForeground);
                    text-align: center;
                    margin-bottom: 20px;
                }
                
                h2 {
                    color: var(--vscode-errorForeground);
                    text-align: center;
                    margin-bottom: 20px;
                }
                
                .error-message {
                    background: var(--vscode-textBlockQuote-background);
                    border: 1px solid var(--vscode-panel-border);
                    border-radius: 8px;
                    padding: 20px;
                    margin-bottom: 20px;
                    font-family: monospace;
                    font-size: 14px;
                    word-wrap: break-word;
                }
                
                .actions {
                    text-align: center;
                }
                
                button {
                    padding: 8px 16px;
                    background: var(--vscode-button-background);
                    color: var(--vscode-button-foreground);
                    border: none;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 14px;
                    margin: 0 5px;
                }
                
                button:hover {
                    background: var(--vscode-button-hoverBackground);
                }
            </style>
        </head>
        <body>
            <div class="error-container">
                <div class="error-icon">⚠️</div>
                <h2>Analysis Failed</h2>
                <div class="error-message">${error.message || 'An unknown error occurred'}</div>
                <div class="actions">
                    <button onclick="refresh()">Try Again</button>
                </div>
            </div>
            
            <script>
                const vscode = acquireVsCodeApi();
                function refresh() {
                    vscode.postMessage({ command: 'refresh' });
                }
            </script>
        </body>
        </html>`;
    }

    private static parseMarkdown(markdown: string): string {
        let html = markdown;

        // Escape HTML
        html = html.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

        // Headers (do these before other replacements)
        html = html.replace(/^#### (.+)$/gm, '<h4>$1</h4>');
        html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
        html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
        html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');

        // Code blocks (before other inline formatting)
        html = html.replace(/```([\s\S]*?)```/g, (_match, code) => {
            return '<pre><code>' + code.trim() + '</code></pre>';
        });

        // Inline code (before bold/italic to avoid conflicts)
        html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

        // Bold and Italic (with word boundaries for better matching)
        html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
        html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
        html = html.replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '<em>$1</em>');

        // Improved list handling with proper nesting
        const lines = html.split('\n');
        const processedLines = [];
        let i = 0;

        while (i < lines.length) {
            const line = lines[i];

            // Check if this line starts a list
            if (line.match(/^\s*[-*+]\s+/)) {
                const listItems = [];
                const currentIndent = (line.match(/^(\s*)/) || ['', ''])[1].length;

                // Collect all consecutive list items at the same level
                while (i < lines.length) {
                    const currentLine = lines[i];
                    const listMatch = currentLine.match(/^(\s*)[-*+]\s+(.+)/);

                    if (!listMatch) {
                        break;
                    }

                    const indent = listMatch[1].length;
                    if (indent !== currentIndent) {
                        break;
                    }

                    listItems.push(`<li>${listMatch[2]}</li>`);
                    i++;
                }

                // Wrap list items in ul
                if (listItems.length > 0) {
                    processedLines.push('<ul>' + listItems.join('') + '</ul>');
                }
            } else {
                processedLines.push(line);
                i++;
            }
        }

        html = processedLines.join('\n');

        // Paragraphs - improved handling
        const blocks = html.split(/\n\n+/);
        html = blocks
            .map(block => {
                block = block.trim();

                // Don't wrap if it's already a block element
                if (block.match(/^<(h[1-6]|ul|ol|pre|blockquote|div|p)/)) {
                    return block;
                }

                // Don't wrap empty blocks
                if (block === '') {
                    return '';
                }

                // For lines that aren't in lists or other blocks, wrap in paragraph
                // but preserve line breaks
                const lines = block.split('\n');
                if (lines.length === 1) {
                    return '<p>' + block + '</p>';
                } else {
                    // Multiple lines - check if they should be separate paragraphs
                    return lines.map(line => (line.trim() ? '<p>' + line + '</p>' : '')).join('\n');
                }
            })
            .filter(block => block !== '')
            .join('\n\n');

        return html;
    }
}

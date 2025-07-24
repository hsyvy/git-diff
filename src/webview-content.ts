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
                    padding: 24px;
                    color: var(--vscode-foreground);
                    background: var(--vscode-editor-background);
                    max-width: 1200px;
                    margin: 0 auto;
                }
                
                /* Special section styling */
                .critical-section {
                    border-left-color: var(--vscode-editorError-foreground) !important;
                }
                
                .warning-section {
                    border-left-color: var(--vscode-editorWarning-foreground) !important;
                }
                .header {
                    margin-bottom: 32px;
                    padding: 24px;
                    border: 2px solid var(--vscode-panel-border);
                    border-radius: 12px;
                    background: linear-gradient(135deg, 
                        rgba(var(--vscode-focusBorder), 0.03) 0%, 
                        transparent 100%);
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
                /* Section cards */
                .section-card {
                    border: 2px solid var(--vscode-panel-border);
                    border-radius: 12px;
                    padding: 24px;
                    margin-bottom: 24px;
                    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
                    transition: all 0.2s ease;
                }
                
                .section-card:hover {
                    border-color: var(--vscode-focusBorder);
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
                }
                
                .section-card h2 {
                    margin-top: 0;
                    padding-bottom: 16px;
                    margin-bottom: 20px;
                    border-bottom: 2px solid var(--vscode-panel-border);
                    color: var(--vscode-titleBar-activeForeground);
                    font-size: 22px;
                    font-weight: 600;
                    letter-spacing: -0.02em;
                }
                
                /* Subsection styling */
                .subsection {
                    border: 1px solid var(--vscode-widget-border);
                    border-left: 4px solid var(--vscode-widget-border);
                    border-radius: 6px;
                    padding: 16px 20px;
                    margin: 16px 0;
                    transition: border-color 0.2s ease;
                }
                
                .subsection:hover {
                    border-left-color: var(--vscode-focusBorder);
                }
                
                .subsection h3 {
                    margin-top: 0;
                    margin-bottom: 12px;
                    font-size: 16px;
                    font-weight: 500;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }
                
                .subsection h3 .subsection-icon {
                    flex-shrink: 0;
                }
                
                .subsection-icon {
                    font-size: 20px;
                    opacity: 0.8;
                }
                
                .response-container h1 {
                    color: var(--vscode-foreground);
                    font-size: 26px;
                    margin: 36px 0 16px 0;
                    padding-bottom: 12px;
                    border-bottom: 2px solid var(--vscode-panel-border);
                    font-weight: 600;
                    letter-spacing: -0.03em;
                }

                .response-container h2 {
                    color: var(--vscode-foreground);
                    font-size: 20px;
                    margin: 24px 0 12px 0;
                    font-weight: 600;
                }
                
                .response-container h3 {
                    color: var(--vscode-foreground);
                    font-size: 16px;
                    margin: 16px 0 8px 0;
                    font-weight: 500;
                }
                
                .response-container p {
                    margin: 14px 0;
                    line-height: 1.7;
                    color: var(--vscode-editor-foreground);
                }
                
                .response-container ul, .response-container ol {
                    margin: 12px 0;
                    padding-left: 24px;
                }
                
                .response-container li {
                    margin: 8px 0;
                    line-height: 1.6;
                    color: var(--vscode-editor-foreground);
                }

                .response-container code {
                    background: var(--vscode-textCodeBlock-background);
                    padding: 2px 6px;
                    border-radius: 4px;
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
                    background: linear-gradient(to bottom, transparent 60%, var(--vscode-textLink-foreground) 0);
                    background-size: 100% 0.3em;
                    background-repeat: no-repeat;
                    background-position: 0 100%;
                    padding: 0 2px;
                }
                
                .response-container em {
                    font-style: italic;
                }
                
                .response-container blockquote {
                    border-left: 4px solid var(--vscode-textLink-foreground);
                    margin: 16px 0;
                    padding: 12px 20px;
                    border-radius: 4px;
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

        // Wrap sections in cards
        html = this.wrapSectionsInCards(html);

        return html;
    }

    private static wrapSectionsInCards(html: string): string {
        // Split by h2 headers to create section cards
        const sections = html.split(/(<h2>.*?<\/h2>)/g);
        let wrappedHtml = '';

        for (let i = 0; i < sections.length; i++) {
            const section = sections[i];

            if (section.match(/<h2>/)) {
                // Start a new section card
                if (i > 0) {
                    wrappedHtml += '</div>'; // Close previous section
                }
                wrappedHtml += '<div class="section-card">' + section;
            } else if (section.trim()) {
                // Check for Issues Detected section to add subsections
                if (wrappedHtml.includes('>Issues Detected<')) {
                    // Wrap issue categories in subsections
                    let processedSection = section;

                    // Security Issues - extract existing emoji
                    processedSection = processedSection.replace(
                        /<h3>(🔒\s*)?Security Issues<\/h3>([\s\S]*?)(?=<h3>|$)/g,
                        '<div class="subsection"><h3><span class="subsection-icon">🔒</span>Security Issues</h3>$2</div>'
                    );

                    // Integration Issues - extract existing emoji
                    processedSection = processedSection.replace(
                        /<h3>(🔌\s*)?Integration Issues<\/h3>([\s\S]*?)(?=<h3>|$)/g,
                        '<div class="subsection"><h3><span class="subsection-icon">🔌</span>Integration Issues</h3>$2</div>'
                    );

                    // Testing Gaps - extract existing emoji
                    processedSection = processedSection.replace(
                        /<h3>(🧪\s*)?Testing Gaps<\/h3>([\s\S]*?)(?=<h3>|$)/g,
                        '<div class="subsection"><h3><span class="subsection-icon">🧪</span>Testing Gaps</h3>$2</div>'
                    );

                    // Code Quality - extract existing emoji
                    processedSection = processedSection.replace(
                        /<h3>(💡\s*)?Code Quality<\/h3>([\s\S]*?)(?=<h3>|$)/g,
                        '<div class="subsection"><h3><span class="subsection-icon">💡</span>Code Quality</h3>$2</div>'
                    );

                    wrappedHtml += processedSection;
                } else if (wrappedHtml.includes('>Overall Assessment<')) {
                    // Handle Overall Assessment section subsections
                    let processedSection = section;

                    // Critical Issues
                    processedSection = processedSection.replace(
                        /<h3>Critical Issues<\/h3>([\s\S]*?)(?=<h3>|$)/g,
                        '<div class="subsection critical-section"><h3><span class="subsection-icon">⚠️</span>Critical Issues</h3>$1</div>'
                    );

                    // Warnings
                    processedSection = processedSection.replace(
                        /<h3>Warnings<\/h3>([\s\S]*?)(?=<h3>|$)/g,
                        '<div class="subsection warning-section"><h3><span class="subsection-icon">⚠️</span>Warnings</h3>$1</div>'
                    );

                    wrappedHtml += processedSection;
                } else {
                    wrappedHtml += section;
                }
            }
        }

        // Close the last section if needed
        if (wrappedHtml.includes('section-card') && !wrappedHtml.endsWith('</div>')) {
            wrappedHtml += '</div>';
        }

        return wrappedHtml;
    }
}

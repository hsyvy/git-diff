import * as vscode from 'vscode';
import { exec, spawn, execFile } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);


export function activate(context: vscode.ExtensionContext) {
    const analyzer = new ClaudeDiffAnalyzer(context);
    const provider = new ClaudeDiffViewProvider(analyzer);
    
    // Register tree data provider for the view
    context.subscriptions.push(
        vscode.window.registerTreeDataProvider('claudeDiff.mainView', provider)
    );
    
    context.subscriptions.push(
        vscode.commands.registerCommand('claudeDiff.analyze', () => 
            analyzer.analyzeChanges('all')
        ),
        vscode.commands.registerCommand('claudeDiff.analyzeStaged', () => 
            analyzer.analyzeChanges('staged')
        ),
        vscode.commands.registerCommand('claudeDiff.analyzeFile', (uri) => 
            analyzer.analyzeFile(uri)
        ),
        vscode.commands.registerCommand('claudeDiff.refresh', () => 
            provider.refresh()
        ),
        vscode.commands.registerCommand('claudeDiff.showLastAnalysis', () => 
            analyzer.showLastAnalysis()
        )
    );
    
    // Add status bar item
    const statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);
    statusBar.text = '$(hubot) Claude Diff';
    statusBar.command = 'claudeDiff.analyze';
    statusBar.tooltip = 'Analyze git changes with Claude';
    statusBar.show();
    context.subscriptions.push(statusBar);
}

class ClaudeDiffAnalyzer {
    private panel: vscode.WebviewPanel | undefined;
    private lastAnalysis: any = null;
    private isAnalyzing: boolean = false;
    
    constructor(private context: vscode.ExtensionContext) {}
    
    async analyzeChanges(type: 'all' | 'staged') {
        if (this.isAnalyzing) {
            vscode.window.showWarningMessage('Analysis already in progress. Please wait for it to complete.');
            return;
        }
        
        this.isAnalyzing = true;
        
        vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: "Analyzing changes with Claude...",
            cancellable: true
        }, async (progress, token) => {
            try {
                if (!vscode.workspace.workspaceFolders || vscode.workspace.workspaceFolders.length === 0) {
                    throw new Error('No workspace folder open');
                }
                const workspaceFolder = vscode.workspace.workspaceFolders[0].uri.fsPath;
                
                try {
                    await execAsync('git rev-parse --git-dir', { cwd: workspaceFolder });
                } catch (error) {
                    throw new Error('The current workspace is not a git repository.');
                }
                
                progress.report({ increment: 10, message: "Checking Claude..." });
                await this.checkClaudeInstallation();
                
                progress.report({ increment: 30, message: "Getting changes..." });
                const diffCommand = type === 'staged' ? 'git diff --staged' : 'git diff';
                const { stdout: gitDiff } = await execAsync(diffCommand, { cwd: workspaceFolder });
                
                if (!gitDiff.trim()) {
                    vscode.window.showInformationMessage(`No ${type === 'staged' ? 'staged ' : ''}changes to analyze.`);
                    return;
                }
                
                this.showPendingResults();
                
                progress.report({ increment: 60, message: "Claude is analyzing..." });
                const analysisResponse = await this.runClaudeAnalysis(gitDiff, token);
                
                progress.report({ increment: 90, message: "Preparing results..." });
                const analysisData = {
                    response: analysisResponse,
                    timestamp: new Date().toISOString(),
                    diffLength: gitDiff.length
                };
                this.lastAnalysis = analysisData;
                this.updateResults(analysisData);
                
            } catch (error: any) {
                if (error.message !== 'Analysis was cancelled.') {
                     this.handleError(error);
                    if (this.panel) {
                        this.panel.webview.html = this.getErrorContent(error);
                    }
                }
            } finally {
                this.isAnalyzing = false;
            }
        });
    }
    
    async analyzeFile(uri: vscode.Uri) {
        if (this.isAnalyzing) {
            vscode.window.showWarningMessage('Analysis already in progress. Please wait for it to complete.');
            return;
        }
        
        this.isAnalyzing = true;
        
        try {
            if (!vscode.workspace.workspaceFolders || vscode.workspace.workspaceFolders.length === 0) {
                throw new Error('No workspace folder open');
            }
            
            const workspaceFolder = vscode.workspace.workspaceFolders[0].uri.fsPath;
            const relativePath = vscode.workspace.asRelativePath(uri);
            const { stdout: gitDiff } = await execAsync(`git diff -- "${relativePath}"`, { cwd: workspaceFolder });
            
            if (!gitDiff.trim()) {
                vscode.window.showInformationMessage('No changes in this file to analyze.');
                return;
            }
            
            this.showPendingResults();
            const analysisResponse = await this.runClaudeAnalysis(gitDiff);
            const analysisData = {
                response: analysisResponse,
                timestamp: new Date().toISOString(),
                diffLength: gitDiff.length
            };
            this.lastAnalysis = analysisData;
            this.updateResults(analysisData);
        } catch (error: any) {
            this.handleError(error);
            if (this.panel) {
                this.panel.webview.html = this.getErrorContent(error);
            }
        } finally {
            this.isAnalyzing = false;
        }
    }
    
    showLastAnalysis() {
        if (this.lastAnalysis) {
            this.updateResults(this.lastAnalysis);
        } else {
            vscode.window.showInformationMessage('No previous analysis found. Run an analysis first.');
        }
    }
    
    runClaudeAnalysis(gitDiff: string, token?: vscode.CancellationToken): Promise<any> {
        const prompt = `Analyze this git diff and provide a comprehensive markdown-formatted response.

Please structure your response EXACTLY as follows:

## Summary

Provide a brief overall summary of the changes.

## Impact Assessment

**Impact Level:** High / Medium / Low

Provide reasoning for the impact level.

## File Changes

For each file in the diff, create a subsection:

### \`path/to/file.ext\`

**Changes:** Brief description of what changed

**Key modifications:**
- First modification
- Second modification
- Continue listing key changes

**Potential issues:** Describe any concerns or write "None identified"

## Issues Detected

### 🔒 Security Issues

- List security issues here
- Or write "None detected"

### 🔌 Integration Issues

- List integration issues here
- Or write "None detected"

### 🧪 Testing Gaps

- List testing issues here
- Or write "None detected"

### 💡 Code Quality

- List code quality issues here
- Or write "None detected"

## Overall Assessment

### Critical Issues

- List critical issues here
- Or write "None"

### Warnings

- List warnings here
- Or write "None"

### Recommendations

- List recommendations here
- Or write "None"

IMPORTANT: Use proper markdown hierarchy with headers and subheaders. Do not flatten the structure into a single list.

Git diff:
${gitDiff}`;

        return new Promise((resolve, reject) => {
            // Use spawn for robustness. It doesn't use a shell, avoiding injection issues.
            const claudeProcess = spawn('claude', ['-p', '-'], { shell: false });
            
            let stdoutData = '';
            let stderrData = '';

            // Handle cancellation
            token?.onCancellationRequested(() => {
                claudeProcess.kill();
                reject(new Error("Analysis was cancelled."));
            });

            claudeProcess.stdout.on('data', (data) => {
                stdoutData += data.toString();
            });

            claudeProcess.stderr.on('data', (data) => {
                stderrData += data.toString();
            });

            claudeProcess.on('close', (code) => {
                if (token?.isCancellationRequested) return;

                if (code !== 0) {
                    return reject(new Error(`Claude process exited with code ${code}: ${stderrData}`));
                }

                resolve(stdoutData.trim());
            });
            
            claudeProcess.on('error', (err) => {
                reject(err); // E.g., command not found
            });

            // Write the prompt to the process's standard input
            claudeProcess.stdin.write(prompt);
            claudeProcess.stdin.end();
        });
    }

    private _ensurePanel() {
        if (this.panel) {
            this.panel.reveal(vscode.ViewColumn.Two);
            return;
        }

        this.panel = vscode.window.createWebviewPanel(
            'claudeDiffAnalysis',
            'Claude Diff Analysis',
            vscode.ViewColumn.Two,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
                localResourceRoots: [] // Set if loading local resources
            }
        );

        this.panel.onDidDispose(() => {
            this.panel = undefined;
        }, null, this.context.subscriptions);

        this.panel.webview.onDidReceiveMessage(async message => {
            switch (message.command) {
                case 'openFile': {
                    if (!vscode.workspace.workspaceFolders) return;
                    const uri = vscode.Uri.joinPath(vscode.workspace.workspaceFolders[0].uri, message.file);
                    await vscode.window.showTextDocument(uri);
                    break;
                }
                case 'showDiff': {
                    if (!vscode.workspace.workspaceFolders) return;
                    const uri = vscode.Uri.joinPath(vscode.workspace.workspaceFolders[0].uri, message.file);
                    await vscode.commands.executeCommand('git.openChange', uri);
                    break;
                }
                case 'refresh':
                    this.analyzeChanges('all');
                    break;
            }
        }, null, this.context.subscriptions);
    }
    
    showPendingResults() {
        this._ensurePanel();
        if (this.panel) {
            this.panel.webview.html = this.getLoadingContent();
        }
    }
    
    updateResults(analysis: any) {
        this._ensurePanel();
        if (this.panel) {
            try {
                this.panel.webview.html = this.getRawResponseContent(analysis);
            } catch (error: any) {
                this.panel.webview.html = this.getErrorContent(error);
            }
        }
    }
    
    getLoadingContent(): string {
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

    getRawResponseContent(analysis: any): string {
        const responseText = analysis?.response || analysis || 'No response';
        const timestamp = analysis?.timestamp ? new Date(analysis.timestamp).toLocaleString() : new Date().toLocaleString();
        const diffLength = analysis?.diffLength || 0;
        
        // Simple markdown to HTML converter
        let htmlContent = this.parseMarkdown(responseText);

        return `<!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
                /* Your CSS styles here */
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
            </style>
        </head>
        <body>
            <div class="header">
                <div class="title-section">
                    <span class="icon">🤖</span>
                    <h1>AI Code Review</h1>
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
            
            <div class="actions">
                <button onclick="refresh()">Refresh Analysis</button>
                <button onclick="copyResponse()">Copy Response</button>
            </div>
            
            <script>
                const vscode = acquireVsCodeApi();

                // Make file paths clickable
                document.addEventListener('DOMContentLoaded', () => {
                    document.querySelectorAll('code').forEach(codeEl => {
                        const text = codeEl.textContent;
                        // Match file paths (e.g., src/file.ts, path/to/file.js)
                        if (text && /^[\w\-\/]+\.(ts|js|tsx|jsx|css|html|json|md)$/.test(text)) {
                            codeEl.style.cursor = 'pointer';
                            codeEl.style.textDecoration = 'underline';
                            codeEl.style.color = 'var(--vscode-textLink-foreground)';
                            codeEl.addEventListener('click', () => {
                                vscode.postMessage({ command: 'openFile', file: text });
                            });
                        }
                    });
                });
                
                function refresh() {
                    vscode.postMessage({ command: 'refresh' });
                }
                
                function copyResponse() {
                    const responseText = ${JSON.stringify(responseText)};
                    navigator.clipboard.writeText(responseText);
                }
            </script>
        </body>
        </html>`;
    }
    
    getErrorContent(error: any): string {
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
    
    
    async checkClaudeInstallation() {
        try {
            // Using execFile is slightly safer as it doesn't spawn a shell
            await promisify(execFile)('claude', ['--version']);
        } catch (error) {
            const selection = await vscode.window.showErrorMessage(
                'Claude CLI is not installed or not in your system\'s PATH.',
                'Install Guide',
                'Retry'
            );
            if (selection === 'Install Guide') {
                vscode.env.openExternal(vscode.Uri.parse('https://support.anthropic.com/en/articles/8979357-claude-command-line-tool'));
            }
            throw new Error('Claude CLI not available');
        }
    }
    
    handleError(error: any) {
        vscode.window.showErrorMessage(`Analysis failed: ${error.message}`);
    }
    
    private parseMarkdown(markdown: string): string {
        let html = markdown;
        
        // Escape HTML
        html = html.replace(/&/g, '&amp;')
                   .replace(/</g, '&lt;')
                   .replace(/>/g, '&gt;');
        
        // Headers (do these before other replacements)
        html = html.replace(/^#### (.+)$/gm, '<h4>$1</h4>');
        html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
        html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
        html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');
        
        // Code blocks (before other inline formatting)
        html = html.replace(/```([\s\S]*?)```/g, (match, code) => {
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
        let processedLines = [];
        let i = 0;
        
        while (i < lines.length) {
            const line = lines[i];
            
            // Check if this line starts a list
            if (line.match(/^\s*[-*+]\s+/)) {
                let listItems = [];
                let currentIndent = (line.match(/^(\s*)/) || ['', ''])[1].length;
                
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
        html = blocks.map(block => {
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
                return lines.map(line => line.trim() ? '<p>' + line + '</p>' : '').join('\n');
            }
        }).filter(block => block !== '').join('\n\n');
        
        return html;
    }
}

export function deactivate() {}

// Tree Data Provider for the sidebar view
class ClaudeDiffViewProvider implements vscode.TreeDataProvider<DiffItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<DiffItem | undefined | null | void> = new vscode.EventEmitter<DiffItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<DiffItem | undefined | null | void> = this._onDidChangeTreeData.event;

    constructor(private analyzer: ClaudeDiffAnalyzer) {}

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: DiffItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: DiffItem): Thenable<DiffItem[]> {
        if (!element) {
            // Root level - show main actions
            return Promise.resolve([
                new DiffItem('Analyze All Changes', 'analyze-all', vscode.TreeItemCollapsibleState.None, {
                    command: 'claudeDiff.analyze',
                    title: 'Analyze All Changes'
                }),
                new DiffItem('Analyze Staged Changes', 'analyze-staged', vscode.TreeItemCollapsibleState.None, {
                    command: 'claudeDiff.analyzeStaged',
                    title: 'Analyze Staged Changes'
                }),
                new DiffItem('View Last Analysis', 'view-last', vscode.TreeItemCollapsibleState.None, {
                    command: 'claudeDiff.showLastAnalysis',
                    title: 'View Last Analysis'
                })
            ]);
        }
        return Promise.resolve([]);
    }
}

class DiffItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly id: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly command?: vscode.Command
    ) {
        super(label, collapsibleState);
        this.tooltip = this.label;
        this.contextValue = id;
        
        // Set icons based on id
        switch(id) {
            case 'analyze-all':
                this.iconPath = new vscode.ThemeIcon('git-commit');
                break;
            case 'analyze-staged':
                this.iconPath = new vscode.ThemeIcon('git-pull-request-draft');
                break;
            case 'view-last':
                this.iconPath = new vscode.ThemeIcon('eye');
                break;
        }
    }
}
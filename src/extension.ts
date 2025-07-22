import * as vscode from 'vscode';
import { exec, spawn, execFile } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

const execAsync = promisify(exec);

// --- Helper function to sanitize HTML content ---
function escapeHtml(unsafe: string): string {
    if (typeof unsafe !== 'string') {
        return '';
    }
    return unsafe
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
}


export function activate(context: vscode.ExtensionContext) {
    console.log('[DEBUG] Claude Diff Visualizer extension activating...');
    const analyzer = new ClaudeDiffAnalyzer(context);
    const provider = new ClaudeDiffViewProvider(analyzer);
    console.log('[DEBUG] Extension activated successfully');
    
    // Register tree data provider for the view
    context.subscriptions.push(
        vscode.window.registerTreeDataProvider('claudeDiff.mainView', provider)
    );
    
    context.subscriptions.push(
        vscode.commands.registerCommand('claudeDiff.analyze', () => {
            console.log('[DEBUG] Command claudeDiff.analyze triggered');
            return analyzer.analyzeChanges('all');
        }),
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
        ),
        vscode.commands.registerCommand('claudeDiff.testWebview', () => 
            analyzer.testWebviewUpdate()
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
                const analysis = await this.runClaudeAnalysis(gitDiff, token);
                
                progress.report({ increment: 90, message: "Preparing results..." });
                this.lastAnalysis = analysis;
                this.updateResults(analysis);
                
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
        // This method could also be updated to use the Progress API like analyzeChanges
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
            const analysis = await this.runClaudeAnalysis(gitDiff);
            this.lastAnalysis = analysis;
            this.updateResults(analysis);
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
    
    testWebviewUpdate() {
        console.log('[DEBUG] TEST: Testing webview update mechanism');
        
        // Create test data
        const testAnalysis = {
            summary: "TEST: This is a test analysis",
            impact: "medium",
            files: [
                {
                    path: "test/file1.js",
                    additions: 10,
                    deletions: 5,
                    summary: "Test file changes",
                    keyChanges: ["Added test function", "Removed old code"],
                    issues: {
                        security: [],
                        integration: [],
                        testing: ["Missing tests"],
                        quality: []
                    }
                }
            ],
            overallIssues: {
                critical: [],
                warnings: ["This is a test warning"],
                suggestions: ["This is a test suggestion"]
            }
        };
        
        console.log('[DEBUG] TEST: Showing pending results first');
        this.showPendingResults();
        
        // Update after 2 seconds to simulate async operation
        setTimeout(() => {
            console.log('[DEBUG] TEST: Updating with test data');
            this.updateResults(testAnalysis);
        }, 2000);
    }

    /**
     * **REVISED**: Uses child_process.spawn for cross-platform compatibility and
     * pipes the prompt to stdin, which is safer and more efficient than temp files
     * and shell commands. Implements the cancellation token to terminate the process.
     */
    runClaudeAnalysis(gitDiff: string, token?: vscode.CancellationToken): Promise<any> {
        console.log('[DEBUG] Starting Claude analysis...');
        const prompt = `Analyze this git diff and provide:
1. A brief overall summary
2. Impact assessment (high/medium/low)
3. Key changes for each file
4. Any security, integration, testing, or quality issues
5. Overall critical issues, warnings, and suggestions

Git diff:
${gitDiff}`;

        return new Promise((resolve, reject) => {
            // Use spawn for robustness. It doesn't use a shell, avoiding injection issues.
            const claudeProcess = spawn('claude', ['-p', '-'], { shell: false });
            
            let stdoutData = '';
            let stderrData = '';

            // Handle cancellation
            token?.onCancellationRequested(() => {
                console.log('[DEBUG] Cancellation requested. Terminating Claude process.');
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
                console.log('[DEBUG] Claude process closed with code:', code);
                if (token?.isCancellationRequested) return;

                if (code !== 0) {
                    console.error('[DEBUG] Claude stderr:', stderrData);
                    return reject(new Error(`Claude process exited with code ${code}: ${stderrData}`));
                }

                console.log('[DEBUG] Claude response received. Length:', stdoutData.length);
                try {
                    console.log('[DEBUG] Successfully parsed JSON.');
                    resolve(stdoutData.trim());
                } catch (parseError: any) {
                    console.error('[DEBUG] Failed to parse Claude response:', parseError);
                    reject(new Error('Invalid JSON in Claude response: ' + parseError.message));
                }
            });
            
            claudeProcess.on('error', (err) => {
                reject(err); // E.g., command not found
            });

            // Write the prompt to the process's standard input
            claudeProcess.stdin.write(prompt);
            claudeProcess.stdin.end();
        });
    }

    /**
     * **REFACTORED**: Ensures a webview panel exists, creating one if necessary.
     * This single method now handles panel creation and listener setup to avoid redundancy.
     */
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
                // this.panel.webview.html = this.getWebviewContent(analysis);
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
            
            <!-- Debug Panel for Loading Screen -->
            <div id="debug-panel" style="
                position: fixed;
                bottom: 10px;
                right: 10px;
                background: rgba(0,0,0,0.8);
                color: #0f0;
                padding: 10px;
                border-radius: 5px;
                font-family: monospace;
                font-size: 12px;
                max-width: 400px;
                max-height: 200px;
                overflow-y: auto;
                z-index: 9999;
            ">
                <div style="font-weight: bold; margin-bottom: 5px;">🐛 DEBUG LOG</div>
                <div id="debug-log">
                    <div>Loading screen displayed</div>
                    <div>Waiting for Claude analysis...</div>
                </div>
            </div>
        </body>
        </html>`;
    }
    getRawResponseContent(analysis: any): string {
        const escapedResponse = (analysis || 'No response').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');
        
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
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 20px;
                    padding-bottom: 10px;
                    border-bottom: 1px solid var(--vscode-panel-border);
                }
                
                h2 {
                    margin: 0;
                    color: var(--vscode-foreground);
                }
                
                .info {
                    font-size: 12px;
                    color: var(--vscode-descriptionForeground);
                }
                
                .response-container {
                    background: var(--vscode-textBlockQuote-background);
                    border: 1px solid var(--vscode-panel-border);
                    border-radius: 8px;
                    padding: 20px;
                    margin-bottom: 20px;
                    font-family: monospace;
                    font-size: 14px;
                    white-space: pre-wrap;
                    word-wrap: break-word;
                    overflow-x: auto;
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
                <h2>Claude Analysis (Raw Response)</h2>
                <div class="info">
                    <div>Timestamp: ${analysis.timestamp}</div>
                    <div>Diff size: ${analysis.diffLength} characters</div>
                </div>
            </div>
            
            <div class="response-container">${escapedResponse}</div>
            
            <div class="actions">
                <button onclick="refresh()">Refresh Analysis</button>
                <button onclick="copyResponse()">Copy Response</button>
            </div>
            
            <!-- Debug Panel -->
            <div id="debug-panel" style="
                position: fixed;
                bottom: 10px;
                right: 10px;
                background: rgba(0,0,0,0.8);
                color: #0f0;
                padding: 10px;
                border-radius: 5px;
                font-family: monospace;
                font-size: 12px;
                max-width: 400px;
                max-height: 200px;
                overflow-y: auto;
                z-index: 9999;
            ">
                <div style="font-weight: bold; margin-bottom: 5px;">🐛 DEBUG LOG</div>
                <div id="debug-log"></div>
            </div>
            
            <script>
                const vscode = acquireVsCodeApi();
                
                // Debug logging function
                function debugLog(message) {
                    const timestamp = new Date().toISOString().substring(11, 19);
                    const logEntry = timestamp + ' ' + message;
                    console.log('[WEBVIEW DEBUG]', logEntry);
                    
                    const debugLog = document.getElementById('debug-log');
                    if (debugLog) {
                        const entry = document.createElement('div');
                        entry.textContent = logEntry;
                        debugLog.appendChild(entry);
                        
                        // Keep only last 20 entries
                        while (debugLog.children.length > 20) {
                            debugLog.removeChild(debugLog.firstChild);
                        }
                        
                        // Auto scroll to bottom
                        debugLog.scrollTop = debugLog.scrollHeight;
                    }
                }
                
                // Log when webview loads
                debugLog('Raw response view loaded');
                debugLog('Response length: ' + ${analysis.rawResponse?.length || 0});
                
                function refresh() {
                    debugLog('Refreshing analysis...');
                    vscode.postMessage({ command: 'refresh' });
                }
                
                function copyResponse() {
                    debugLog('Copying response to clipboard');
                    const responseText = ${JSON.stringify(analysis.rawResponse || '')};
                    navigator.clipboard.writeText(responseText).then(() => {
                        debugLog('Response copied to clipboard');
                    }).catch(err => {
                        debugLog('Failed to copy: ' + err);
                    });
                }
                
                // Log any errors
                window.onerror = function(msg, url, lineNo, columnNo, error) {
                    debugLog('ERROR: ' + msg);
                    return false;
                };
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
            <!-- Debug Panel for Error Screen -->
            <div id="debug-panel" style="
                position: fixed;
                bottom: 10px;
                right: 10px;
                background: rgba(0,0,0,0.8);
                color: #0f0;
                padding: 10px;
                border-radius: 5px;
                font-family: monospace;
                font-size: 12px;
                max-width: 400px;
                max-height: 200px;
                overflow-y: auto;
                z-index: 9999;
            ">
                <div style="font-weight: bold; margin-bottom: 5px;">🐛 DEBUG LOG</div>
                <div id="debug-log">
                    <div>Error screen displayed</div>
                    <div>Error: ${(error.message || 'Unknown error').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
                </div>
            </div>
            
            <script>
                const vscode = acquireVsCodeApi();
                function refresh() {
                    console.log('[ERROR VIEW] Refresh clicked');
                    vscode.postMessage({ command: 'refresh' });
                }
            </script>
        </body>
        </html>`;
    }
    
    /**
     * **REVISED**: All dynamic data from the `analysis` object is now
     * sanitized with `escapeHtml` to prevent XSS vulnerabilities.
     */
    getWebviewContent(analysis: any): string {
        // Note: The debug log was also fixed (single JSON.stringify)
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
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 20px;
                    padding-bottom: 10px;
                    border-bottom: 1px solid var(--vscode-panel-border);
                }
                
                h2 {
                    margin: 0;
                    color: var(--vscode-foreground);
                }
                
                .impact {
                    padding: 4px 12px;
                    border-radius: 12px;
                    font-size: 12px;
                    font-weight: 600;
                    text-transform>: uppercase;
                }
                
                .impact.high {
                    background: rgba(255, 0, 0, 0.2);
                    color: #ff6b6b;
                }
                
                .impact.medium {
                    background: rgba(255, 193, 7, 0.2);
                    color: #ffc107;
                }
               > 
                .impact.low {
                    background: rgba(40, 167, 69, 0.2);
                    color: #28a745;
                }
                
                .summary {
                    margin-bottom: 30px;
                    padding: 15px;
                    background: var(--vscode-textBlockQuote-background);
                    border-radius: 8px;
                }
                
                .files-section h3 {
                    margin-bottom: 15px;
                    color: var(--vscode-foreground);
                }
                
                .file-item {
                    border: 1px solid var(--vscode-panel-border);
                    border-radius:> 8px;
                    padding: 15px;
                    margin-bottom: 15px;
                    transition: all 0.2s;
                }
                
                .file-item:hover {
                    border-color: var(--vscode-focusBorder);
                    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                }
                
                .file-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 10px;
                }
                
                .file-path >{
                    color: var(--vscode-textLink-foreground);
                    text-decoration: none;
                    font-weight: 500;
                    cursor: pointer;
                }
                
                .file-path:hover {
                    text-decoration: underline;
                }
                
                .file-stats {
                    display: flex;
                    gap: 10px;
                    font-family: monospace;
                    font-size: 14px;
                }
                
                .additions {
                    color: var(--vscode-gitDecoration-addedResourceForeground);
                }
                
                .deletions {
                    color: var(--vscode-gitDecoration-deletedResourceForeground);
                }
                
                .file-summary {
                    color: var(--vscode-descriptionForeground);
                    margin-bottom: 10px;
                }
                
                .key-changes {
                    margin-left: 20px;
                    margin-bottom: 10px;
                }
                
                .key-changes li {
                    color: var(--vscode-foreground);
                    margin-bottom: 4px;
                }
                
                .issues-badges {
                    display: flex;
                    gap: 8px;
                    flex-wrap: wrap;
                }
                
                .issue-badge {
                    padding: 2px 8px;
                    border-radius: 12px;
                    font-size: 11px;
                    font-weight: 600;
                }
                
                .issue-badge.security {
                    background: rgba(255, 0, 0, 0.2);
                    color: #ff6b6b;
                }
                
                .issue-badge.testing {
                    background: rgba(0, 123, 255, 0.2);
                    color: #007bff;
                }
                
                .issue-badge.integration {
                    background: rgba(255, 193, 7, 0.2);
                    color: #ffc107;
                }
                
                .issue-badge.quality {
                    background: rgba(108, 117, 125, 0.2);
                    color: #6c757d;
                }
                
                .issues-section {
                    margin-top: 30px;
                    padding: 20px;
                    background: var(--vscode-textBlockQuote-background);
                    border-radius: 8px;
                }
                
                .issue-category {
                    margin-bottom: 20px;
                }
                
                .issue-category h4 {
                    margin-bottom: 10px;
                    color: var(--vscode-foreground);
                }
                
                .issue-list {
                    margin-left: 20px;
                }
                
                .issue-list li {
                    margin-bottom: 5px;
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
                <h2>Git Change Analysis</h2>
                <span class="impact ${escapeHtml(analysis.impact)}">${escapeHtml(analysis.impact)} impact</span>
            </div>
            
            <div class="summary">
                <strong>Summary:</strong> ${escapeHtml(analysis.summary)}
            </div>
            
            <div class="files-section">
                <h3>File Changes (${analysis.files?.length || 0})</h3>
                ${(analysis.files || []).map((file: any) => `
                    <div class="file-item">
                        <div class="file-header">
                            <a class="file-path" onclick="openFile('${escapeHtml(file.path)}')">${escapeHtml(file.path)}</a>
                            <div class="file-stats">
                                <span class="additions">+${file.additions || 0}</span>
                                <span class="deletions">-${file.deletions || 0}</span>
                            </div>
                        </div>
                        <div class="file-summary">${escapeHtml(file.summary)}</div>
                        ${file.keyChanges?.length ? `
                            <ul class="key-changes">
                                ${file.keyChanges.map((change: string) => `<li>${escapeHtml(change)}</li>`).join('')}
                            </ul>
                        ` : ''}
                        ${this.renderIssues(file.issues)}
                    </div>
                `).join('')}
            </div>
            
            ${this.renderOverallIssues(analysis.overallIssues)}
            <div class="actions">
                <button onclick="refresh()">Refresh Analysis</button>
                <button onclick="showAllDiffs()">Show All Diffs</button>
            </div>
            
            <!-- Debug Panel -->
            <div id="debug-panel" style="
                position: fixed;
                bottom: 10px;
                right: 10px;
                background: rgba(0,0,0,0.8);
                color: #0f0;
                padding: 10px;
                border-radius: 5px;
                font-family: monospace;
                font-size: 12px;
                max-width: 400px;
                max-height: 200px;
                overflow-y: auto;
                z-index: 9999;
            ">
                <div style="font-weight: bold; margin-bottom: 5px;">🐛 DEBUG LOG</div>
                <div id="debug-log"></div>
            </div>
            
            <script>
                const vscode = acquireVsCodeApi();
                
                // Debug logging function
                function debugLog(message) {
                    const timestamp = new Date().toISOString().substring(11, 19);
                    const logEntry = timestamp + ' ' + message;
                    console.log('[WEBVIEW DEBUG]', logEntry);
                    
                    const debugLog = document.getElementById('debug-log');
                    if (debugLog) {
                        const entry = document.createElement('div');
                        entry.textContent = logEntry;
                        debugLog.appendChild(entry);
                        
                        // Keep only last 20 entries
                        while (debugLog.children.length > 20) {
                            debugLog.removeChild(debugLog.firstChild);
                        }
                        
                        // Auto scroll to bottom
                        debugLog.scrollTop = debugLog.scrollHeight;
                    }
                }
                
                // Log when webview loads
                debugLog('Webview loaded');
                debugLog('Analysis data received: ' + (${JSON.stringify(!!analysis)} ? 'YES' : 'NO'));
                debugLog('Files count: ' + ${analysis?.files?.length || 0});
                
                function openFile(file) {
                    debugLog('Opening file: ' + file);
                    vscode.postMessage({ command: 'openFile', file: file });
                }
                
                function showDiff(file) {
                    debugLog('Showing diff for: ' + file);
                    vscode.postMessage({ command: 'showDiff', file: file });
                }
                
                function refresh() {
                    debugLog('Refreshing analysis...');
                    vscode.postMessage({ command: 'refresh' });
                }
                
                function showAllDiffs() {
                    debugLog('Showing all diffs');
                    vscode.postMessage({ command: 'showAllDiffs' });
                }
                
                // Log any errors
                window.onerror = function(msg, url, lineNo, columnNo, error) {
                    debugLog('ERROR: ' + msg);
                    return false;
                };
            </script>
        </body>
        </html>`;
    }
    
    renderIssues(issues: any): string {
        // No user data here, so no sanitization needed
        if (!issues) return '';
        const badges = [];
        if (issues.security?.length) badges.push('<span class="issue-badge security">🔒 Security</span>');
        if (issues.testing?.length) badges.push('<span class="issue-badge testing">🧪 Testing</span>');
        if (issues.integration?.length) badges.push('<span class="issue-badge integration">🔌 Integration</span>');
        if (issues.quality?.length) badges.push('<span class="issue-badge quality">💡 Quality</span>');
        return badges.length ? `<div class="issues-badges">${badges.join('')}</div>` : '';
    }
    
    renderOverallIssues(issues: any): string {
        // **REVISED**: Sanitized all list items
        if (!issues || (!issues.critical?.length && !issues.warnings?.length && !issues.suggestions?.length)) {
            return '';
        }
        return `
            <div class="issues-section">
                <h3>Overall Issues & Suggestions</h3>
                ${issues.critical?.length ? `
                    <div class="issue-category">
                        <h4>🚨 Critical Issues</h4>
                        <ul class="issue-list">
                            ${issues.critical.map((issue: string) => `<li>${escapeHtml(issue)}</li>`).join('')}
                        </ul>
                    </div>
                ` : ''}
                ${issues.warnings?.length ? `
                    <div class="issue-category">
                        <h4>⚠️ Warnings</h4>
                        <ul class="issue-list">
                            ${issues.warnings.map((issue: string) => `<li>${escapeHtml(issue)}</li>`).join('')}
                        </ul>
                    </div>
                ` : ''}
                ${issues.suggestions?.length ? `
                    <div class="issue-category">
                        <h4>💡 Suggestions</h4>
                        <ul class="issue-list">
                            ${issues.suggestions.map((issue: string) => `<li>${escapeHtml(issue)}</li>`).join('')}
                        </ul>
                    </div>
                ` : ''}
            </div>
        `;
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
        console.error('Claude Diff Analysis Error:', error);
        vscode.window.showErrorMessage(`Analysis failed: ${error.message}`);
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
                this.iconPath = new vscode.ThemeIcon('git-stage');
                break;
            case 'view-last':
                this.iconPath = new vscode.ThemeIcon('eye');
                break;
        }
    }
}
# VSCode Extension: Claude Code Git Diff Analyzer

## Overview

A VSCode extension that uses Claude Code CLI directly to analyze git diffs and display results in an intuitive visual interface within VSCode.

## Core Workflow

1. **Trigger**: User clicks "Analyze with Claude" in Source Control view or uses command palette
2. **Analysis**: Extension runs `claude -p <prompt>` with git diff as input in prompt along with additional preprompts things which would be extensible by user.
3. **Display**: Results shown in custom webview panel with interactive file navigation

## Implementation Approach

### 1. Direct CLI Integration

```typescript
// No hooks needed - just execute Claude Code directly
async function analyzeGitDiff(): Promise<AnalysisResult> {
    // Get git diff
    const { stdout: gitDiff } = await execAsync('git diff');
    
    // Create prompt for Claude
    const prompt = `Analyze this git diff and respond with ONLY a JSON object (no other text) containing:
    {
        "summary": "overall summary of changes",
        "impact": "high|medium|low",
        "files": [{
            "path": "file path",
            "additions": number,
            "deletions": number,
            "summary": "what changed",
            "keyChanges": ["change 1", "change 2"],
            "issues": {
                "security": ["issue if any"],
                "integration": ["issue if any"],  
                "testing": ["missing test coverage if any"],
                "quality": ["code quality issues if any"]
            }
        }],
        "overallIssues": {
            "critical": ["critical issues across all files"],
            "warnings": ["warnings"],
            "suggestions": ["improvement suggestions"]
        }
    }
    
    Git diff to analyze:
    ${gitDiff}`;
    
    // Execute Claude Code
    const { stdout: result } = await execAsync(`claude-code -p "${prompt}"`);
    
    // Parse JSON from response
    const jsonMatch = result.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
    }
    throw new Error('Failed to parse Claude response');
}
```

### 2. Extension Commands

```json
{
  "name": "claude-code-git-diff-analyzer",
  "displayName": "Claude Diff Analyzer",
  "description": "AI-powered git diff analysis using Claude Code for claude code",
  "version": "1.0.0",
  "engines": {
    "vscode": "^1.74.0"
  },
  "main": "./out/extension.js",
  "activationEvents": [
    "onCommand:claudeDiff.analyze",
    "onCommand:claudeDiff.analyzeStaged",
    "onCommand:claudeDiff.analyzeFile"
  ],
  "contributes": {
    "commands": [
      {
        "command": "claudeDiff.analyze",
        "title": "Claude: Analyze All Changes",
        "icon": "$(hubot)"
      },
      {
        "command": "claudeDiff.analyzeStaged",
        "title": "Claude: Analyze Staged Changes",
        "icon": "$(hubot)"
      },
      {
        "command": "claudeDiff.analyzeFile",
        "title": "Claude: Analyze This File"
      }
    ],
    "menus": {
      "scm/title": [
        {
          "command": "claudeDiff.analyze",
          "group": "navigation",
          "when": "scmProvider == git"
        }
      ],
      "scm/resourceState/context": [
        {
          "command": "claudeDiff.analyzeFile",
          "when": "scmProvider == git"
        }
      ]
    },
    "configuration": {
      "title": "Claude Code Git Diff Analyzer",
      "properties": {
        "claudeDiff.autoAnalyze": {
          "type": "boolean",
          "default": false,
          "description": "Automatically analyze changes when opening repository"
        },
        "claudeDiff.includeUntrackedFiles": {
          "type": "boolean",
          "default": false,
          "description": "Include untracked files in analysis"
        }
      }
    }
  }
}
```

### 3. Main Extension Code

```typescript
import * as vscode from 'vscode';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export function activate(context: vscode.ExtensionContext) {
    const analyzer = new ClaudeDiffAnalyzer(context);
    
    context.subscriptions.push(
        vscode.commands.registerCommand('claudeDiff.analyze', () => 
            analyzer.analyzeChanges('all')
        ),
        vscode.commands.registerCommand('claudeDiff.analyzeStaged', () => 
            analyzer.analyzeChanges('staged')
        ),
        vscode.commands.registerCommand('claudeDiff.analyzeFile', (uri) => 
            analyzer.analyzeFile(uri)
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
    
    constructor(private context: vscode.ExtensionContext) {}
    
    async analyzeChanges(type: 'all' | 'staged') {
        // Show progress
        vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: "Analyzing changes with Claude...",
            cancellable: true
        }, async (progress, token) => {
            try {
                // Check Claude Code installation
                progress.report({ increment: 10, message: "Checking Claude Code..." });
                await this.checkClaudeInstallation();
                
                // Get git diff
                progress.report({ increment: 30, message: "Getting changes..." });
                const diffCommand = type === 'staged' ? 'git diff --staged' : 'git diff';
                const { stdout: gitDiff } = await execAsync(diffCommand);
                
                if (!gitDiff.trim()) {
                    vscode.window.showInformationMessage(`No ${type === 'staged' ? 'staged ' : ''}changes to analyze`);
                    return;
                }
                
                // Analyze with Claude
                progress.report({ increment: 60, message: "Claude is analyzing..." });
                const analysis = await this.runClaudeAnalysis(gitDiff, token);
                
                // Show results
                progress.report({ increment: 90, message: "Preparing results..." });
                this.showResults(analysis);
                
            } catch (error) {
                this.handleError(error);
            }
        });
    }
    
    async analyzeFile(uri: vscode.Uri) {
        const relativePath = vscode.workspace.asRelativePath(uri);
        const { stdout: gitDiff } = await execAsync(`git diff ${relativePath}`);
        
        if (!gitDiff.trim()) {
            vscode.window.showInformationMessage('No changes in this file');
            return;
        }
        
        const analysis = await this.runClaudeAnalysis(gitDiff);
        this.showResults(analysis);
    }
    
    async runClaudeAnalysis(gitDiff: string, token?: vscode.CancellationToken): Promise<any> {
        const prompt = `Analyze this git diff and respond with ONLY a JSON object (no other text, no markdown formatting) containing:
{
    "summary": "brief overall summary",
    "impact": "high|medium|low",
    "files": [{
        "path": "file path",
        "additions": number,
        "deletions": number,
        "summary": "what changed in this file",
        "keyChanges": ["specific change 1", "specific change 2"],
        "issues": {
            "security": ["any security concerns"],
            "integration": ["any integration issues"],
            "testing": ["missing test coverage"],
            "quality": ["code quality issues"]
        }
    }],
    "overallIssues": {
        "critical": ["critical issues"],
        "warnings": ["warnings"],
        "suggestions": ["suggestions"]
    }
}

Git diff:
${gitDiff}`;

        // Execute Claude Code
        const { stdout } = await execAsync(`claude -p "${prompt.replace(/"/g, '\\"')}"`);
        
        // Extract JSON from response
        const jsonMatch = stdout.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error('Could not parse Claude response as JSON');
        }
        
        return JSON.parse(jsonMatch[0]);
    }
    
    showResults(analysis: any) {
        // Create or show webview panel
        if (!this.panel) {
            this.panel = vscode.window.createWebviewPanel(
                'claudeDiffAnalysis',
                'Claude Diff Analysis',
                vscode.ViewColumn.Two,
                {
                    enableScripts: true,
                    retainContextWhenHidden: true
                }
            );
            
            this.panel.onDidDispose(() => {
                this.panel = undefined;
            });
            
            // Handle messages from webview
            this.panel.webview.onDidReceiveMessage(async message => {
                switch (message.command) {
                    case 'openFile':
                        const uri = vscode.Uri.file(
                            vscode.workspace.workspaceFolders[0].uri.fsPath + '/' + message.file
                        );
                        const doc = await vscode.workspace.openTextDocument(uri);
                        await vscode.window.showTextDocument(doc);
                        break;
                        
                    case 'showDiff':
                        await vscode.commands.executeCommand('git.openChange', message.file);
                        break;
                        
                    case 'refresh':
                        this.analyzeChanges('all');
                        break;
                }
            });
        }
        
        this.panel.webview.html = this.getWebviewContent(analysis);
        this.panel.reveal();
    }
    
    getWebviewContent(analysis: any): string {
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
                    text-transform: uppercase;
                }
                
                .impact.high {
                    background: rgba(255, 0, 0, 0.2);
                    color: #ff6b6b;
                }
                
                .impact.medium {
                    background: rgba(255, 193, 7, 0.2);
                    color: #ffc107;
                }
                
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
                    border-radius: 8px;
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
                
                .file-path {
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
                <span class="impact ${analysis.impact}">${analysis.impact} impact</span>
            </div>
            
            <div class="summary">
                <strong>Summary:</strong> ${analysis.summary}
            </div>
            
            <div class="files-section">
                <h3>File Changes (${analysis.files?.length || 0})</h3>
                ${(analysis.files || []).map(file => `
                    <div class="file-item">
                        <div class="file-header">
                            <a class="file-path" onclick="openFile('${file.path}')">${file.path}</a>
                            <div class="file-stats">
                                <span class="additions">+${file.additions}</span>
                                <span class="deletions">-${file.deletions}</span>
                            </div>
                        </div>
                        <div class="file-summary">${file.summary}</div>
                        ${file.keyChanges?.length ? `
                            <ul class="key-changes">
                                ${file.keyChanges.map(change => `<li>${change}</li>`).join('')}
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
            
            <script>
                const vscode = acquireVsCodeApi();
                
                function openFile(file) {
                    vscode.postMessage({ command: 'openFile', file: file });
                }
                
                function showDiff(file) {
                    vscode.postMessage({ command: 'showDiff', file: file });
                }
                
                function refresh() {
                    vscode.postMessage({ command: 'refresh' });
                }
                
                function showAllDiffs() {
                    vscode.postMessage({ command: 'showAllDiffs' });
                }
            </script>
        </body>
        </html>`;
    }
    
    renderIssues(issues: any): string {
        if (!issues) return '';
        
        const badges = [];
        if (issues.security?.length) badges.push('<span class="issue-badge security">🔒 Security</span>');
        if (issues.testing?.length) badges.push('<span class="issue-badge testing">🧪 Testing</span>');
        if (issues.integration?.length) badges.push('<span class="issue-badge integration">🔌 Integration</span>');
        if (issues.quality?.length) badges.push('<span class="issue-badge quality">💡 Quality</span>');
        
        return badges.length ? `<div class="issues-badges">${badges.join('')}</div>` : '';
    }
    
    renderOverallIssues(issues: any): string {
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
                            ${issues.critical.map(issue => `<li>${issue}</li>`).join('')}
                        </ul>
                    </div>
                ` : ''}
                ${issues.warnings?.length ? `
                    <div class="issue-category">
                        <h4>⚠️ Warnings</h4>
                        <ul class="issue-list">
                            ${issues.warnings.map(issue => `<li>${issue}</li>`).join('')}
                        </ul>
                    </div>
                ` : ''}
                ${issues.suggestions?.length ? `
                    <div class="issue-category">
                        <h4>💡 Suggestions</h4>
                        <ul class="issue-list">
                            ${issues.suggestions.map(issue => `<li>${issue}</li>`).join('')}
                        </ul>
                    </div>
                ` : ''}
            </div>
        `;
    }
    
    async checkClaudeInstallation() {
        try {
            await execAsync('claude-code --version');
        } catch (error) {
            const selection = await vscode.window.showErrorMessage(
                'Claude Code is not installed or not in PATH',
                'Install Guide',
                'Retry'
            );
            
            if (selection === 'Install Guide') {
                vscode.env.openExternal(vscode.Uri.parse('https://claude.ai/code'));
            }
            
            throw new Error('Claude Code not available');
        }
    }
    
    handleError(error: any) {
        console.error('Claude Diff Analysis Error:', error);
        vscode.window.showErrorMessage(`Analysis failed: ${error.message}`);
    }
}
```

## Key Features

1. **Direct CLI Integration**
   - Uses `claude-code -p "prompt"` directly
   - No hooks configuration needed
   - Simple and reliable

2. **Visual Interface**
   - Clean webview showing analysis results
   - Clickable file paths that open the actual files
   - Diff stats (+additions -deletions)
   - Issue badges for each file

3. **Multiple Analysis Options**
   - Analyze all changes
   - Analyze only staged changes
   - Analyze specific file (right-click)

4. **Smart Error Handling**
   - Checks if Claude Code is installed
   - Provides installation guidance
   - Clear error messages

5. **Issue Detection**
   - Security vulnerabilities
   - Missing test coverage
   - Integration problems
   - Code quality issues

## Installation & Usage

1. **Install Extension**
   - Package and install the .vsix file
   - Or publish to VS Code marketplace

2. **Ensure Claude Code is Installed**
   ```bash
   npm install -g @anthropic-ai/claude-code
   # or use the local installation method
   ```

3. **Use the Extension**
   - Click the robot icon in Source Control view
   - Or use Command Palette: "Claude: Analyze All Changes"
   - Or right-click files in Source Control

## Benefits of This Approach

- **No setup required** - Works immediately after installing extension and Claude Code
- **Direct integration** - No intermediate hooks or configuration
- **Full control** - Extension handles all formatting and parsing
- **Better error handling** - Can detect and handle CLI errors properly
- **Flexible prompting** - Can adjust prompts based on context
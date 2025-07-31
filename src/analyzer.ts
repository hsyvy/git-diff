/* eslint-disable indent */
import * as vscode from 'vscode';
import childProcess = require('child_process');
import { promisify } from 'util';
import { AnalysisData, AnalysisType, WebviewMessage } from './types';
import { WebviewContent } from './webview-content';
import { DEFAULT_PROMPT } from './constants';

function execAsync(
    file: string,
    args: readonly string[],
    options?: childProcess.ExecFileOptions
): Promise<{ stdout: string; stderr: string }> {
    return promisify(childProcess.execFile)(file, args, options) as Promise<{
        stdout: string;
        stderr: string;
    }>;
}

export class GitDiffAnalyzer {
    private panel: vscode.WebviewPanel | undefined;
    private lastAnalysis: AnalysisData | null = null;
    private isAnalyzing = false;

    constructor(private context: vscode.ExtensionContext) {}

    async analyzeChanges(type: AnalysisType) {
        if (this.isAnalyzing) {
            vscode.window.showWarningMessage('Analysis already in progress. Please wait for it to complete.');
            return;
        }

        this.isAnalyzing = true;

        await vscode.window.withProgress(
            {
                location: vscode.ProgressLocation.Notification,
                title: 'Analyzing changes with Claude...',
                cancellable: true
            },
            async (progress, token) => {
                try {
                    if (!vscode.workspace.workspaceFolders || vscode.workspace.workspaceFolders.length === 0) {
                        throw new Error('No workspace folder open');
                    }
                    const workspaceFolder = vscode.workspace.workspaceFolders[0].uri.fsPath;

                    try {
                        await execAsync('git', ['rev-parse', '--git-dir'], { cwd: workspaceFolder });
                    } catch (error) {
                        throw new Error('The current workspace is not a git repository.');
                    }

                    progress.report({ increment: 10, message: 'Checking Claude...' });
                    await this.checkClaudeInstallation();

                    progress.report({ increment: 30, message: 'Getting changes...' });
                    const diffCommand = type === 'staged' ? ['diff', '--staged'] : ['diff'];
                    const { stdout: gitDiff } = await execAsync('git', diffCommand, { cwd: workspaceFolder });

                    if (!gitDiff.trim()) {
                        vscode.window.showInformationMessage(
                            `No ${type === 'staged' ? 'staged ' : ''}changes to analyze.`
                        );
                        return;
                    }

                    this.showPendingResults();

                    progress.report({ increment: 60, message: 'Claude is analyzing...' });
                    const analysisResponse = await this.runClaudeAnalysis(gitDiff, token);

                    progress.report({ increment: 90, message: 'Preparing results...' });
                    const analysisData: AnalysisData = {
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
                            this.panel.webview.html = WebviewContent.getErrorContent(error);
                        }
                    }
                } finally {
                    this.isAnalyzing = false;
                }
            }
        );
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
            const { stdout: gitDiff } = await execAsync('git', ['diff', '--', relativePath], { cwd: workspaceFolder });

            if (!gitDiff.trim()) {
                vscode.window.showInformationMessage('No changes in this file to analyze.');
                return;
            }

            this.showPendingResults();
            const analysisResponse = await this.runClaudeAnalysis(gitDiff);
            const analysisData: AnalysisData = {
                response: analysisResponse,
                timestamp: new Date().toISOString(),
                diffLength: gitDiff.length
            };
            this.lastAnalysis = analysisData;
            this.updateResults(analysisData);
        } catch (error: any) {
            this.handleError(error);
            if (this.panel) {
                this.panel.webview.html = WebviewContent.getErrorContent(error);
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

    private runClaudeAnalysis(gitDiff: string, token?: vscode.CancellationToken): Promise<string> {
        const config = vscode.workspace.getConfiguration('gitDiff');
        const customPrompt = config.get<string>('customPrompt', '').trim();

        let prompt: string;
        if (customPrompt) {
            // Use custom prompt and replace placeholder
            prompt = customPrompt.replace('{DIFF_PLACEHOLDER}', gitDiff);
            // If no placeholder found, append the diff
            if (!customPrompt.includes('{DIFF_PLACEHOLDER}')) {
                prompt = customPrompt + '\n\nGit diff:\n' + gitDiff;
            }
        } else {
            // Use default prompt
            prompt = DEFAULT_PROMPT.replace('{DIFF_PLACEHOLDER}', gitDiff);
        }

        return new Promise((resolve, reject) => {
            const claudeProcess = childProcess.spawn('claude', ['-p', '-'], {
                shell: false
            });

            let stdoutData = '';
            let stderrData = '';

            token?.onCancellationRequested(() => {
                claudeProcess.kill();
                reject(new Error('Analysis was cancelled.'));
            });

            claudeProcess.stdout.on('data', data => {
                stdoutData += data.toString();
            });

            claudeProcess.stderr.on('data', data => {
                stderrData += data.toString();
            });

            claudeProcess.on('close', code => {
                if (token?.isCancellationRequested) {
                    return;
                }

                if (code !== 0) {
                    return reject(new Error(`Claude process exited with code ${code}: ${stderrData}`));
                }

                resolve(stdoutData.trim());
            });

            claudeProcess.on('error', err => {
                reject(err);
            });

            claudeProcess.stdin.write(prompt);
            claudeProcess.stdin.end();
        });
    }

    private _ensurePanel() {
        if (this.panel) {
            this.panel.reveal(vscode.ViewColumn.Two);
            return;
        }

        this.panel = vscode.window.createWebviewPanel('gitDiffAnalysis', 'Git Diff Analysis', vscode.ViewColumn.Two, {
            enableScripts: true,
            retainContextWhenHidden: true,
            localResourceRoots: [vscode.Uri.joinPath(this.context.extensionUri, 'images')]
        });

        this.panel.onDidDispose(
            () => {
                this.panel = undefined;
            },
            null,
            this.context.subscriptions
        );

        this.panel.webview.onDidReceiveMessage(
            async (message: WebviewMessage) => {
                switch (message.command) {
                    case 'openFile': {
                        if (!vscode.workspace.workspaceFolders || !message.file) {
                            return;
                        }
                        const uri = vscode.Uri.joinPath(vscode.workspace.workspaceFolders[0].uri, message.file);
                        await vscode.window.showTextDocument(uri);
                        break;
                    }
                    case 'showDiff': {
                        if (!vscode.workspace.workspaceFolders || !message.file) {
                            return;
                        }
                        const uri = vscode.Uri.joinPath(vscode.workspace.workspaceFolders[0].uri, message.file);
                        await vscode.commands.executeCommand('git.openChange', uri);
                        break;
                    }
                    case 'refresh':
                        this.analyzeChanges('all');
                        break;
                }
            },
            null,
            this.context.subscriptions
        );
    }

    private showPendingResults() {
        this._ensurePanel();
        if (this.panel) {
            this.panel.webview.html = WebviewContent.getLoadingContent();
        }
    }

    private updateResults(analysis: AnalysisData) {
        this._ensurePanel();
        if (this.panel) {
            try {
                const iconUri = this.panel.webview.asWebviewUri(
                    vscode.Uri.joinPath(this.context.extensionUri, 'images', 'icon_64.ico')
                );
                this.panel.webview.html = WebviewContent.getRawResponseContent(analysis, iconUri.toString());
            } catch (error: any) {
                this.panel.webview.html = WebviewContent.getErrorContent(error);
            }
        }
    }

    private async checkClaudeInstallation() {
        try {
            await execAsync('claude', ['--version']);
        } catch (error) {
            const selection = await vscode.window.showErrorMessage(
                'Claude CLI is not installed or not in your system.',
                'Install Guide',
                'Retry'
            );
            if (selection === 'Install Guide') {
                vscode.env.openExternal(
                    vscode.Uri.parse('https://support.anthropic.com/en/articles/8979357-claude-command-line-tool')
                );
            }
            throw new Error('Claude CLI not available');
        }
    }

    private handleError(error: any) {
        vscode.window.showErrorMessage(`Analysis failed: ${error.message}`);
    }
}

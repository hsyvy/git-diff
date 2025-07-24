import * as vscode from 'vscode';
import { GitDiffAnalyzer } from './analyzer';
import { GitDiffViewProvider } from './tree-view';

export function activate(context: vscode.ExtensionContext) {
    const analyzer = new GitDiffAnalyzer(context);
    const provider = new GitDiffViewProvider(analyzer);

    // Register tree data provider for the view
    context.subscriptions.push(vscode.window.registerTreeDataProvider('gitDiff.mainView', provider));

    context.subscriptions.push(
        vscode.commands.registerCommand('gitDiff.analyze', () => analyzer.analyzeChanges('all')),
        vscode.commands.registerCommand('gitDiff.analyzeStaged', () => analyzer.analyzeChanges('staged')),
        vscode.commands.registerCommand('gitDiff.analyzeFile', uri => analyzer.analyzeFile(uri)),
        vscode.commands.registerCommand('gitDiff.refresh', () => provider.refresh()),
        vscode.commands.registerCommand('gitDiff.showLastAnalysis', () => analyzer.showLastAnalysis())
    );

    // Add status bar item
    const statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);
    statusBar.text = '$(git-compare) Git Diff';
    statusBar.command = 'gitDiff.analyze';
    statusBar.tooltip = 'Analyze git changes with Claude';
    statusBar.show();
    context.subscriptions.push(statusBar);
}

export function deactivate() {
    // Cleanup is handled by VS Code's disposal of subscriptions
}

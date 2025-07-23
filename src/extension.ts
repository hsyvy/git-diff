import * as vscode from 'vscode';
import { ClaudeDiffAnalyzer } from './analyzer';
import { ClaudeDiffViewProvider } from './tree-view';

export function activate(context: vscode.ExtensionContext) {
    const analyzer = new ClaudeDiffAnalyzer(context);
    const provider = new ClaudeDiffViewProvider(analyzer);

    // Register tree data provider for the view
    context.subscriptions.push(vscode.window.registerTreeDataProvider('claudeDiff.mainView', provider));

    context.subscriptions.push(
        vscode.commands.registerCommand('claudeDiff.analyze', () => analyzer.analyzeChanges('all')),
        vscode.commands.registerCommand('claudeDiff.analyzeStaged', () => analyzer.analyzeChanges('staged')),
        vscode.commands.registerCommand('claudeDiff.analyzeFile', uri => analyzer.analyzeFile(uri)),
        vscode.commands.registerCommand('claudeDiff.refresh', () => provider.refresh()),
        vscode.commands.registerCommand('claudeDiff.showLastAnalysis', () => analyzer.showLastAnalysis())
    );

    // Add status bar item
    const statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);
    statusBar.text = '$(hubot) Claude Diff';
    statusBar.command = 'claudeDiff.analyze';
    statusBar.tooltip = 'Analyze git changes with Claude';
    statusBar.show();
    context.subscriptions.push(statusBar);
}

export function deactivate() {
    // Cleanup is handled by VS Code's disposal of subscriptions
}

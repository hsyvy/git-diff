/* eslint-disable indent */
import * as vscode from 'vscode';
import { GitDiffAnalyzer } from './analyzer';

export class GitDiffViewProvider implements vscode.TreeDataProvider<DiffItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<DiffItem | undefined | null | void> = new vscode.EventEmitter<
        DiffItem | undefined | null | void
    >();
    readonly onDidChangeTreeData: vscode.Event<DiffItem | undefined | null | void> = this._onDidChangeTreeData.event;

    constructor(_analyzer: GitDiffAnalyzer) {
        // Analyzer is passed for potential future use
    }

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: DiffItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: DiffItem): Thenable<DiffItem[]> {
        if (!element) {
            return Promise.resolve([
                new DiffItem('Analyze All Changes', 'analyze-all', vscode.TreeItemCollapsibleState.None, {
                    command: 'gitDiff.analyze',
                    title: 'Analyze All Changes'
                }),
                new DiffItem('Analyze Staged Changes', 'analyze-staged', vscode.TreeItemCollapsibleState.None, {
                    command: 'gitDiff.analyzeStaged',
                    title: 'Analyze Staged Changes'
                }),
                new DiffItem('View Last Analysis', 'view-last', vscode.TreeItemCollapsibleState.None, {
                    command: 'gitDiff.showLastAnalysis',
                    title: 'View Last Analysis'
                })
            ]);
        }
        return Promise.resolve([]);
    }
}

export class DiffItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly id: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly command?: vscode.Command
    ) {
        super(label, collapsibleState);
        this.tooltip = this.label;
        this.contextValue = id;

        switch (id) {
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

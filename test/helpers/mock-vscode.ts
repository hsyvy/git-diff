/* eslint-disable @typescript-eslint/no-explicit-any */
import * as sinon from 'sinon';

export const mockVscode = {
    window: {
        showErrorMessage: sinon.stub(),
        showWarningMessage: sinon.stub(),
        showInformationMessage: sinon.stub(),
        createWebviewPanel: sinon.stub(),
        createStatusBarItem: sinon.stub(),
        createTreeDataProvider: sinon.stub(),
        registerTreeDataProvider: sinon.stub(),
        withProgress: sinon.stub(),
        showTextDocument: sinon.stub()
    },
    commands: {
        registerCommand: sinon.stub(),
        executeCommand: sinon.stub()
    },
    workspace: {
        getConfiguration: sinon.stub(),
        workspaceFolders: [],
        asRelativePath: sinon.stub()
    },
    Uri: {
        parse: sinon.stub(),
        joinPath: sinon.stub(),
        file: sinon.stub()
    },
    env: {
        openExternal: sinon.stub()
    },
    TreeItem: class MockTreeItem {
        label: string;
        collapsibleState: any;
        command?: any;
        tooltip?: string;
        contextValue?: string;
        iconPath?: any;

        constructor(label: string, collapsibleState: any) {
            this.label = label;
            this.collapsibleState = collapsibleState;
        }
    },
    TreeItemCollapsibleState: {
        None: 0,
        Collapsed: 1,
        Expanded: 2
    },
    ThemeIcon: class MockThemeIcon {
        constructor(public id: string) {}
    },
    EventEmitter: class MockEventEmitter {
        event = sinon.stub();
        fire = sinon.stub();
    },
    StatusBarAlignment: {
        Left: 1,
        Right: 2
    },
    ViewColumn: {
        One: 1,
        Two: 2,
        Three: 3
    },
    ProgressLocation: {
        Notification: 15,
        Window: 10,
        SourceControl: 1
    },
    CancellationTokenSource: class MockCancellationTokenSource {
        token = {
            isCancellationRequested: false,
            onCancellationRequested: sinon.stub()
        };
        cancel = sinon.stub();
        dispose = sinon.stub();
    }
};

export function createMockContext() {
    return {
        subscriptions: [],
        extensionUri: { fsPath: '/mock/extension/path' },
        extensionPath: '/mock/extension/path',
        globalState: {
            get: sinon.stub(),
            update: sinon.stub()
        },
        workspaceState: {
            get: sinon.stub(),
            update: sinon.stub()
        },
        asAbsolutePath: sinon.stub().returnsArg(0)
    };
}

export function createMockWebviewPanel() {
    const panel = {
        webview: {
            html: '',
            onDidReceiveMessage: sinon.stub(),
            asWebviewUri: sinon.stub().returns({ toString: () => 'mock://uri' })
        },
        onDidDispose: sinon.stub(),
        reveal: sinon.stub(),
        dispose: sinon.stub()
    };
    return panel;
}

export function resetMocks() {
    // Reset all stubs
    Object.values(mockVscode.window).forEach((stub: any) => {
        if (stub && typeof stub.reset === 'function') stub.reset();
    });
    Object.values(mockVscode.commands).forEach((stub: any) => {
        if (stub && typeof stub.reset === 'function') stub.reset();
    });
    Object.values(mockVscode.workspace).forEach((stub: any) => {
        if (stub && typeof stub.reset === 'function') stub.reset();
    });
}
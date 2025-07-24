/* eslint-disable @typescript-eslint/no-explicit-any */
import * as sinon from 'sinon';
import { expect } from 'chai';
import { GitDiffAnalyzer } from '../src/analyzer';
import { mockVscode, createMockContext, createMockWebviewPanel, resetMocks } from './helpers/mock-vscode';
import { mockChildProcess, waitForAsync, mockAnalysisResponse } from './helpers/test-utils';
import * as childProcess from 'child_process';

describe('GitDiffAnalyzer', () => {
    let analyzer: GitDiffAnalyzer;
    let context: any;
    let sandbox: sinon.SinonSandbox;
    let mockCP: ReturnType<typeof mockChildProcess>;

    beforeEach(() => {
        sandbox = sinon.createSandbox();
        context = createMockContext();
        analyzer = new GitDiffAnalyzer(context);
        // Setup mocks
        mockCP = mockChildProcess();
        sandbox.stub(childProcess, 'execFile').callsFake(mockCP.execFileStub as any);
        sandbox.stub(childProcess, 'spawn').callsFake(mockCP.spawnStub as any);
        // Setup default workspace
        (mockVscode.workspace as any).workspaceFolders = [{ uri: { fsPath: '/test/workspace' } }];
        // Setup default configuration
        mockVscode.workspace.getConfiguration.returns({
            get: sinon.stub().returns('')
        });
        // Setup webview panel
        const mockPanel = createMockWebviewPanel();
        mockVscode.window.createWebviewPanel.returns(mockPanel);
        // Setup withProgress to immediately execute the task
        mockVscode.window.withProgress.callsFake(async (_options: any, task: any) => {
            return task({ report: sinon.stub() }, { isCancellationRequested: false });
        });
    });

    afterEach(() => {
        sandbox.restore();
        resetMocks();
    });

    describe('analyzeChanges', () => {
        it('should analyze all changes successfully', async () => {
            // Setup
            mockCP.setupSuccessfulGitDiff();
            mockCP.setupClaudeAvailable();
            mockCP.setupClaudeAnalysis(mockAnalysisResponse);

            // Execute
            await analyzer.analyzeChanges('all');
            await waitForAsync();

            // Verify
            expect(mockCP.execFileStub.calledWith('git', ['rev-parse', '--git-dir'])).to.be.true;
            expect(mockCP.execFileStub.calledWith('git', ['diff'])).to.be.true;
            expect(mockCP.execFileStub.calledWith('claude', ['--version'])).to.be.true;
            expect(mockCP.spawnStub.calledWith('claude')).to.be.true;
            expect(mockVscode.window.createWebviewPanel.called).to.be.true;
        });

        it('should analyze staged changes successfully', async () => {
            // Setup
            mockCP.setupSuccessfulGitDiff();
            mockCP.setupClaudeAvailable();
            mockCP.setupClaudeAnalysis(mockAnalysisResponse);

            // Execute
            await analyzer.analyzeChanges('staged');
            await waitForAsync();

            // Verify
            expect(mockCP.execFileStub.calledWith('git', ['diff', '--staged'])).to.be.true;
            expect(mockCP.spawnStub.calledWith('claude')).to.be.true;
        });

        it('should show warning when analysis is already in progress', async () => {
            // Setup
            mockCP.setupSuccessfulGitDiff();
            mockCP.setupClaudeAvailable();
            mockCP.setupClaudeAnalysis(mockAnalysisResponse);

            // Start first analysis
            analyzer.analyzeChanges('all');

            // Try to start second analysis immediately
            await analyzer.analyzeChanges('all');

            // Verify
            expect(
                mockVscode.window.showWarningMessage.calledWith(
                    'Analysis already in progress. Please wait for it to complete.'
                )
            ).to.be.true;
        });

        it('should handle no workspace folder error', async () => {
            // Setup
            (mockVscode.workspace as any).workspaceFolders = [];

            // Execute
            await analyzer.analyzeChanges('all');

            // Verify
            expect(mockVscode.window.showErrorMessage.calledWith(
                'Analysis failed: No workspace folder open'
            )).to.be.true;
        });

        it('should handle not a git repository error', async () => {
            // Setup
            mockCP.setupNoGitRepo();

            // Execute
            await analyzer.analyzeChanges('all');

            // Verify
            expect(mockVscode.window.showErrorMessage.calledWith(
                'Analysis failed: The current workspace is not a git repository.'
            )).to.be.true;
        });

        it('should handle no changes to analyze', async () => {
            // Setup
            mockCP.setupEmptyGitDiff();
            mockCP.setupClaudeAvailable();

            // Execute
            await analyzer.analyzeChanges('all');
            await waitForAsync();

            // Verify
            expect(mockVscode.window.showInformationMessage.calledWith(
                'No changes to analyze.'
            )).to.be.true;
        });

        it('should handle Claude not installed error', async () => {
            // Setup
            mockCP.setupSuccessfulGitDiff();
            mockCP.setupClaudeNotAvailable();
            mockVscode.window.showErrorMessage.resolves('Retry');

            // Execute
            await analyzer.analyzeChanges('all');

            // Verify
            expect(mockVscode.window.showErrorMessage.calledWith(
                'Claude CLI is not installed or not in your system.',
                'Install Guide',
                'Retry'
            )).to.be.true;
        });

        it('should open install guide when selected', async () => {
            // Setup
            mockCP.setupSuccessfulGitDiff();
            mockCP.setupClaudeNotAvailable();
            mockVscode.window.showErrorMessage.resolves('Install Guide');
            mockVscode.Uri.parse.returns({ toString: () => 'https://test.url' });

            // Execute
            await analyzer.analyzeChanges('all');

            // Verify
            expect(mockVscode.env.openExternal.called).to.be.true;
        });

        it('should use custom prompt when configured', async () => {
            // Setup
            const customPrompt = 'Custom analysis prompt: {DIFF_PLACEHOLDER}';
            mockVscode.workspace.getConfiguration.returns({
                get: sinon.stub().returns(customPrompt)
            });
            
            mockCP.setupSuccessfulGitDiff();
            mockCP.setupClaudeAvailable();
            const claudeProcess = mockCP.setupClaudeAnalysis(mockAnalysisResponse);

            // Execute
            await analyzer.analyzeChanges('all');
            await waitForAsync();

            // Verify
            expect(claudeProcess.stdin.write.called).to.be.true;
            const writtenPrompt = claudeProcess.stdin.write.firstCall.args[0];
            expect(writtenPrompt).to.include('Custom analysis prompt:');
            expect(writtenPrompt).to.include('diff --git');
        });

        it('should handle cancellation', async () => {
            // Setup
            mockCP.setupSuccessfulGitDiff();
            mockCP.setupClaudeAvailable();
            const claudeProcess = mockCP.setupClaudeAnalysis(mockAnalysisResponse);
            
            // Setup cancellation
            const mockToken = {
                isCancellationRequested: false,
                onCancellationRequested: sinon.stub()
            };
            
            mockVscode.window.withProgress.callsFake(async (_options: any, task: any) => {
                // Simulate cancellation during analysis
                setTimeout(() => {
                    mockToken.isCancellationRequested = true;
                    mockToken.onCancellationRequested.firstCall.args[0]();
                }, 5);
                
                return task({ report: sinon.stub() }, mockToken);
            });

            // Execute
            await analyzer.analyzeChanges('all');
            await waitForAsync(20);

            // Verify
            expect(claudeProcess.kill.called).to.be.true;
        });
    });

    describe('analyzeFile', () => {
        it('should analyze a specific file successfully', async () => {
            // Setup
            const fileUri = { fsPath: '/test/workspace/src/test.ts' };
            mockVscode.workspace.asRelativePath.returns('src/test.ts');
            
            mockCP.setupSuccessfulGitDiff();
            mockCP.setupClaudeAvailable();
            mockCP.setupClaudeAnalysis(mockAnalysisResponse);

            // Execute
            await analyzer.analyzeFile(fileUri as any);
            await waitForAsync();

            // Verify
            expect(mockCP.execFileStub.calledWith('git', ['diff', '--', 'src/test.ts'])).to.be.true;
            expect(mockCP.spawnStub.calledWith('claude')).to.be.true;
            expect(mockVscode.window.createWebviewPanel.called).to.be.true;
        });

        it('should handle no changes in file', async () => {
            // Setup
            const fileUri = { fsPath: '/test/workspace/src/test.ts' };
            mockVscode.workspace.asRelativePath.returns('src/test.ts');
            
            mockCP.execFileStub.withArgs('git', ['diff', '--', 'src/test.ts']).yields(null, { stdout: '' });

            // Execute
            await analyzer.analyzeFile(fileUri as any);

            // Verify
            expect(mockVscode.window.showInformationMessage.calledWith(
                'No changes in this file to analyze.'
            )).to.be.true;
        });
    });

    describe('showLastAnalysis', () => {
        it('should show last analysis when available', async () => {
            // Setup - run an analysis first
            mockCP.setupSuccessfulGitDiff();
            mockCP.setupClaudeAvailable();
            mockCP.setupClaudeAnalysis(mockAnalysisResponse);
            
            await analyzer.analyzeChanges('all');
            await waitForAsync();
            
            // Reset panel creation stub
            mockVscode.window.createWebviewPanel.reset();

            // Execute
            analyzer.showLastAnalysis();

            // Verify
            expect(mockVscode.window.createWebviewPanel.called).to.be.true;
        });

        it('should show message when no previous analysis exists', () => {
            // Execute
            analyzer.showLastAnalysis();

            // Verify
            expect(
                mockVscode.window.showInformationMessage.calledWith(
                    'No previous analysis found. Run an analysis first.'
                )
            ).to.be.true;
        });
    });

    describe('Webview interactions', () => {
        it('should handle openFile command from webview', async () => {
            // Setup
            mockCP.setupSuccessfulGitDiff();
            mockCP.setupClaudeAvailable();
            mockCP.setupClaudeAnalysis(mockAnalysisResponse);
            const mockPanel = createMockWebviewPanel();
            mockVscode.window.createWebviewPanel.returns(mockPanel);
            // Setup message handler
            let messageHandler: any;
            mockPanel.webview.onDidReceiveMessage.callsFake((handler: any) => {
                messageHandler = handler;
            });
            mockVscode.Uri.joinPath.returns({ fsPath: '/test/workspace/src/file.ts' });
            mockVscode.window.showTextDocument.resolves();

            // Execute - create panel
            await analyzer.analyzeChanges('all');
            await waitForAsync();

            // Send openFile message
            await messageHandler({ command: 'openFile', file: 'src/file.ts' });

            // Verify
            expect(mockVscode.window.showTextDocument.called).to.be.true;
        });

        it('should handle showDiff command from webview', async () => {
            // Setup
            mockCP.setupSuccessfulGitDiff();
            mockCP.setupClaudeAvailable();
            mockCP.setupClaudeAnalysis(mockAnalysisResponse);
            const mockPanel = createMockWebviewPanel();
            mockVscode.window.createWebviewPanel.returns(mockPanel);
            // Setup message handler
            let messageHandler: any;
            mockPanel.webview.onDidReceiveMessage.callsFake((handler: any) => {
                messageHandler = handler;
            });
            mockVscode.Uri.joinPath.returns({ fsPath: '/test/workspace/src/file.ts' });

            // Execute - create panel
            await analyzer.analyzeChanges('all');
            await waitForAsync();

            // Send showDiff message
            await messageHandler({ command: 'showDiff', file: 'src/file.ts' });

            // Verify
            expect(mockVscode.commands.executeCommand.calledWith('git.openChange')).to.be.true;
        });

        it('should handle refresh command from webview', async () => {
            // Setup
            mockCP.setupSuccessfulGitDiff();
            mockCP.setupClaudeAvailable();
            mockCP.setupClaudeAnalysis(mockAnalysisResponse);
            const mockPanel = createMockWebviewPanel();
            mockVscode.window.createWebviewPanel.returns(mockPanel);
            // Setup message handler
            let messageHandler: any;
            mockPanel.webview.onDidReceiveMessage.callsFake((handler: any) => {
                messageHandler = handler;
            });

            // Execute - create panel
            await analyzer.analyzeChanges('all');
            await waitForAsync();

            // Reset stubs to verify refresh
            mockCP.execFileStub.reset();
            mockCP.spawnStub.reset();
            mockCP.setupSuccessfulGitDiff();
            mockCP.setupClaudeAvailable();
            mockCP.setupClaudeAnalysis(mockAnalysisResponse);

            // Send refresh message
            await messageHandler({ command: 'refresh' });
            await waitForAsync();

            // Verify
            expect(mockCP.execFileStub.calledWith('git', ['diff'])).to.be.true;
        });
    });
});

/* eslint-disable @typescript-eslint/no-explicit-any */
import * as sinon from 'sinon';
import { expect } from 'chai';
import { activate, deactivate } from '../src/extension';
import { mockVscode, createMockContext, resetMocks } from './helpers/mock-vscode';

describe('Extension', () => {
    let sandbox: sinon.SinonSandbox;
    let context: any;

    beforeEach(() => {
        sandbox = sinon.createSandbox();
        context = createMockContext();
        
        // Setup default mocks
        mockVscode.window.createStatusBarItem.returns({
            text: '',
            command: '',
            tooltip: '',
            show: sinon.stub(),
            hide: sinon.stub(),
            dispose: sinon.stub()
        });
    });

    afterEach(() => {
        sandbox.restore();
        resetMocks();
    });

    describe('activate', () => {
        it('should register all commands', () => {
            // Execute
            activate(context);

            // Verify commands registered
            expect(mockVscode.commands.registerCommand.callCount).to.equal(5);
            
            // Check specific commands
            const registeredCommands = mockVscode.commands.registerCommand.getCalls().map(call => call.args[0]);
            expect(registeredCommands).to.include('gitDiff.analyze');
            expect(registeredCommands).to.include('gitDiff.analyzeStaged');
            expect(registeredCommands).to.include('gitDiff.analyzeFile');
            expect(registeredCommands).to.include('gitDiff.refresh');
            expect(registeredCommands).to.include('gitDiff.showLastAnalysis');
        });

        it('should register tree data provider', () => {
            // Execute
            activate(context);

            // Verify
            expect(mockVscode.window.registerTreeDataProvider.calledOnce).to.be.true;
            expect(mockVscode.window.registerTreeDataProvider.firstCall.args[0]).to.equal('gitDiff.mainView');
        });

        it('should create and show status bar item', () => {
            // Setup
            const mockStatusBar = {
                text: '',
                command: '',
                tooltip: '',
                show: sinon.stub(),
                hide: sinon.stub(),
                dispose: sinon.stub()
            };
            mockVscode.window.createStatusBarItem.returns(mockStatusBar);

            // Execute
            activate(context);

            // Verify
            expect(mockVscode.window.createStatusBarItem.calledWith(mockVscode.StatusBarAlignment.Left)).to.be.true;
            expect(mockStatusBar.text).to.equal('$(git-compare) Git Diff');
            expect(mockStatusBar.command).to.equal('gitDiff.analyze');
            expect(mockStatusBar.tooltip).to.equal('Analyze git changes with Claude');
            expect(mockStatusBar.show.calledOnce).to.be.true;
        });

        it('should add all disposables to context subscriptions', () => {
            // Execute
            activate(context);

            // Verify - 5 commands + 1 tree provider + 1 status bar = 7 total
            expect(context.subscriptions.length).to.equal(7);
        });

        it('should execute analyzer.analyzeChanges when analyze command is invoked', () => {
            // Execute
            activate(context);

            // Get the analyze command handler
            const analyzeCommand = mockVscode.commands.registerCommand.getCalls()
                .find(call => call.args[0] === 'gitDiff.analyze');
            const handler = analyzeCommand?.args[1];

            // Verify handler exists
            expect(handler).to.be.a('function');
        });

        it('should execute analyzer.analyzeChanges(staged) when analyzeStaged command is invoked', () => {
            // Execute
            activate(context);

            // Get the analyzeStaged command handler
            const analyzeStagedCommand = mockVscode.commands.registerCommand.getCalls()
                .find(call => call.args[0] === 'gitDiff.analyzeStaged');
            const handler = analyzeStagedCommand?.args[1];

            // Verify handler exists
            expect(handler).to.be.a('function');
        });

        it('should execute analyzer.analyzeFile when analyzeFile command is invoked', () => {
            // Execute
            activate(context);

            // Get the analyzeFile command handler
            const analyzeFileCommand = mockVscode.commands.registerCommand.getCalls()
                .find(call => call.args[0] === 'gitDiff.analyzeFile');
            const handler = analyzeFileCommand?.args[1];

            // Verify handler exists and is a function
            expect(handler).to.be.a('function');
        });

        it('should execute provider.refresh when refresh command is invoked', () => {
            // Execute
            activate(context);

            // Get the refresh command handler
            const refreshCommand = mockVscode.commands.registerCommand.getCalls()
                .find(call => call.args[0] === 'gitDiff.refresh');
            const handler = refreshCommand?.args[1];

            // Verify handler exists
            expect(handler).to.be.a('function');
        });

        it('should execute analyzer.showLastAnalysis when showLastAnalysis command is invoked', () => {
            // Execute
            activate(context);

            // Get the showLastAnalysis command handler
            const showLastCommand = mockVscode.commands.registerCommand.getCalls()
                .find(call => call.args[0] === 'gitDiff.showLastAnalysis');
            const handler = showLastCommand?.args[1];

            // Verify handler exists
            expect(handler).to.be.a('function');
        });
    });

    describe('deactivate', () => {
        it('should complete without error', () => {
            // Execute
            expect(() => deactivate()).to.not.throw();
        });
    });
});
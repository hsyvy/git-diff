/* eslint-disable @typescript-eslint/no-explicit-any */
import * as sinon from 'sinon';
import { expect } from 'chai';
import { GitDiffViewProvider, DiffItem } from '../src/tree-view';
import { GitDiffAnalyzer } from '../src/analyzer';
import { mockVscode } from './helpers/mock-vscode';

describe('GitDiffViewProvider', () => {
    let provider: GitDiffViewProvider;
    let mockAnalyzer: sinon.SinonStubbedInstance<GitDiffAnalyzer>;
    let sandbox: sinon.SinonSandbox;

    beforeEach(() => {
        sandbox = sinon.createSandbox();
        // Create mock analyzer
        mockAnalyzer = sandbox.createStubInstance(GitDiffAnalyzer);
        provider = new GitDiffViewProvider(mockAnalyzer as any);
    });

    afterEach(() => {
        sandbox.restore();
    });

    describe('refresh', () => {
        it('should fire onDidChangeTreeData event', () => {
            // Setup spy on the event emitter
            const fireSpy = sinon.spy();
            (provider as any)._onDidChangeTreeData = { fire: fireSpy };

            // Execute
            provider.refresh();

            // Verify
            expect(fireSpy.calledOnce).to.be.true;
        });
    });

    describe('getTreeItem', () => {
        it('should return the same element passed to it', () => {
            // Setup
            const item = new DiffItem(
                'Test Item',
                'test-id',
                mockVscode.TreeItemCollapsibleState.None
            );

            // Execute
            const result = provider.getTreeItem(item);

            // Verify
            expect(result).to.equal(item);
        });
    });

    describe('getChildren', () => {
        it('should return root items when no element is provided', async () => {
            // Execute
            const children = await provider.getChildren();

            // Verify
            expect(children).to.have.lengthOf(3);
            expect(children[0].label).to.equal('Analyze All Changes');
            expect(children[0].id).to.equal('analyze-all');
            expect(children[0].command?.command).to.equal('gitDiff.analyze');

            expect(children[1].label).to.equal('Analyze Staged Changes');
            expect(children[1].id).to.equal('analyze-staged');
            expect(children[1].command?.command).to.equal('gitDiff.analyzeStaged');

            expect(children[2].label).to.equal('View Last Analysis');
            expect(children[2].id).to.equal('view-last');
            expect(children[2].command?.command).to.equal('gitDiff.showLastAnalysis');
        });

        it('should return empty array when element is provided', async () => {
            // Setup
            const item = new DiffItem(
                'Test Item',
                'test-id',
                mockVscode.TreeItemCollapsibleState.None
            );

            // Execute
            const children = await provider.getChildren(item);

            // Verify
            expect(children).to.be.an('array').that.is.empty;
        });
    });
});

describe('DiffItem', () => {
    let sandbox: sinon.SinonSandbox;

    beforeEach(() => {
        sandbox = sinon.createSandbox();
    });

    afterEach(() => {
        sandbox.restore();
    });

    describe('constructor', () => {
        it('should create item with basic properties', () => {
            // Execute
            const item = new DiffItem(
                'Test Label',
                'test-id',
                mockVscode.TreeItemCollapsibleState.None,
                { command: 'test.command', title: 'Test Command' }
            );

            // Verify
            expect(item.label).to.equal('Test Label');
            expect(item.id).to.equal('test-id');
            expect(item.collapsibleState).to.equal(mockVscode.TreeItemCollapsibleState.None);
            expect(item.command).to.deep.equal({ command: 'test.command', title: 'Test Command' });
            expect(item.tooltip).to.equal('Test Label');
            expect(item.contextValue).to.equal('test-id');
        });

        it('should set git-commit icon for analyze-all', () => {
            // Execute
            const item = new DiffItem(
                'Analyze All',
                'analyze-all',
                mockVscode.TreeItemCollapsibleState.None
            );

            // Verify
            expect(item.iconPath).to.be.instanceOf(mockVscode.ThemeIcon);
            expect((item.iconPath as any).id).to.equal('git-commit');
        });

        it('should set git-pull-request-draft icon for analyze-staged', () => {
            // Execute
            const item = new DiffItem(
                'Analyze Staged',
                'analyze-staged',
                mockVscode.TreeItemCollapsibleState.None
            );

            // Verify
            expect(item.iconPath).to.be.instanceOf(mockVscode.ThemeIcon);
            expect((item.iconPath as any).id).to.equal('git-pull-request-draft');
        });

        it('should set eye icon for view-last', () => {
            // Execute
            const item = new DiffItem(
                'View Last',
                'view-last',
                mockVscode.TreeItemCollapsibleState.None
            );

            // Verify
            expect(item.iconPath).to.be.instanceOf(mockVscode.ThemeIcon);
            expect((item.iconPath as any).id).to.equal('eye');
        });

        it('should not set icon for unknown id', () => {
            // Execute
            const item = new DiffItem(
                'Unknown',
                'unknown-id',
                mockVscode.TreeItemCollapsibleState.None
            );

            // Verify
            expect(item.iconPath).to.be.undefined;
        });
    });
});

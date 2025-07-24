/* eslint-disable @typescript-eslint/no-explicit-any */
import { expect } from 'chai';
import { WebviewContent } from '../src/webview-content';
import { AnalysisData } from '../src/types';

describe('WebviewContent', () => {
    describe('getLoadingContent', () => {
        it('should return valid loading HTML', () => {
            // Execute
            const html = WebviewContent.getLoadingContent();

            // Verify
            expect(html).to.include('<!DOCTYPE html>');
            expect(html).to.include('Analyzing with Claude...');
            expect(html).to.include('spinner');
            expect(html).to.include('Please wait while Claude analyzes your git changes');
            expect(html).to.include('@keyframes spin');
        });

        it('should include proper CSS variables for VS Code theming', () => {
            // Execute
            const html = WebviewContent.getLoadingContent();

            // Verify
            expect(html).to.include('var(--vscode-font-family)');
            expect(html).to.include('var(--vscode-foreground)');
            expect(html).to.include('var(--vscode-editor-background)');
            expect(html).to.include('var(--vscode-panel-border)');
            expect(html).to.include('var(--vscode-focusBorder)');
        });
    });

    describe('getRawResponseContent', () => {
        it('should return valid HTML with analysis content', () => {
            // Setup
            const analysis: AnalysisData = {
                response: '## Summary\n\nTest analysis response',
                timestamp: '2024-01-01T12:00:00Z',
                diffLength: 1234
            };
            const iconUri = 'https://test.icon.uri';

            // Execute
            const html = WebviewContent.getRawResponseContent(analysis, iconUri);

            // Verify
            expect(html).to.include('<!DOCTYPE html>');
            expect(html).to.include('<h2>Summary</h2>');
            expect(html).to.include('Test analysis response');
            expect(html).to.include(iconUri);
        });

        it('should format timestamp correctly', () => {
            // Setup
            const analysis: AnalysisData = {
                response: 'Test response',
                timestamp: '2024-01-01T12:00:00Z',
                diffLength: 100
            };

            // Execute
            const html = WebviewContent.getRawResponseContent(analysis, 'icon.uri');

            // Verify
            const date = new Date(analysis.timestamp).toLocaleString();
            expect(html).to.include(date);
        });

        it('should display diff length', () => {
            // Setup
            const analysis: AnalysisData = {
                response: 'Test response',
                timestamp: '2024-01-01T12:00:00Z',
                diffLength: 5678
            };

            // Execute
            const html = WebviewContent.getRawResponseContent(analysis, 'icon.uri');
            // Verify
            expect(html).to.include('5,678 characters analyzed');
        });

        it('should handle missing response gracefully', () => {
            // Setup
            const analysis: AnalysisData = {
                response: '',
                timestamp: '2024-01-01T12:00:00Z',
                diffLength: 0
            };

            // Execute
            const html = WebviewContent.getRawResponseContent(analysis, 'icon.uri');

            // Verify
            expect(html).to.include('No response');
        });

        it('should parse markdown sections correctly', () => {
            // Setup
            const markdownResponse = `## Summary
Test summary

## Impact Assessment
**Impact Level:** High

## File Changes
### \`src/test.ts\`
File changes here

## Issues Detected
### 🔒 Security Issues
- SQL injection vulnerability`;

            const analysis: AnalysisData = {
                response: markdownResponse,
                timestamp: '2024-01-01T12:00:00Z',
                diffLength: 1000
            };

            // Execute
            const html = WebviewContent.getRawResponseContent(analysis, 'icon.uri');

            // Verify
            expect(html).to.include('<h2>Summary</h2>');
            expect(html).to.include('<h2>Impact Assessment</h2>');
            expect(html).to.include('<h2>File Changes</h2>');
            expect(html).to.include('<h3><code>src/test.ts</code></h3>');
            expect(html).to.include('Security Issues');
            expect(html).to.include('SQL injection vulnerability');
        });

        it('should include webview message handling script', () => {
            // Setup
            const analysis: AnalysisData = {
                response: 'Test',
                timestamp: '2024-01-01T12:00:00Z',
                diffLength: 100
            };

            // Execute
            const html = WebviewContent.getRawResponseContent(analysis, 'icon.uri');

            // Verify
            expect(html).to.include('vscode.postMessage');
            expect(html).to.include('openFile');
        });

        it('should apply special styling for critical sections', () => {
            // Setup
            const analysis: AnalysisData = {
                response: '### Critical Issues\nTest critical',
                timestamp: '2024-01-01T12:00:00Z',
                diffLength: 100
            };

            // Execute
            const html = WebviewContent.getRawResponseContent(analysis, 'icon.uri');

            // Verify
            expect(html).to.include('critical-section');
            expect(html).to.include('var(--vscode-editorError-foreground)');
        });

        it('should apply special styling for warning sections', () => {
            // Setup
            const analysis: AnalysisData = {
                response: '### Warnings\nTest warning',
                timestamp: '2024-01-01T12:00:00Z',
                diffLength: 100
            };

            // Execute
            const html = WebviewContent.getRawResponseContent(analysis, 'icon.uri');

            // Verify
            expect(html).to.include('warning-section');
            expect(html).to.include('var(--vscode-editorWarning-foreground)');
        });
    });

    describe('getErrorContent', () => {
        it('should return error HTML with error message', () => {
            // Setup
            const error = new Error('Test error message');

            // Execute
            const html = WebviewContent.getErrorContent(error);

            // Verify
            expect(html).to.include('<!DOCTYPE html>');
            expect(html).to.include('Test error message');
            expect(html).to.include('error-container');
        });

        it('should include retry button', () => {
            // Setup
            const error = new Error('Connection failed');

            // Execute
            const html = WebviewContent.getErrorContent(error);

            // Verify
            expect(html).to.include('Try Again');
            // eslint-disable-next-line quotes
            expect(html).to.include(`command: 'refresh'`);
        });

        it('should handle errors with no message', () => {
            // Setup
            const error = {};

            // Execute
            const html = WebviewContent.getErrorContent(error);

            // Verify
            expect(html).to.include('unknown error occurred');
        });

        it('should escape HTML in error messages', () => {
            // Setup
            const error = new Error('<script>alert("xss")</script>');

            // Execute
            const html = WebviewContent.getErrorContent(error);

            // Verify
            expect(html).to.include('<script>alert("xss")</script>');
        });
    });

    describe('parseMarkdown', () => {
        it('should handle file path formatting in backticks', () => {
            // Setup
            const analysis: AnalysisData = {
                response: 'Changes in `src/components/Button.tsx` file',
                timestamp: '2024-01-01T12:00:00Z',
                diffLength: 100
            };

            // Execute
            const html = WebviewContent.getRawResponseContent(analysis, 'icon.uri');

            // Verify
            expect(html).to.include('<code>src/components/Button.tsx</code>');
        });

        it('should preserve code blocks', () => {
            // Setup
            const analysis: AnalysisData = {
                response: '```typescript\nconst x = 42;\n```',
                timestamp: '2024-01-01T12:00:00Z',
                diffLength: 100
            };

            // Execute
            const html = WebviewContent.getRawResponseContent(analysis, 'icon.uri');

            // Verify
            expect(html).to.include('<pre>');
            expect(html).to.include('<code');
            expect(html).to.include('const x = 42;');
        });

        it('should convert lists properly', () => {
            // Setup
            const analysis: AnalysisData = {
                response: '- Item 1\n- Item 2\n- Item 3',
                timestamp: '2024-01-01T12:00:00Z',
                diffLength: 100
            };

            // Execute
            const html = WebviewContent.getRawResponseContent(analysis, 'icon.uri');

            // Verify
            expect(html).to.include('<ul>');
            expect(html).to.include('<li>Item 1</li>');
            expect(html).to.include('<li>Item 2</li>');
            expect(html).to.include('<li>Item 3</li>');
        });
    });
});

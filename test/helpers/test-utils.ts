import * as sinon from 'sinon';

export function mockChildProcess() {
    const execFileStub = sinon.stub();
    const spawnStub = sinon.stub();

    // Mock successful git diff output
    const mockGitDiff = `diff --git a/src/test.ts b/src/test.ts
index 1234567..abcdefg 100644
--- a/src/test.ts
+++ b/src/test.ts
@@ -1,3 +1,4 @@
+import { something } from './somewhere';
 export function test() {
-    console.log('old');
+    console.log('new');
 }`;

    return {
        execFileStub,
        spawnStub,
        mockGitDiff,
        setupSuccessfulGitDiff: () => {
            execFileStub.withArgs('git', ['diff']).yields(null, { stdout: mockGitDiff });
            execFileStub.withArgs('git', ['diff', '--staged']).yields(null, { stdout: mockGitDiff });
            execFileStub.withArgs('git', ['rev-parse', '--git-dir']).yields(null, { stdout: '.git' });
        },
        setupEmptyGitDiff: () => {
            execFileStub.withArgs('git', ['diff']).yields(null, { stdout: '' });
            execFileStub.withArgs('git', ['diff', '--staged']).yields(null, { stdout: '' });
            execFileStub.withArgs('git', ['rev-parse', '--git-dir']).yields(null, { stdout: '.git' });
        },
        setupNoGitRepo: () => {
            execFileStub.withArgs('git', ['rev-parse', '--git-dir']).yields(new Error('Not a git repository'));
        },
        setupClaudeAvailable: () => {
            execFileStub.withArgs('claude', ['--version']).yields(null, { stdout: 'Claude CLI 1.0.0' });
        },
        setupClaudeNotAvailable: () => {
            execFileStub.withArgs('claude', ['--version']).yields(new Error('Command not found'));
        },
        setupClaudeAnalysis: (response: string) => {
            const mockProcess = {
                stdout: { on: sinon.stub() },
                stderr: { on: sinon.stub() },
                stdin: { write: sinon.stub(), end: sinon.stub() },
                on: sinon.stub(),
                kill: sinon.stub()
            };

            // Setup stdout data event
            mockProcess.stdout.on.withArgs('data').yields(Buffer.from(response));
            // Setup close event
            mockProcess.on.withArgs('close').yields(0);

            spawnStub.withArgs('claude').returns(mockProcess);
            return mockProcess;
        }
    };
}

export function waitForAsync(ms: number = 10): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export const mockAnalysisResponse = `## Summary

The changes update the test function to use a new import and modify console output.

## Impact Assessment

**Impact Level:** Low

Simple refactoring with minimal impact.

## File Changes

### \`src/test.ts\`

**Changes:** Added import and updated console message

**Key modifications:**
- Added new import statement
- Changed console output from 'old' to 'new'

**Potential issues:** None identified

## Issues Detected

### 🔒 Security Issues

None detected

### 🔌 Integration Issues

None detected

### 🧪 Testing Gaps

- No tests updated for the changed function

### 💡 Code Quality

None detected

## Overall Assessment

### Critical Issues

None

### Warnings

None

### Recommendations

- Update tests to cover the modified function`;

export function createSampleDiff(): string {
    return `diff --git a/src/example.ts b/src/example.ts
index 1234567..abcdefg 100644
--- a/src/example.ts
+++ b/src/example.ts
@@ -1,5 +1,6 @@
+import { newDependency } from './new-module';
 export class Example {
     constructor() {
-        this.value = 'old';
+        this.value = 'new';
     }
 }`;
}
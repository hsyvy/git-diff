# Git Diff Extension Tests

This directory contains the test suite for the Git Diff VS Code extension.

## Structure

```
test/
├── analyzer.test.ts         # Tests for GitDiffAnalyzer
├── tree-view.test.ts        # Tests for GitDiffViewProvider
├── webview-content.test.ts  # Tests for WebviewContent
├── extension.test.ts        # Tests for extension activation
├── helpers/
│   ├── mock-vscode.ts       # Mock VS Code API implementation
│   └── test-utils.ts        # Shared test utilities
├── fixtures/
│   └── sample-diff.txt      # Sample git diff for testing
├── suite/
│   └── index.ts             # Test suite runner
├── setup.ts                 # Test setup (mocks vscode module)
└── runTest.ts               # VS Code test runner
```

## Running Tests

### Unit Tests
Run unit tests in watch mode:
```bash
npm run test:unit
```

Run tests once:
```bash
npm run test:unit
```

Watch mode for development:
```bash
npm run test:watch
```

### Integration Tests
Run full VS Code extension tests:
```bash
npm test
```

## Test Implementation

The tests use:
- **Mocha** as the test framework
- **Chai** for assertions
- **Sinon** for mocking and stubbing
- **@vscode/test-electron** for VS Code integration tests

### Key Features

1. **VS Code API Mocking**: The `mock-vscode.ts` file provides a complete mock of the VS Code API, allowing unit tests to run without the actual VS Code environment.

2. **Child Process Mocking**: The test utilities mock git and claude CLI commands to test the analyzer without external dependencies.

3. **Test Coverage**: Tests cover:
   - Command registration and execution
   - Git diff analysis workflow
   - Error handling scenarios
   - Webview content generation
   - Tree view data provider

## Known Issues

Some WebviewContent tests are currently failing due to differences between the test expectations and the actual implementation. These tests expect specific content that may have been updated in the implementation:

- "Git Diff Analysis Results" title
- Error page structure
- Markdown parsing features

To fix these, either:
1. Update the tests to match the current implementation
2. Update the implementation to match the test expectations

## Adding New Tests

1. Create a new test file in the `test/` directory
2. Import necessary mocks from `helpers/`
3. Follow the existing test patterns
4. Run tests to ensure they pass

Example test structure:
```typescript
import { expect } from 'chai';
import * as sinon from 'sinon';
import { mockVscode, resetMocks } from './helpers/mock-vscode';

describe('MyComponent', () => {
    let sandbox: sinon.SinonSandbox;

    beforeEach(() => {
        sandbox = sinon.createSandbox();
    });

    afterEach(() => {
        sandbox.restore();
        resetMocks();
    });

    it('should do something', () => {
        // Test implementation
    });
});
```
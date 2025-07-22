# Claude Code Git Diff Analyzer

A VSCode extension that uses Claude CLI to analyze git diffs and display results in an intuitive visual interface.

## Features

- **AI-Powered Analysis**: Uses Claude to analyze git diffs for security issues, code quality, and potential problems
- **Multiple Analysis Options**:
  - Analyze all changes in working directory
  - Analyze only staged changes
  - Analyze specific files (right-click in Source Control)
- **Interactive Results**: 
  - Click file paths to open files
  - View diff statistics
  - See issue badges for each file
  - Overall analysis summary

## Prerequisites

1. **Claude CLI** must be installed and accessible in your PATH:
   ```bash
   # Install Claude CLI (if not already installed)
   # Visit https://claude.ai/code for installation instructions
   ```

2. **Git** must be installed and the workspace must be a git repository

## Installation

### From Source

1. Clone this repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Compile the extension:
   ```bash
   npm run compile
   ```
4. Package the extension:
   ```bash
   npm install -g vsce
   vsce package
   ```
5. Install the generated `.vsix` file in VS Code:
   - Open Command Palette (Cmd/Ctrl+Shift+P)
   - Run "Extensions: Install from VSIX..."
   - Select the generated `.vsix` file

### From VS Code Marketplace

(Coming soon)

## Usage

### Quick Start

1. Open a git repository in VS Code
2. Make some changes to your code
3. Click the robot icon (🤖) in the Source Control view toolbar
4. Wait for Claude to analyze your changes
5. Review the results in the webview panel

### Available Commands

- **Claude: Analyze All Changes** - Analyzes all unstaged changes
- **Claude: Analyze Staged Changes** - Analyzes only staged changes
- **Claude: Analyze This File** - Analyzes a specific file (available in context menu)

### Configuration

Configure the extension in VS Code settings:

- `claudeDiff.autoAnalyze`: Automatically analyze changes when opening repository (default: false)
- `claudeDiff.includeUntrackedFiles`: Include untracked files in analysis (default: false)

## How It Works

1. The extension runs `git diff` to get changes
2. Sends the diff to Claude using `claude -p` command
3. Claude analyzes the diff and returns structured JSON
4. Results are displayed in an interactive webview

## Troubleshooting

### "Claude is not installed or not in PATH"

Make sure Claude CLI is installed and accessible:
```bash
claude --version
```

If not installed, visit https://claude.ai/code for installation instructions.

### "No changes to analyze"

Make sure you have uncommitted changes in your git repository. The extension only analyzes uncommitted changes.

### Analysis fails or times out

- Check that Claude CLI is working properly
- Try analyzing smaller sets of changes
- Check VS Code's Output panel for error details

## Development

To contribute or modify the extension:

1. Clone the repository
2. Run `npm install`
3. Open in VS Code
4. Press F5 to launch a new VS Code window with the extension loaded
5. Make changes and reload the window to test

## License

MIT
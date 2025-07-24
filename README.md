# Claude-code Diff Visualizer/Analyzer for VS Code

A powerful VS Code extension that uses Claude AI to analyze your git changes and provide intelligent insights about code modifications, potential issues, and suggestions for improvement.

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![VS Code](https://img.shields.io/badge/VS%20Code-%5E1.98.0-blue)

## ✨ Features

- 🔍 **AI-Powered Analysis**: Leverages Claude's advanced AI capabilities to understand your code changes
- 📊 **Comprehensive Insights**: Get summaries, impact assessments, and issue detection for your git diffs
- 🎯 **Multiple Analysis Modes**: Analyze all changes, staged changes only, or individual files
- 🌐 **Rich Web View**: Beautiful, interactive display of analysis results
- ⚡ **Real-time Feedback**: Instant analysis with progress indicators
- 🔍 **Issue Detection**: Automatically identifies security, integration, testing, and quality issues
- 📋 **Raw Output Mode**: View Claude's complete analysis response for maximum detail
- ✏️ **Custom Prompts**: Customize the analysis prompt to match your specific needs

## 📋 Prerequisites

Before using this extension, you need to have Claude Code installed on your system:

1. **Install Claude Code** from the official website: [https://docs.anthropic.com/en/docs/claude-code/overview](https://docs.anthropic.com/en/docs/claude-code/overview)
2. **Verify installation** by running in your terminal:
   ```bash
   claude --version
   ```
3. **Git** must be installed and accessible in your PATH
4. Your workspace must be a **git repository**

## 📦 Installation

### From VSIX File
1. Download the latest `.vsix` file from the [Releases](https://github.com/yourusername/claude-code-git-diff-visualizer/releases) page
2. In VS Code:
   - Open Command Palette (`Cmd/Ctrl+Shift+P`)
   - Run "Extensions: Install from VSIX..."
   - Select the downloaded `.vsix` file

### From Source
1. Clone this repository:
   ```bash
   git clone https://github.com/yourusername/claude-code-git-diff-visualizer.git
   cd claude-code-git-diff-visualizer
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Build the extension:
   ```bash
   npm run compile
   ```
4. Package the extension:
   ```bash
   npm install -g vsce
   vsce package
   ```
5. Install the generated `.vsix` file using the steps above

### For Development
1. Clone and install dependencies as above
2. Open the project in VS Code
3. Press `F5` to run the extension in a new Extension Development Host window

## 🚀 Usage

### Quick Start

1. **Open a git repository** in VS Code
2. **Make some changes** to your code
3. **Click the "Git Diff" button** in the status bar
4. **Wait for analysis** while Claude reviews your changes
5. **Review results** in the interactive webview panel

### Available Commands

Access these commands through the Command Palette (`Cmd/Ctrl+Shift+P`):

- **`Git Diff: Analyze All Changes`** - Analyzes all uncommitted changes
- **`Git Diff: Analyze Staged Changes`** - Analyzes only staged changes  
- **`Git Diff: Show Last Analysis`** - Displays the most recent analysis results

### Context Menu Actions

- **Right-click a file** in the Source Control view and select **"Analyze This File"** to analyze individual files

### Understanding the Results

The analysis results show:

- **📝 Summary**: Overall description of your changes
- **🎯 Impact Level**: Assessment of change significance (High/Medium/Low)
- **📁 File Changes**: Detailed breakdown for each modified file
- **🔍 Key Changes**: Specific modifications highlighted
- **⚠️ Issues Detected**:
  - 🔒 Security concerns
  - 🔌 Integration issues
  - 🧪 Testing gaps
  - 💡 Code quality suggestions
- **💭 AI Recommendations**: Intelligent suggestions for improvement

## ⚙️ Configuration

Customize the extension through VS Code settings:

```json
{
  "gitDiff.autoAnalyze": false,          // Auto-analyze when opening repository
  "gitDiff.includeUntrackedFiles": false, // Include untracked files in analysis
  "gitDiff.customPrompt": ""             // Custom prompt for analysis (empty = use default)
}
```

Access settings via:
- Command Palette → "Preferences: Open Settings (UI)"
- Search for "Git Diff"

### Custom Prompts

You can customize the analysis prompt to focus on specific aspects:

1. **Edit Prompt**: Configure the prompt through settings (`gitDiff.customPrompt`)
2. **Use Placeholder**: Include `{DIFF_PLACEHOLDER}` in your prompt where the git diff should be inserted
3. **Save Options**: Choose to save globally (all projects) or per workspace

Example custom prompts:
- **Security Focus**: Focus on security vulnerabilities, authentication issues, and data exposure
- **Performance Review**: Analyze for performance bottlenecks, memory leaks, and optimization opportunities
- **Best Practices**: Check for code style, design patterns, and architectural consistency

## 🛠️ Development

### Building from Source

```bash
# Install dependencies
npm install

# Compile TypeScript
npm run compile

# Watch for changes during development
npm run watch

# Package extension
vsce package
```

### Contributing

We welcome contributions! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

For major changes, please open an issue first to discuss your ideas.

## 🔧 Troubleshooting

### "Claude CLI is not installed or not in PATH"
- Ensure Claude Code is installed: [Installation Guide](https://docs.anthropic.com/en/docs/claude-code/overview)
- Verify installation: `claude --version`
- Restart VS Code after installation

### "No changes to analyze"
- Ensure you have uncommitted changes in your git repository
- Check that you're in a git repository (`.git` folder exists)
- For staged analysis, ensure files are staged with `git add`

### Webview shows loading indefinitely
- Check VS Code Developer Console: Help → Toggle Developer Tools
- Look for error messages in the console
- Try refreshing with the "Refresh Analysis" button

### Analysis takes too long
- Large diffs may take more time to analyze
- Try analyzing specific files or staged changes only
- Check your internet connection (Claude requires connectivity)

## 📄 License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details.

## 🙏 Acknowledgments

- Thanks to all contributors and users

## 📞 Support

- **Report bugs**: [GitHub Issues](https://github.com/yourusername/claude-code-git-diff-visualizer/issues)
- **Request features**: [GitHub Discussions](https://github.com/yourusername/claude-code-git-diff-visualizer/discussions)
- **Get help**: [Documentation Wiki](https://github.com/yourusername/claude-code-git-diff-visualizer/wiki)

---

**Note**: This extension requires an active Claude Code installation. Claude Code is a separate product from Anthropic and requires its own setup.
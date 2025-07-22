# Change Log

All notable changes to the "Claude Diff Analyzer" extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2024-01-22

### Added
- Initial release of Claude Diff Analyzer
- AI-powered git diff analysis using Claude Code
- Support for analyzing all changes, staged changes, and individual files
- Interactive webview with rich formatting
- Raw response view showing Claude's complete analysis
- Progress notifications during analysis
- Status bar integration for quick access
- Context menu integration in Source Control view
- Configuration options for auto-analyze and untracked files
- Comprehensive error handling and user feedback
- Cross-platform support (Windows, macOS, Linux)

### Security
- Secure command execution using child_process.spawn
- HTML content sanitization to prevent XSS vulnerabilities
- No external dependencies beyond VS Code APIs

## [Unreleased]

### Planned Features
- Support for custom analysis prompts
- History of previous analyses
- Export analysis results to markdown/PDF
- Integration with VS Code's diff editor
- Batch analysis of multiple repositories
- Customizable issue severity thresholds
- Support for other AI providers
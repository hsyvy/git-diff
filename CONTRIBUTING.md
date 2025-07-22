# Contributing to Claude Diff Analyzer

Thank you for your interest in contributing to Claude Diff Analyzer! This document provides guidelines and instructions for contributing.

## Code of Conduct

Please be respectful and considerate in all interactions. We welcome contributors of all backgrounds and skill levels.

## How to Contribute

### Reporting Issues

1. Check if the issue already exists in the [issue tracker](https://github.com/yourusername/claude-code-git-diff-visualizer/issues)
2. If not, create a new issue with:
   - Clear title and description
   - Steps to reproduce
   - Expected vs actual behavior
   - VS Code version and OS
   - Any relevant error messages

### Suggesting Features

1. Open a [discussion](https://github.com/yourusername/claude-code-git-diff-visualizer/discussions) first
2. Describe the feature and its benefits
3. Consider implementation complexity
4. Wait for community feedback before starting work

### Pull Requests

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature-name`
3. Make your changes
4. Add/update tests if applicable
5. Update documentation
6. Commit with clear messages
7. Push to your fork
8. Open a pull request

## Development Setup

1. Clone your fork:
   ```bash
   git clone https://github.com/yourusername/claude-code-git-diff-visualizer.git
   cd claude-code-git-diff-visualizer
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Open in VS Code:
   ```bash
   code .
   ```

4. Run the extension:
   - Press `F5` to launch Extension Development Host
   - Make changes and reload window to test

## Code Guidelines

- Use TypeScript for all code
- Follow existing code style
- Add JSDoc comments for public APIs
- Keep functions focused and small
- Handle errors gracefully
- Sanitize user inputs

## Testing

- Test your changes manually in the Extension Development Host
- Verify all commands work as expected
- Test error scenarios
- Check both light and dark themes

## Commit Messages

Follow conventional commits:
- `feat:` New features
- `fix:` Bug fixes
- `docs:` Documentation changes
- `style:` Code style changes
- `refactor:` Code refactoring
- `test:` Test additions/changes
- `chore:` Build/tooling changes

Example: `feat: add support for analyzing specific line ranges`

## Release Process

Maintainers will:
1. Update version in package.json
2. Update CHANGELOG.md
3. Create a git tag
4. Build and publish to marketplace

## Questions?

Feel free to:
- Open a [discussion](https://github.com/yourusername/claude-code-git-diff-visualizer/discussions)
- Ask in issues
- Reach out to maintainers

Thank you for contributing! 🎉
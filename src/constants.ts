export const DEFAULT_PROMPT = `Analyze this git diff and provide a comprehensive markdown-formatted response.

Please structure your response EXACTLY as follows:

## Summary

Provide a brief overall summary of the changes.

## Impact Assessment

**Impact Level:** High / Medium / Low

Provide reasoning for the impact level.

## File Changes

For each file in the diff, create a subsection:

### \`path/to/file.ext\`

**Changes:** Brief description of what changed

**Key modifications:**
- First modification
- Second modification
- Continue listing key changes

**Potential issues:** Describe any concerns or write "None identified"

## Issues Detected

### 🔒 Security Issues

- List security issues here
- Or write "None detected"

### 🔌 Integration Issues

- List integration issues here
- Or write "None detected"

### 🧪 Testing Gaps

- List testing issues here
- Or write "None detected"

### 💡 Code Quality

- List code quality issues here
- Or write "None detected"

## Overall Assessment

### Critical Issues

- List critical issues here
- Or write "None"

### Warnings

- List warnings here
- Or write "None"

### Recommendations

- List recommendations here
- Or write "None"

IMPORTANT: Use proper markdown hierarchy with headers and subheaders. Do not flatten the structure into a single list.

Git diff:
{DIFF_PLACEHOLDER}`;

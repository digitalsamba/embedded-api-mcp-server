# ESLint Scripts Documentation

This directory contains scripts to help manage ESLint issues in the Digital Samba MCP Server codebase.

## Available Scripts

### 1. `eslint-fix.cjs`

The main ESLint analysis and fixing script that provides:

- **Analysis**: Scans the codebase and groups errors/warnings by rule
- **Auto-fix**: Attempts to automatically fix issues that can be fixed
- **Reporting**: Generates detailed JSON reports
- **Summary**: Provides clear summaries of issues found

#### Usage

```bash
# Basic analysis (no fixes applied)
npm run lint:analyze

# Analysis with automatic fixes
npm run lint:fix

# Generate detailed JSON report with verbose output
npm run lint:report

# Direct script usage with options
node scripts/eslint-fix.cjs [options]
```

#### Options

- `--fix`: Attempt to automatically fix issues
- `--json`: Save detailed JSON report with timestamp
- `--verbose`: Show detailed examples for each rule violation
- `--help`: Show help message

#### Example Output

```
🔍 Digital Samba MCP Server - ESLint Analysis

📊 Summary
Files analyzed: 42
Errors: 78 (in 23 files)
Warnings: 123 (in 23 files)

❌ Errors by Rule
@typescript-eslint/no-unused-vars (71 occurrences in 22 files)
prefer-const (4 occurrences in 1 files)
...
```

### 2. `eslint-manual-fixes.cjs`

A helper script that generates detailed guidance for manually fixing ESLint issues that cannot be auto-fixed.

#### Features

- Shows code context around each issue
- Groups issues by type and file
- Provides specific fix suggestions
- Generates a markdown report for reference

#### Usage

```bash
node scripts/eslint-manual-fixes.cjs
```

#### Output

1. **Console Output**: Interactive guide with code context
2. **Markdown File**: `eslint-manual-fixes-[timestamp].md` with all issues documented

### 3. `eslint-fix.bat`

Windows batch file wrapper for easier execution on Windows systems.

```batch
scripts\eslint-fix.bat --fix
```

## NPM Scripts

The following npm scripts are available in package.json:

```json
{
  "lint": "eslint src --ext .ts",              // Standard ESLint run
  "lint:analyze": "node scripts/eslint-fix.cjs", // Analysis only
  "lint:fix": "node scripts/eslint-fix.cjs --fix", // Analysis + auto-fix
  "lint:report": "node scripts/eslint-fix.cjs --json --verbose" // Full report
}
```

## Common Issues and Fixes

### 1. Unused Variables (`@typescript-eslint/no-unused-vars`)

**Options:**
- Remove the variable if truly unused
- Prefix with underscore: `_unusedVar`
- Add eslint-disable comment if needed for documentation

### 2. Explicit Any (`@typescript-eslint/no-explicit-any`)

**Options:**
- Replace with specific types
- Use `unknown` for truly unknown types
- Create interfaces for object shapes
- Use generics for flexible type-safe code

### 3. Prefer Const (`prefer-const`)

**Auto-fixable**: Variables that are never reassigned should use `const`

### 4. Useless Escape (`no-useless-escape`)

**Fix**: Remove unnecessary backslashes in strings/regexes

### 5. Constant Condition (`no-constant-condition`)

**Fix**: Replace with dynamic condition or refactor logic

## Workflow Recommendations

1. **Initial Analysis**: Run `npm run lint:analyze` to see current state
2. **Auto-fix**: Run `npm run lint:fix` to fix simple issues
3. **Manual Fixes**: Run `node scripts/eslint-manual-fixes.cjs` for guidance
4. **Verify**: Run `npm run lint` to confirm all issues are resolved

## Configuration

The ESLint configuration is in `.eslintrc.json`:

```json
{
  "parser": "@typescript-eslint/parser",
  "extends": [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended"
  ],
  "rules": {
    "@typescript-eslint/no-explicit-any": "warn",
    "@typescript-eslint/no-unused-vars": ["error", { "argsIgnorePattern": "^_" }]
  }
}
```

## Tips

1. **Incremental Fixes**: Fix one type of issue at a time
2. **Test After Fixes**: Run tests after making changes
3. **Commit Regularly**: Commit after fixing each category
4. **Use Type Annotations**: Add proper types instead of using `any`
5. **Document Exceptions**: Use eslint-disable comments sparingly with explanations
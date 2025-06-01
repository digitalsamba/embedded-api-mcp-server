#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m'
};

// Parse command line arguments
const args = process.argv.slice(2);
const fixType = args[0];
const dryRun = args.includes('--dry-run');

console.log(`${colors.cyan}${colors.bold}🔧 ESLint Batch Fix Tool${colors.reset}\n`);

if (!fixType || args.includes('--help')) {
  console.log(`${colors.bold}Usage:${colors.reset} node scripts/eslint-batch-fix.cjs <fix-type> [options]\n`);
  console.log(`${colors.bold}Fix Types:${colors.reset}`);
  console.log(`  unused-vars     Fix unused variables by prefixing with underscore`);
  console.log(`  any-to-unknown  Replace 'any' with 'unknown' where safe`);
  console.log(`  escape-chars    Remove unnecessary escape characters`);
  console.log(`  options-param   Fix unused 'options' parameters in constructors\n`);
  console.log(`${colors.bold}Options:${colors.reset}`);
  console.log(`  --dry-run       Show what would be fixed without making changes`);
  console.log(`  --help          Show this help message\n`);
  console.log(`${colors.bold}Examples:${colors.reset}`);
  console.log(`  node scripts/eslint-batch-fix.cjs unused-vars --dry-run`);
  console.log(`  node scripts/eslint-batch-fix.cjs options-param`);
  process.exit(0);
}

// Get ESLint results
function getESLintResults() {
  try {
    const output = execSync('npx eslint src --ext .ts --format json', { 
      encoding: 'utf8', 
      maxBuffer: 10 * 1024 * 1024 
    });
    return JSON.parse(output);
  } catch (error) {
    if (error.stdout) {
      try {
        return JSON.parse(error.stdout);
      } catch (parseError) {
        console.error(`${colors.red}Failed to parse ESLint output${colors.reset}`);
        process.exit(1);
      }
    }
    throw error;
  }
}

// Fix unused variables by prefixing with underscore
function fixUnusedVars(results) {
  console.log(`${colors.blue}Fixing unused variables...${colors.reset}\n`);
  let totalFixed = 0;

  results.forEach(file => {
    const unusedVarsIssues = file.messages.filter(m => m.ruleId === '@typescript-eslint/no-unused-vars');
    if (unusedVarsIssues.length === 0) return;

    const filePath = file.filePath;
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    // Sort issues by line/column in reverse order to avoid position shifts
    unusedVarsIssues.sort((a, b) => {
      if (b.line !== a.line) return b.line - a.line;
      return b.column - a.column;
    });

    unusedVarsIssues.forEach(issue => {
      // Extract variable name from message
      const match = issue.message.match(/'([^']+)'/);
      if (!match) return;
      
      const varName = match[1];
      
      // Skip if already prefixed with underscore
      if (varName.startsWith('_')) return;

      const lines = content.split('\n');
      const lineIndex = issue.line - 1;
      const line = lines[lineIndex];

      // Find the variable in the line and prefix with underscore
      const varRegex = new RegExp(`\\b${varName}\\b`);
      if (varRegex.test(line)) {
        const newLine = line.replace(varRegex, `_${varName}`);
        lines[lineIndex] = newLine;
        
        if (dryRun) {
          console.log(`${colors.yellow}Would fix:${colors.reset} ${path.relative(process.cwd(), filePath)}:${issue.line}`);
          console.log(`  ${colors.red}- ${line.trim()}${colors.reset}`);
          console.log(`  ${colors.green}+ ${newLine.trim()}${colors.reset}\n`);
        } else {
          modified = true;
          totalFixed++;
        }
      }
    });

    if (modified && !dryRun) {
      content = lines.join('\n');
      fs.writeFileSync(filePath, content);
      console.log(`${colors.green}✓${colors.reset} Fixed ${unusedVarsIssues.length} issues in ${path.relative(process.cwd(), filePath)}`);
    }
  });

  return totalFixed;
}

// Fix unused options parameters in constructors
function fixOptionsParam(results) {
  console.log(`${colors.blue}Fixing unused 'options' parameters...${colors.reset}\n`);
  let totalFixed = 0;

  results.forEach(file => {
    const optionsIssues = file.messages.filter(m => 
      m.ruleId === '@typescript-eslint/no-unused-vars' && 
      m.message.includes("'options'")
    );
    if (optionsIssues.length === 0) return;

    const filePath = file.filePath;
    let content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    let modified = false;

    optionsIssues.forEach(issue => {
      const lineIndex = issue.line - 1;
      const line = lines[lineIndex];

      // Fix constructor options parameter
      if (line.includes('constructor') && line.includes('options')) {
        const newLine = line.replace(/\boptions\b/, '_options');
        
        if (dryRun) {
          console.log(`${colors.yellow}Would fix:${colors.reset} ${path.relative(process.cwd(), filePath)}:${issue.line}`);
          console.log(`  ${colors.red}- ${line.trim()}${colors.reset}`);
          console.log(`  ${colors.green}+ ${newLine.trim()}${colors.reset}\n`);
        } else {
          lines[lineIndex] = newLine;
          modified = true;
          totalFixed++;
        }
      }
    });

    if (modified && !dryRun) {
      fs.writeFileSync(filePath, lines.join('\n'));
      console.log(`${colors.green}✓${colors.reset} Fixed ${optionsIssues.length} issues in ${path.relative(process.cwd(), filePath)}`);
    }
  });

  return totalFixed;
}

// Fix unnecessary escape characters
function fixEscapeChars(results) {
  console.log(`${colors.blue}Fixing unnecessary escape characters...${colors.reset}\n`);
  let totalFixed = 0;

  results.forEach(file => {
    const escapeIssues = file.messages.filter(m => m.ruleId === 'no-useless-escape');
    if (escapeIssues.length === 0) return;

    const filePath = file.filePath;
    let content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    let modified = false;

    escapeIssues.forEach(issue => {
      const lineIndex = issue.line - 1;
      const line = lines[lineIndex];

      // Remove unnecessary escapes (typically \/ in regex)
      const newLine = line.replace(/\\\//g, '/');
      
      if (newLine !== line) {
        if (dryRun) {
          console.log(`${colors.yellow}Would fix:${colors.reset} ${path.relative(process.cwd(), filePath)}:${issue.line}`);
          console.log(`  ${colors.red}- ${line.trim()}${colors.reset}`);
          console.log(`  ${colors.green}+ ${newLine.trim()}${colors.reset}\n`);
        } else {
          lines[lineIndex] = newLine;
          modified = true;
          totalFixed++;
        }
      }
    });

    if (modified && !dryRun) {
      fs.writeFileSync(filePath, lines.join('\n'));
      console.log(`${colors.green}✓${colors.reset} Fixed ${escapeIssues.length} issues in ${path.relative(process.cwd(), filePath)}`);
    }
  });

  return totalFixed;
}

// Replace simple 'any' with 'unknown' where safe
function fixAnyToUnknown(results) {
  console.log(`${colors.blue}Replacing 'any' with 'unknown' where safe...${colors.reset}\n`);
  console.log(`${colors.yellow}Note: This only replaces simple cases. Manual review recommended.${colors.reset}\n`);
  let totalFixed = 0;

  results.forEach(file => {
    const anyIssues = file.messages.filter(m => m.ruleId === '@typescript-eslint/no-explicit-any');
    if (anyIssues.length === 0) return;

    const filePath = file.filePath;
    let content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    let modified = false;

    anyIssues.forEach(issue => {
      const lineIndex = issue.line - 1;
      const line = lines[lineIndex];

      // Only replace simple ': any' declarations (not arrays or complex types)
      if (line.includes(': any') && !line.includes(': any[]') && !line.includes('Promise<any>')) {
        const newLine = line.replace(/: any\b/, ': unknown');
        
        if (dryRun) {
          console.log(`${colors.yellow}Would fix:${colors.reset} ${path.relative(process.cwd(), filePath)}:${issue.line}`);
          console.log(`  ${colors.red}- ${line.trim()}${colors.reset}`);
          console.log(`  ${colors.green}+ ${newLine.trim()}${colors.reset}\n`);
        } else {
          lines[lineIndex] = newLine;
          modified = true;
          totalFixed++;
        }
      }
    });

    if (modified && !dryRun) {
      fs.writeFileSync(filePath, lines.join('\n'));
      console.log(`${colors.green}✓${colors.reset} Fixed ${totalFixed} issues in ${path.relative(process.cwd(), filePath)}`);
    }
  });

  return totalFixed;
}

// Main execution
async function main() {
  try {
    const results = getESLintResults();
    let fixedCount = 0;

    switch (fixType) {
      case 'unused-vars':
        fixedCount = fixUnusedVars(results);
        break;
      case 'options-param':
        fixedCount = fixOptionsParam(results);
        break;
      case 'escape-chars':
        fixedCount = fixEscapeChars(results);
        break;
      case 'any-to-unknown':
        fixedCount = fixAnyToUnknown(results);
        break;
      default:
        console.error(`${colors.red}Unknown fix type: ${fixType}${colors.reset}`);
        process.exit(1);
    }

    if (dryRun) {
      console.log(`${colors.cyan}Dry run complete. No files were modified.${colors.reset}`);
    } else if (fixedCount > 0) {
      console.log(`\n${colors.green}${colors.bold}✅ Fixed ${fixedCount} issues!${colors.reset}`);
      console.log(`${colors.cyan}Run 'npm run lint' to verify the fixes.${colors.reset}`);
    } else {
      console.log(`${colors.yellow}No issues found for fix type: ${fixType}${colors.reset}`);
    }

  } catch (error) {
    console.error(`${colors.red}${colors.bold}❌ Error:${colors.reset}`);
    console.error(error.message);
    process.exit(1);
  }
}

// Run the main function
main();
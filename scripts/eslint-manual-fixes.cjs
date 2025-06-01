#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  bold: '\x1b[1m'
};

console.log(`${colors.cyan}${colors.bold}🔧 Digital Samba MCP Server - Manual ESLint Fixes Guide${colors.reset}\n`);

// Function to run ESLint and get detailed results
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

// Function to read file content around a specific line
function getCodeContext(filePath, line, contextLines = 3) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    const startLine = Math.max(0, line - contextLines - 1);
    const endLine = Math.min(lines.length, line + contextLines);
    
    const context = [];
    for (let i = startLine; i < endLine; i++) {
      const lineNum = i + 1;
      const marker = lineNum === line ? '>' : ' ';
      const lineColor = lineNum === line ? colors.yellow : colors.white;
      context.push(`${lineColor}${marker} ${lineNum.toString().padStart(4, ' ')} | ${lines[i]}${colors.reset}`);
    }
    
    return context.join('\n');
  } catch (error) {
    return null;
  }
}

// Group issues by type and file
function categorizeIssues(results) {
  const issues = {
    unusedVars: [],
    explicitAny: [],
    uselessEscape: [],
    constantCondition: [],
    other: []
  };

  results.forEach(file => {
    if (file.messages.length === 0) return;
    
    file.messages.forEach(message => {
      const issue = {
        file: path.relative(process.cwd(), file.filePath),
        line: message.line,
        column: message.column,
        message: message.message,
        ruleId: message.ruleId,
        severity: message.severity
      };

      switch (message.ruleId) {
        case '@typescript-eslint/no-unused-vars':
          issues.unusedVars.push(issue);
          break;
        case '@typescript-eslint/no-explicit-any':
          issues.explicitAny.push(issue);
          break;
        case 'no-useless-escape':
          issues.uselessEscape.push(issue);
          break;
        case 'no-constant-condition':
          issues.constantCondition.push(issue);
          break;
        default:
          issues.other.push(issue);
      }
    });
  });

  return issues;
}

// Generate fix suggestions for unused variables
function generateUnusedVarsFixes(issues) {
  console.log(`${colors.red}${colors.bold}❌ Unused Variables (${issues.length} issues)${colors.reset}\n`);
  
  // Group by file
  const byFile = {};
  issues.forEach(issue => {
    if (!byFile[issue.file]) byFile[issue.file] = [];
    byFile[issue.file].push(issue);
  });

  Object.entries(byFile).forEach(([file, fileIssues]) => {
    console.log(`${colors.blue}📄 ${file}${colors.reset}`);
    
    fileIssues.forEach(issue => {
      console.log(`\n  ${colors.yellow}Line ${issue.line}:${issue.column}${colors.reset} - ${issue.message}`);
      
      const context = getCodeContext(path.join(process.cwd(), issue.file), issue.line);
      if (context) {
        console.log(context);
      }
      
      // Extract variable name from message
      const varMatch = issue.message.match(/'([^']+)'/);
      if (varMatch) {
        const varName = varMatch[1];
        console.log(`\n  ${colors.green}Suggested fixes:${colors.reset}`);
        console.log(`  1. Remove the variable if truly unused`);
        console.log(`  2. Prefix with underscore: ${colors.cyan}_${varName}${colors.reset}`);
        console.log(`  3. Add a comment explaining why it's needed: ${colors.cyan}// eslint-disable-next-line @typescript-eslint/no-unused-vars${colors.reset}`);
      }
    });
    console.log();
  });
}

// Generate fix suggestions for explicit any
function generateExplicitAnyFixes(issues) {
  console.log(`${colors.yellow}${colors.bold}⚠️  Explicit Any Types (${issues.length} issues)${colors.reset}\n`);
  
  // Group by file
  const byFile = {};
  issues.forEach(issue => {
    if (!byFile[issue.file]) byFile[issue.file] = [];
    byFile[issue.file].push(issue);
  });

  // Show first 5 files as examples
  const files = Object.entries(byFile).slice(0, 5);
  
  files.forEach(([file, fileIssues]) => {
    console.log(`${colors.blue}📄 ${file}${colors.reset}`);
    
    // Show first 3 issues per file
    fileIssues.slice(0, 3).forEach(issue => {
      console.log(`\n  ${colors.yellow}Line ${issue.line}:${issue.column}${colors.reset}`);
      
      const context = getCodeContext(path.join(process.cwd(), issue.file), issue.line);
      if (context) {
        console.log(context);
      }
    });
    
    if (fileIssues.length > 3) {
      console.log(`\n  ${colors.cyan}... and ${fileIssues.length - 3} more in this file${colors.reset}`);
    }
    console.log();
  });

  console.log(`${colors.green}General fix strategies for 'any' types:${colors.reset}`);
  console.log(`1. Replace with specific types based on usage`);
  console.log(`2. Use ${colors.cyan}unknown${colors.reset} if the type is truly unknown`);
  console.log(`3. Create interfaces for object shapes`);
  console.log(`4. Use generic types for flexible but type-safe code`);
  console.log(`5. Use type guards for runtime type checking\n`);
}

// Generate fix for other issues
function generateOtherFixes(issues, ruleName, description) {
  if (issues.length === 0) return;
  
  console.log(`${colors.red}${colors.bold}${description} (${issues.length} issues)${colors.reset}\n`);
  
  issues.forEach(issue => {
    console.log(`${colors.blue}📄 ${issue.file}${colors.reset}`);
    console.log(`  ${colors.yellow}Line ${issue.line}:${issue.column}${colors.reset} - ${issue.message}`);
    
    const context = getCodeContext(path.join(process.cwd(), issue.file), issue.line);
    if (context) {
      console.log(context);
    }
    console.log();
  });
}

// Main execution
async function main() {
  try {
    console.log(`${colors.blue}Analyzing current ESLint issues...${colors.reset}\n`);
    
    const results = getESLintResults();
    const categorized = categorizeIssues(results);
    
    // Generate detailed fixes for each category
    if (categorized.unusedVars.length > 0) {
      generateUnusedVarsFixes(categorized.unusedVars);
    }
    
    if (categorized.uselessEscape.length > 0) {
      generateOtherFixes(categorized.uselessEscape, 'no-useless-escape', '❌ Useless Escape Characters');
      console.log(`${colors.green}Fix: Remove the unnecessary backslashes${colors.reset}\n`);
    }
    
    if (categorized.constantCondition.length > 0) {
      generateOtherFixes(categorized.constantCondition, 'no-constant-condition', '❌ Constant Conditions');
      console.log(`${colors.green}Fix: Replace with dynamic condition or remove if block${colors.reset}\n`);
    }
    
    if (categorized.explicitAny.length > 0) {
      generateExplicitAnyFixes(categorized.explicitAny);
    }
    
    // Summary
    console.log(`${colors.bold}📊 Summary:${colors.reset}`);
    console.log(`${colors.red}Errors to fix manually: ${categorized.unusedVars.length + categorized.uselessEscape.length + categorized.constantCondition.length}${colors.reset}`);
    console.log(`${colors.yellow}Warnings to address: ${categorized.explicitAny.length}${colors.reset}\n`);
    
    // Save detailed fixes to file
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fixesPath = path.join(process.cwd(), `eslint-manual-fixes-${timestamp}.md`);
    
    let markdown = '# ESLint Manual Fixes Guide\n\n';
    markdown += `Generated on: ${new Date().toISOString()}\n\n`;
    markdown += '## Summary\n\n';
    markdown += `- **Unused Variables**: ${categorized.unusedVars.length} issues\n`;
    markdown += `- **Explicit Any**: ${categorized.explicitAny.length} issues\n`;
    markdown += `- **Useless Escapes**: ${categorized.uselessEscape.length} issues\n`;
    markdown += `- **Constant Conditions**: ${categorized.constantCondition.length} issues\n\n`;
    
    // Add detailed issues
    markdown += '## Detailed Issues\n\n';
    
    if (categorized.unusedVars.length > 0) {
      markdown += '### Unused Variables\n\n';
      categorized.unusedVars.forEach(issue => {
        markdown += `- **${issue.file}:${issue.line}:${issue.column}** - ${issue.message}\n`;
      });
      markdown += '\n';
    }
    
    if (categorized.uselessEscape.length > 0) {
      markdown += '### Useless Escapes\n\n';
      categorized.uselessEscape.forEach(issue => {
        markdown += `- **${issue.file}:${issue.line}:${issue.column}** - ${issue.message}\n`;
      });
      markdown += '\n';
    }
    
    if (categorized.constantCondition.length > 0) {
      markdown += '### Constant Conditions\n\n';
      categorized.constantCondition.forEach(issue => {
        markdown += `- **${issue.file}:${issue.line}:${issue.column}** - ${issue.message}\n`;
      });
      markdown += '\n';
    }
    
    fs.writeFileSync(fixesPath, markdown);
    console.log(`${colors.green}📝 Detailed fixes guide saved to: ${fixesPath}${colors.reset}\n`);
    
  } catch (error) {
    console.error(`${colors.red}${colors.bold}❌ Error:${colors.reset}`);
    console.error(error.message);
    process.exit(1);
  }
}

// Run the main function
main();
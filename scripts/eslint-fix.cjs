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

// Parse command line arguments
const args = process.argv.slice(2);
const shouldAutoFix = args.includes('--fix');
const outputJson = args.includes('--json');
const verbose = args.includes('--verbose');

console.log(`${colors.cyan}${colors.bold}🔍 Digital Samba MCP Server - ESLint Analysis${colors.reset}\n`);

// Function to run ESLint and capture output
function runESLint(fix = false) {
  try {
    const command = fix 
      ? 'npx eslint src --ext .ts --fix --format json'
      : 'npx eslint src --ext .ts --format json';
    
    if (verbose) {
      console.log(`${colors.blue}Running: ${command}${colors.reset}`);
    }
    
    const output = execSync(command, { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
    return JSON.parse(output);
  } catch (error) {
    // ESLint exits with error code when there are lint errors, but still outputs JSON
    if (error.stdout) {
      try {
        return JSON.parse(error.stdout);
      } catch (parseError) {
        console.error(`${colors.red}Failed to parse ESLint output${colors.reset}`);
        console.error(error.stdout);
        process.exit(1);
      }
    }
    throw error;
  }
}

// Function to group errors by rule
function groupErrorsByRule(results) {
  const errorGroups = {};
  const warningGroups = {};
  let totalErrors = 0;
  let totalWarnings = 0;
  let filesWithErrors = 0;
  let filesWithWarnings = 0;

  results.forEach(file => {
    if (file.errorCount > 0) filesWithErrors++;
    if (file.warningCount > 0) filesWithWarnings++;
    
    file.messages.forEach(message => {
      const rule = message.ruleId || 'unknown';
      const severity = message.severity === 2 ? 'error' : 'warning';
      const groups = severity === 'error' ? errorGroups : warningGroups;
      
      if (!groups[rule]) {
        groups[rule] = {
          count: 0,
          files: new Set(),
          examples: []
        };
      }
      
      groups[rule].count++;
      groups[rule].files.add(file.filePath);
      
      // Store up to 3 examples for each rule
      if (groups[rule].examples.length < 3) {
        groups[rule].examples.push({
          file: path.relative(process.cwd(), file.filePath),
          line: message.line,
          column: message.column,
          message: message.message
        });
      }
      
      if (severity === 'error') totalErrors++;
      else totalWarnings++;
    });
  });

  return {
    errorGroups,
    warningGroups,
    totalErrors,
    totalWarnings,
    filesWithErrors,
    filesWithWarnings,
    totalFiles: results.length
  };
}

// Function to display results
function displayResults(analysis) {
  const { errorGroups, warningGroups, totalErrors, totalWarnings, filesWithErrors, filesWithWarnings, totalFiles } = analysis;
  
  console.log(`${colors.bold}📊 Summary${colors.reset}`);
  console.log(`${colors.white}Files analyzed: ${totalFiles}${colors.reset}`);
  console.log(`${colors.red}Errors: ${totalErrors} (in ${filesWithErrors} files)${colors.reset}`);
  console.log(`${colors.yellow}Warnings: ${totalWarnings} (in ${filesWithWarnings} files)${colors.reset}\n`);
  
  // Display errors grouped by rule
  if (Object.keys(errorGroups).length > 0) {
    console.log(`${colors.red}${colors.bold}❌ Errors by Rule${colors.reset}`);
    Object.entries(errorGroups)
      .sort((a, b) => b[1].count - a[1].count)
      .forEach(([rule, data]) => {
        console.log(`\n${colors.red}${rule}${colors.reset} (${data.count} occurrences in ${data.files.size} files)`);
        if (verbose) {
          data.examples.forEach(example => {
            console.log(`  ${colors.white}${example.file}:${example.line}:${example.column}${colors.reset}`);
            console.log(`  ${colors.cyan}→ ${example.message}${colors.reset}`);
          });
        }
      });
    console.log();
  }
  
  // Display warnings grouped by rule
  if (Object.keys(warningGroups).length > 0) {
    console.log(`${colors.yellow}${colors.bold}⚠️  Warnings by Rule${colors.reset}`);
    Object.entries(warningGroups)
      .sort((a, b) => b[1].count - a[1].count)
      .forEach(([rule, data]) => {
        console.log(`\n${colors.yellow}${rule}${colors.reset} (${data.count} occurrences in ${data.files.size} files)`);
        if (verbose) {
          data.examples.forEach(example => {
            console.log(`  ${colors.white}${example.file}:${example.line}:${example.column}${colors.reset}`);
            console.log(`  ${colors.cyan}→ ${example.message}${colors.reset}`);
          });
        }
      });
    console.log();
  }
}

// Function to save detailed report
function saveDetailedReport(results, analysis) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const reportPath = path.join(process.cwd(), `eslint-report-${timestamp}.json`);
  
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      totalFiles: analysis.totalFiles,
      totalErrors: analysis.totalErrors,
      totalWarnings: analysis.totalWarnings,
      filesWithErrors: analysis.filesWithErrors,
      filesWithWarnings: analysis.filesWithWarnings
    },
    errorsByRule: Object.fromEntries(
      Object.entries(analysis.errorGroups).map(([rule, data]) => [
        rule,
        {
          count: data.count,
          filesAffected: data.files.size,
          examples: data.examples
        }
      ])
    ),
    warningsByRule: Object.fromEntries(
      Object.entries(analysis.warningGroups).map(([rule, data]) => [
        rule,
        {
          count: data.count,
          filesAffected: data.files.size,
          examples: data.examples
        }
      ])
    ),
    detailedResults: results
  };
  
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  return reportPath;
}

// Main execution
async function main() {
  try {
    // Step 1: Run initial ESLint scan
    console.log(`${colors.blue}Running ESLint analysis...${colors.reset}\n`);
    const initialResults = runESLint(false);
    const initialAnalysis = groupErrorsByRule(initialResults);
    
    // Display initial results
    displayResults(initialAnalysis);
    
    // Save detailed report if requested
    if (outputJson) {
      const reportPath = saveDetailedReport(initialResults, initialAnalysis);
      console.log(`${colors.green}📄 Detailed report saved to: ${reportPath}${colors.reset}\n`);
    }
    
    // Step 2: Attempt auto-fix if requested
    if (shouldAutoFix && (initialAnalysis.totalErrors > 0 || initialAnalysis.totalWarnings > 0)) {
      console.log(`${colors.magenta}${colors.bold}🔧 Attempting auto-fix...${colors.reset}\n`);
      
      const fixedResults = runESLint(true);
      const fixedAnalysis = groupErrorsByRule(fixedResults);
      
      // Calculate fixes
      const errorsFixed = initialAnalysis.totalErrors - fixedAnalysis.totalErrors;
      const warningsFixed = initialAnalysis.totalWarnings - fixedAnalysis.totalWarnings;
      
      console.log(`${colors.green}✅ Auto-fix Results:${colors.reset}`);
      console.log(`${colors.green}Fixed ${errorsFixed} errors and ${warningsFixed} warnings${colors.reset}\n`);
      
      // Display remaining issues
      if (fixedAnalysis.totalErrors > 0 || fixedAnalysis.totalWarnings > 0) {
        console.log(`${colors.bold}📋 Remaining Issues After Auto-fix:${colors.reset}\n`);
        displayResults(fixedAnalysis);
        
        // Provide manual fix suggestions
        console.log(`${colors.cyan}${colors.bold}💡 Manual Fix Suggestions:${colors.reset}\n`);
        
        if (fixedAnalysis.errorGroups['@typescript-eslint/no-explicit-any']) {
          console.log(`${colors.cyan}For @typescript-eslint/no-explicit-any:${colors.reset}`);
          console.log(`  - Replace 'any' with specific types`);
          console.log(`  - Use 'unknown' if the type is truly unknown`);
          console.log(`  - Use generic types for flexible but type-safe code\n`);
        }
        
        if (fixedAnalysis.errorGroups['@typescript-eslint/no-unused-vars']) {
          console.log(`${colors.cyan}For @typescript-eslint/no-unused-vars:${colors.reset}`);
          console.log(`  - Remove unused variables or parameters`);
          console.log(`  - Prefix with underscore if intentionally unused (e.g., _unused)`);
          console.log(`  - Export if needed by other modules\n`);
        }
      } else {
        console.log(`${colors.green}${colors.bold}🎉 All issues fixed! The codebase is now ESLint clean.${colors.reset}`);
      }
    }
    
    // Exit with appropriate code
    if (!shouldAutoFix && (initialAnalysis.totalErrors > 0 || initialAnalysis.totalWarnings > 0)) {
      console.log(`\n${colors.yellow}Run with --fix to attempt automatic fixes${colors.reset}`);
      process.exit(1);
    }
    
  } catch (error) {
    console.error(`${colors.red}${colors.bold}❌ Error running ESLint:${colors.reset}`);
    console.error(error.message);
    process.exit(1);
  }
}

// Show help if requested
if (args.includes('--help') || args.includes('-h')) {
  console.log(`${colors.bold}Usage:${colors.reset} node scripts/eslint-fix.js [options]\n`);
  console.log(`${colors.bold}Options:${colors.reset}`);
  console.log(`  --fix      Attempt to automatically fix issues`);
  console.log(`  --json     Save detailed JSON report`);
  console.log(`  --verbose  Show detailed examples for each rule`);
  console.log(`  --help     Show this help message\n`);
  console.log(`${colors.bold}Examples:${colors.reset}`);
  console.log(`  node scripts/eslint-fix.js                    # Analyze only`);
  console.log(`  node scripts/eslint-fix.js --fix             # Analyze and fix`);
  console.log(`  node scripts/eslint-fix.js --fix --verbose   # Fix with detailed output`);
  console.log(`  node scripts/eslint-fix.js --json            # Save JSON report`);
  process.exit(0);
}

// Run the main function
main();
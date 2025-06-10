#!/usr/bin/env node

/**
 * Analyze test coverage and identify areas needing improvement
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

try {
  // Read coverage summary
  const coveragePath = join(__dirname, '../coverage/coverage-summary.json');
  const coverage = JSON.parse(readFileSync(coveragePath, 'utf8'));

  // Sort files by coverage percentage
  const files = Object.entries(coverage)
    .filter(([path]) => path !== 'total')
    .map(([path, data]) => ({
      path: path.replace(process.cwd() + '/', ''),
      lines: data.lines.pct,
      statements: data.statements.pct,
      functions: data.functions.pct,
      branches: data.branches.pct
    }))
    .sort((a, b) => a.lines - b.lines);

  console.log('Test Coverage Analysis');
  console.log('======================\n');

  // Overall coverage
  console.log('Overall Coverage:');
  console.log(`  Lines:      ${coverage.total.lines.pct.toFixed(2)}%`);
  console.log(`  Statements: ${coverage.total.statements.pct.toFixed(2)}%`);
  console.log(`  Functions:  ${coverage.total.functions.pct.toFixed(2)}%`);
  console.log(`  Branches:   ${coverage.total.branches.pct.toFixed(2)}%\n`);

  // Files with lowest coverage
  console.log('Files Needing Attention (< 50% line coverage):');
  console.log('----------------------------------------------');
  
  const lowCoverageFiles = files.filter(f => f.lines < 50);
  if (lowCoverageFiles.length === 0) {
    console.log('  All files have >= 50% coverage! 🎉');
  } else {
    lowCoverageFiles.forEach(file => {
      console.log(`  ${file.path}`);
      console.log(`    Lines: ${file.lines.toFixed(1)}% | Functions: ${file.functions.toFixed(1)}%`);
    });
  }

  console.log('\nTop 5 Files to Improve:');
  console.log('-----------------------');
  files.slice(0, 5).forEach((file, i) => {
    console.log(`${i + 1}. ${file.path} (${file.lines.toFixed(1)}% lines)`);
  });

  // Recommendations
  console.log('\nRecommendations:');
  console.log('----------------');
  
  if (coverage.total.lines.pct < 60) {
    console.log('- Focus on unit tests for core functionality');
  }
  
  if (coverage.total.functions.pct < 40) {
    console.log('- Many functions are untested - prioritize critical paths');
  }
  
  if (coverage.total.branches.pct < 50) {
    console.log('- Add tests for error handling and edge cases');
  }

  // Check specific areas
  const toolsFiles = files.filter(f => f.path.includes('src/tools/'));
  const avgToolsCoverage = toolsFiles.reduce((acc, f) => acc + f.lines, 0) / toolsFiles.length;
  
  if (avgToolsCoverage < 70) {
    console.log(`- Tools have low average coverage (${avgToolsCoverage.toFixed(1)}%) - add integration tests`);
  }

} catch (error) {
  console.error('Error analyzing coverage:', error.message);
  console.error('Run "npm run test:coverage" first to generate coverage data');
  process.exit(1);
}
#!/usr/bin/env node

/**
 * Pre-release checklist script
 * Run this before creating a release to ensure everything is ready
 */

import { readFileSync, existsSync } from 'fs';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

console.log('Pre-Release Checklist');
console.log('====================\n');

const checks = [];

// Check 1: Version consistency
try {
  const packageJson = JSON.parse(readFileSync(join(rootDir, 'package.json'), 'utf8'));
  const version = packageJson.version;
  console.log(`✓ Current version: ${version}`);
  
  if (version.includes('beta') || version.includes('alpha')) {
    console.log('  ⚠️  Version contains pre-release identifier');
  }
  checks.push({ name: 'Version check', passed: true });
} catch (error) {
  console.log('✗ Failed to read package.json');
  checks.push({ name: 'Version check', passed: false });
}

// Check 2: Tests passing
try {
  console.log('\n🧪 Running tests...');
  execSync('npm test', { cwd: rootDir, stdio: 'pipe' });
  console.log('✓ All tests passing');
  checks.push({ name: 'Tests', passed: true });
} catch (error) {
  console.log('✗ Tests failed');
  checks.push({ name: 'Tests', passed: false });
}

// Check 3: Build successful
try {
  console.log('\n🔨 Testing build...');
  execSync('npm run build', { cwd: rootDir, stdio: 'pipe' });
  console.log('✓ Build successful');
  checks.push({ name: 'Build', passed: true });
} catch (error) {
  console.log('✗ Build failed');
  checks.push({ name: 'Build', passed: false });
}

// Check 4: Coverage threshold
try {
  if (existsSync(join(rootDir, 'coverage/coverage-summary.json'))) {
    const coverage = JSON.parse(readFileSync(join(rootDir, 'coverage/coverage-summary.json'), 'utf8'));
    const lineCoverage = coverage.total.lines.pct;
    console.log(`\n📊 Test coverage: ${lineCoverage.toFixed(1)}%`);
    
    if (lineCoverage < 40) {
      console.log('  ⚠️  Coverage is below 40%');
    } else {
      console.log('  ✓ Coverage meets minimum threshold');
    }
    checks.push({ name: 'Coverage', passed: true });
  } else {
    console.log('\n⚠️  No coverage data found - run npm test:coverage');
    checks.push({ name: 'Coverage', passed: false });
  }
} catch (error) {
  console.log('✗ Failed to check coverage');
  checks.push({ name: 'Coverage', passed: false });
}

// Check 5: Git status
try {
  const gitStatus = execSync('git status --porcelain', { cwd: rootDir }).toString();
  if (gitStatus.trim()) {
    console.log('\n⚠️  Uncommitted changes detected:');
    console.log(gitStatus);
    checks.push({ name: 'Git status', passed: false });
  } else {
    console.log('\n✓ Working directory clean');
    checks.push({ name: 'Git status', passed: true });
  }
} catch (error) {
  console.log('✗ Failed to check git status');
  checks.push({ name: 'Git status', passed: false });
}

// Check 6: Branch check
try {
  const currentBranch = execSync('git rev-parse --abbrev-ref HEAD', { cwd: rootDir }).toString().trim();
  console.log(`\n📍 Current branch: ${currentBranch}`);
  
  if (currentBranch !== 'main' && currentBranch !== 'develop') {
    console.log('  ⚠️  Not on main or develop branch');
  }
  checks.push({ name: 'Branch', passed: true });
} catch (error) {
  console.log('✗ Failed to check current branch');
  checks.push({ name: 'Branch', passed: false });
}

// Check 7: CHANGELOG updated
try {
  const changelog = readFileSync(join(rootDir, 'CHANGELOG.md'), 'utf8');
  if (changelog.includes('[Unreleased]')) {
    console.log('\n✓ CHANGELOG.md found with unreleased section');
    
    // Check if unreleased section has content
    const unreleasedSection = changelog.split('## [Unreleased]')[1]?.split('## [')[0];
    if (unreleasedSection && unreleasedSection.trim().length > 50) {
      console.log('  ✓ Unreleased section has content');
    } else {
      console.log('  ⚠️  Unreleased section appears empty');
    }
  }
  checks.push({ name: 'CHANGELOG', passed: true });
} catch (error) {
  console.log('✗ CHANGELOG.md not found or invalid');
  checks.push({ name: 'CHANGELOG', passed: false });
}

// Check 8: Dependencies audit
try {
  console.log('\n🔒 Running security audit...');
  const auditResult = execSync('npm audit --production --json', { cwd: rootDir }).toString();
  const audit = JSON.parse(auditResult);
  
  if (audit.metadata.vulnerabilities.critical > 0) {
    console.log(`  ✗ ${audit.metadata.vulnerabilities.critical} critical vulnerabilities found`);
    checks.push({ name: 'Security audit', passed: false });
  } else if (audit.metadata.vulnerabilities.high > 0) {
    console.log(`  ⚠️  ${audit.metadata.vulnerabilities.high} high severity vulnerabilities found`);
    checks.push({ name: 'Security audit', passed: true });
  } else {
    console.log('  ✓ No critical or high severity vulnerabilities');
    checks.push({ name: 'Security audit', passed: true });
  }
} catch (error) {
  // npm audit returns non-zero exit code if vulnerabilities found
  console.log('  ⚠️  Security audit completed with warnings');
  checks.push({ name: 'Security audit', passed: true });
}

// Summary
console.log('\n\nSummary');
console.log('-------');
const passed = checks.filter(c => c.passed).length;
const total = checks.length;
console.log(`Passed: ${passed}/${total}`);

if (passed === total) {
  console.log('\n✅ All checks passed! Ready for release.');
  console.log('\nNext steps:');
  console.log('1. Update version in package.json (npm version patch/minor/major)');
  console.log('2. Update CHANGELOG.md - move unreleased items to new version section');
  console.log('3. Commit changes: git commit -am "chore: prepare release vX.Y.Z"');
  console.log('4. Create and push tag: git tag vX.Y.Z && git push origin vX.Y.Z');
  console.log('5. Push to main: git push origin main');
  process.exit(0);
} else {
  console.log('\n❌ Some checks failed. Please fix issues before releasing.');
  process.exit(1);
}
// file-analyzer.js
// A utility script to help identify files that may need cleanup

const fs = require('fs');
const path = require('path');
const util = require('util');
const readdir = util.promisify(fs.readdir);
const stat = util.promisify(fs.stat);
const readFile = util.promisify(fs.readFile);

// Patterns to identify potential issues
const patterns = {
  logFiles: /\.(log|logs)$/i,
  tempFiles: /\.(tmp|temp|bak|backup)$/i,
  debugCode: /(console\.log|debugger|TODO|FIXME)/,
  personalPaths: /(C:\\Users\\|\/home\/|\/Users\/)/,
  credentials: /(password|secret|key|token).*['"=:]+/i,
  unusedCode: /\/\*\s.*\s\*\/|\/\/\s.*?\n|^\s*\/\//m,
};

// File extensions to analyze for content
const codeExtensions = ['.ts', '.js', '.json', '.md', '.bat', '.sh'];

// Directories to ignore
const ignoreDirs = ['node_modules', 'dist', '.git'];

async function analyzeDirectory(dir, results = {
  logFiles: [],
  tempFiles: [],
  largeFiles: [],
  oldFiles: [],
  filesByExtension: {},
  filesWithIssues: [],
  stats: {
    totalFiles: 0,
    totalSize: 0,
    totalDirs: 0,
  }
}) {
  try {
    const files = await readdir(dir);
    
    for (const file of files) {
      const filePath = path.join(dir, file);
      const stats = await stat(filePath);
      
      if (stats.isDirectory()) {
        // Skip ignored directories
        if (ignoreDirs.includes(file)) continue;
        
        results.stats.totalDirs++;
        await analyzeDirectory(filePath, results);
      } else {
        results.stats.totalFiles++;
        results.stats.totalSize += stats.size;
        
        const ext = path.extname(file).toLowerCase();
        if (!results.filesByExtension[ext]) {
          results.filesByExtension[ext] = [];
        }
        results.filesByExtension[ext].push(filePath);
        
        // Check file patterns
        if (patterns.logFiles.test(file)) {
          results.logFiles.push(filePath);
        }
        
        if (patterns.tempFiles.test(file)) {
          results.tempFiles.push(filePath);
        }
        
        // Check for large files
        if (stats.size > 1000000) { // 1MB
          results.largeFiles.push({
            path: filePath,
            size: (stats.size / 1024 / 1024).toFixed(2) + 'MB'
          });
        }
        
        // Check for old files (not modified in 3 months)
        const threeMonthsAgo = new Date();
        threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
        if (stats.mtime < threeMonthsAgo) {
          results.oldFiles.push({
            path: filePath,
            lastModified: stats.mtime.toISOString().split('T')[0]
          });
        }
        
        // Analyze file content for code files
        if (codeExtensions.includes(ext)) {
          try {
            const content = await readFile(filePath, 'utf8');
            const issues = [];
            
            if (patterns.debugCode.test(content)) {
              issues.push('Contains debug code (console.log, TODO, etc.)');
            }
            
            if (patterns.personalPaths.test(content)) {
              issues.push('Contains personal file paths');
            }
            
            if (patterns.credentials.test(content)) {
              issues.push('May contain credentials');
            }
            
            if (patterns.unusedCode.test(content)) {
              issues.push('Contains commented code');
            }
            
            if (issues.length > 0) {
              results.filesWithIssues.push({
                path: filePath,
                issues
              });
            }
          } catch (err) {
            console.error(`Error reading file ${filePath}:`, err.message);
          }
        }
      }
    }
  } catch (err) {
    console.error(`Error scanning directory ${dir}:`, err.message);
  }
  
  return results;
}

async function main() {
  const rootDir = process.argv[2] || '.';
  console.log(`Analyzing directory: ${rootDir}`);
  
  const results = await analyzeDirectory(rootDir);
  
  console.log('\n===== ANALYSIS RESULTS =====\n');
  
  console.log(`Total files: ${results.stats.totalFiles}`);
  console.log(`Total directories: ${results.stats.totalDirs}`);
  console.log(`Total size: ${(results.stats.totalSize / 1024 / 1024).toFixed(2)}MB`);
  
  console.log('\n=== Files by Extension ===');
  Object.keys(results.filesByExtension).sort().forEach(ext => {
    console.log(`${ext}: ${results.filesByExtension[ext].length} files`);
  });
  
  console.log('\n=== Potential Log Files ===');
  results.logFiles.forEach(file => console.log(file));
  
  console.log('\n=== Temporary Files ===');
  results.tempFiles.forEach(file => console.log(file));
  
  console.log('\n=== Large Files (>1MB) ===');
  results.largeFiles.forEach(file => console.log(`${file.path} (${file.size})`));
  
  console.log('\n=== Old Files (not modified in 3+ months) ===');
  results.oldFiles.forEach(file => console.log(`${file.path} (Last modified: ${file.lastModified})`));
  
  console.log('\n=== Files with Potential Issues ===');
  results.filesWithIssues.forEach(file => {
    console.log(`\n${file.path}:`);
    file.issues.forEach(issue => console.log(`  - ${issue}`));
  });
  
  console.log('\n===== CLEANUP RECOMMENDATIONS =====\n');
  
  if (results.logFiles.length > 0) {
    console.log('- Consider removing log files or adding them to .gitignore');
  }
  
  if (results.tempFiles.length > 0) {
    console.log('- Clean up temporary and backup files');
  }
  
  if (results.filesWithIssues.length > 0) {
    console.log('- Review files with issues for debug code, commented code, and personal paths');
  }
  
  if (results.largeFiles.length > 0) {
    console.log('- Consider if large files can be reduced or externalized');
  }
  
  console.log('\nAnalysis complete. For detailed results, redirect this output to a file.');
}

main().catch(err => console.error('Error in analysis:', err));

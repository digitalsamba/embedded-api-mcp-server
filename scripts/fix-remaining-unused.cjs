#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔧 Fixing remaining unused variable errors...\n');

// Function to apply fixes to a file
function fixFile(filePath, fixes) {
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  File not found: ${filePath}`);
    return false;
  }
  
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  
  fixes.forEach(fix => {
    const newContent = content.replace(fix.find, fix.replace);
    if (newContent !== content) {
      content = newContent;
      modified = true;
    }
  });
  
  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    return true;
  }
  return false;
}

// Apply remaining fixes
const projectRoot = path.join(__dirname, '..');

// Fix _resourceType and _resourceId that are not used
const apiFile = path.join(projectRoot, 'src/digital-samba-api.ts');
if (fs.existsSync(apiFile)) {
  let content = fs.readFileSync(apiFile, 'utf8');
  // Just remove these unused variables entirely
  content = content.replace(
    /const _resourceType = matches \? matches\[1\] : 'resource';\s*\n\s*const _resourceId = matches \? matches\[2\] : 'unknown';/,
    '// Resource type and ID extraction removed - not used in error message'
  );
  fs.writeFileSync(apiFile, content, 'utf8');
  console.log('✅ Fixed: src/digital-samba-api.ts');
}

// Fix rate-limiter.ts
if (fixFile(path.join(projectRoot, 'src/rate-limiter.ts'), [
  {
    find: /import \{ RateLimitError \} from '\.\/errors\.js';/,
    replace: 'import { ApiRequestError, RateLimitError } from \'./errors.js\';'
  },
  {
    find: /const _clientIp = req\.ip \|\| req\.connection\?\.remoteAddress \|\| 'unknown';/,
    replace: '// Client IP logging removed - not currently used'
  }
])) {
  console.log('✅ Fixed: src/rate-limiter.ts');
}

// Fix server-core.ts
if (fixFile(path.join(projectRoot, 'src/server-core.ts'), [
  {
    find: /const _serverOptions = \{/,
    replace: '  // Server options removed - not used in this context\n  /*const serverOptions = {'
  },
  {
    find: /\};(\s*\/\/ Return server instance)/,
    replace: '};*/\n$1'
  },
  {
    find: /(\s+)server: McpServer,/,
    replace: '$1_server: McpServer,'
  },
  {
    find: /(\s+)apiKey: string,/,
    replace: '$1_apiKey: string,'
  },
  {
    find: /(\s+)apiUrl: string,/,
    replace: '$1_apiUrl: string,'
  },
  {
    find: /(\s+)cache\?: MemoryCache/,
    replace: '$1_cache?: MemoryCache'
  }
])) {
  console.log('✅ Fixed: src/server-core.ts');
}

// Fix resources/exports/index.ts  
if (fixFile(path.join(projectRoot, 'src/resources/exports/index.ts'), [
  {
    find: /searchParams: Record<string, string>,/g,
    replace: '_searchParams: Record<string, string>,'
  }
])) {
  console.log('✅ Fixed: src/resources/exports/index.ts');
}

// Fix webhooks.ts - remove the entire interface block
if (fixFile(path.join(projectRoot, 'src/webhooks.ts'), [
  {
    find: /export interface WebhookEventType \{[\s\S]*?export interface WebhookEventHandler \{[\s\S]*?\}/,
    replace: '// Webhook interfaces moved to webhooks/webhook-types.ts'
  }
])) {
  console.log('✅ Fixed: src/webhooks.ts');
}

// Fix token-manager.ts
if (fixFile(path.join(projectRoot, 'src/token-manager.ts'), [
  {
    find: /import \{ DigitalSambaApiClient, TokenOptions, TokenResponse \}/,
    replace: 'import { DigitalSambaApiClient, TokenOptions }'
  },
  {
    find: /export interface TokenRefreshResult \{/,
    replace: '// Unused interface - commented out\n/*export interface TokenRefreshResult {'
  },
  {
    find: /\}\s*\/\*\* Token manager implementation/,
    replace: '}*/\n\n/** Token manager implementation'
  }
])) {
  console.log('✅ Fixed: src/token-manager.ts');
}

// Final count
console.log('\n📊 Running final check...\n');
const { execSync } = require('child_process');
try {
  const output = execSync('npx eslint src --ext .ts --format json 2>/dev/null', { encoding: 'utf8' });
  const results = JSON.parse(output);
  
  let errors = 0;
  let warnings = 0;
  
  results.forEach(file => {
    file.messages.forEach(msg => {
      if (msg.severity === 2) errors++;
      else warnings++;
    });
  });
  
  console.log(`✅ Final count: ${errors} errors, ${warnings} warnings`);
} catch (e) {
  // Run the analysis tool for a nice summary
  try {
    execSync('npm run lint:analyze', { stdio: 'inherit' });
  } catch (e2) {
    // Ignore
  }
}
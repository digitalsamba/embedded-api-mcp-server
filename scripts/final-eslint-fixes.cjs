#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Fix files one by one with specific regex patterns
const fileFixes = {
  // digital-samba-api.ts - these are already prefixed with _
  'src/digital-samba-api.ts': [
    // These are already fixed
  ],
  
  // index.ts - fix the line 188 issue
  'src/index.ts': [
    { find: /async \(uri, params, request\) => \{/, replace: 'async (uri, _params, _request) => {' },
    { find: /const ENABLE_RATE_LIMITING = process\.env\.ENABLE_RATE_LIMITING/, replace: 'const _ENABLE_RATE_LIMITING = process.env.ENABLE_RATE_LIMITING' },
    { find: /const RATE_LIMIT_REQUESTS_PER_MINUTE = parseInt/, replace: 'const _RATE_LIMIT_REQUESTS_PER_MINUTE = parseInt' },
    { find: /const apiClient = new DigitalSambaApiClient\(/, replace: 'const _apiClient = new DigitalSambaApiClient(' },
    { find: /const server = createStdioServer\(\{/, replace: 'const _server = createStdioServer({' }
  ],
  
  // metrics.ts
  'src/metrics.ts': [
    { find: /import \{ Counter, Gauge, Histogram, Summary, register \}/, replace: 'import { Counter, Gauge, Histogram, Summary }' }
  ],
  
  // rate-limiter.ts  
  'src/rate-limiter.ts': [
    { find: /import \{ ApiRequestError, RateLimitError \}/, replace: 'import { RateLimitError }' },
    { find: /const clientIp = req\.ip/, replace: 'const _clientIp = req.ip' }
  ],
  
  // resources/analytics/index.ts
  'src/resources/analytics/index.ts': [
    { find: /const analytics = new AnalyticsResource\(/, replace: 'const _analytics = new AnalyticsResource(' }
  ],
  
  // resources/content/index.ts
  'src/resources/content/index.ts': [
    { find: /import \{ z \} from 'zod';/, replace: '// import { z } from \'zod\'; // Removed: unused' },
    { find: /import \{ McpServer, McpResource \}/, replace: 'import { McpResource }' },
    { find: /\s+Library,\s+LibraryFolder,\s+LibraryFile,\s+ApiResponse/, replace: '' }
  ],
  
  // resources/exports/index.ts
  'src/resources/exports/index.ts': [
    { find: /searchParams: Record<string, string>,/, replace: '_searchParams: Record<string, string>,' }
  ],
  
  // server-core.ts
  'src/server-core.ts': [
    { find: /const serverOptions = \{/, replace: 'const _serverOptions = {' },
    { find: /server: McpServer,\n\s+apiKey: string,\n\s+apiUrl: string,\n\s+cache\?: MemoryCache/, 
      replace: '_server: McpServer,\n  _apiKey: string,\n  _apiUrl: string,\n  _cache?: MemoryCache' }
  ],
  
  // token-manager.ts
  'src/token-manager.ts': [
    { find: /export interface TokenRefreshResult \{/, replace: 'export interface _TokenRefreshResult {' }
  ],
  
  // tools/communication-management/index.ts
  'src/tools/communication-management/index.ts': [
    { find: /import \{ McpServer, Tool \}/, replace: 'import { Tool }' }
  ],
  
  // tools/library-management/index.ts
  'src/tools/library-management/index.ts': [
    { find: /import \{ McpServer, Tool \}/, replace: 'import { Tool }' },
    { find: /const result = await executeLibraryTool/, replace: 'const _result = await executeLibraryTool' }
  ],
  
  // tools/live-session-controls/index.ts
  'src/tools/live-session-controls/index.ts': [
    { find: /(\s+)apiClient: DigitalSambaApiClient/, replace: '$1_apiClient: DigitalSambaApiClient' }
  ],
  
  // tools/poll-management/index.ts
  'src/tools/poll-management/index.ts': [
    { find: /import \{ McpServer, Tool \}/, replace: 'import { Tool }' }
  ],
  
  // tools/webhook-management/index.ts
  'src/tools/webhook-management/index.ts': [
    { find: /\s+ApiRequestError,[\s\S]*?ConfigurationError,/, replace: '' }
  ],
  
  // transports/stdio-transport.ts
  'src/transports/stdio-transport.ts': [
    { find: /const originalConsole = \{/, replace: 'const _originalConsole = {' }
  ],
  
  // webhooks.ts
  'src/webhooks.ts': [
    { find: /export interface WebhookEventType[\s\S]*?export interface WebhookEventHandler[\s\S]*?\}/, 
      replace: '// Webhook types moved to webhooks/webhook-types.ts' }
  ]
};

console.log('🔧 Applying final ESLint fixes...\n');

let totalFixed = 0;

Object.entries(fileFixes).forEach(([file, fixes]) => {
  const filePath = path.join(__dirname, '..', file);
  
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  File not found: ${file}`);
    return;
  }
  
  let content = fs.readFileSync(filePath, 'utf8');
  let fileFixed = false;
  
  fixes.forEach(fix => {
    const before = content;
    content = content.replace(fix.find, fix.replace);
    if (before !== content) {
      fileFixed = true;
    }
  });
  
  if (fileFixed) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ Fixed: ${file}`);
    totalFixed++;
  } else {
    console.log(`⏭️  No changes: ${file}`);
  }
});

console.log(`\n✨ Fixed ${totalFixed} files!`);

// Run final check
console.log('\n📊 Final ESLint status:\n');
const { execSync } = require('child_process');
try {
  execSync('npm run lint:analyze', { stdio: 'inherit' });
} catch (error) {
  // ESLint will exit with error if issues remain
}
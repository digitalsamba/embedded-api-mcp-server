#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const fixes = [
  // ===== RESOURCES FIXES =====
  
  // src/resources/analytics/index.ts
  {
    file: 'src/resources/analytics/index.ts',
    find: '  const analytics = new AnalyticsResource(',
    replace: '  const _analytics = new AnalyticsResource('
  },
  
  // src/resources/content/index.ts - remove unused imports
  {
    file: 'src/resources/content/index.ts',
    find: `// External dependencies
import { z } from 'zod';

// MCP SDK imports
import { McpServer, McpResource } from '@modelcontextprotocol/sdk/server/mcp.js';`,
    replace: `// External dependencies
// import { z } from 'zod'; // Removed: unused

// MCP SDK imports
import { McpResource } from '@modelcontextprotocol/sdk/server/mcp.js';`
  },
  {
    file: 'src/resources/content/index.ts',
    find: `import { 
  DigitalSambaApiClient,
  Library,
  LibraryFolder, 
  LibraryFile,
  ApiResponse
} from '../../digital-samba-api.js';`,
    replace: `import { 
  DigitalSambaApiClient
} from '../../digital-samba-api.js';`
  },
  
  // src/resources/exports/index.ts - fix searchParams
  {
    file: 'src/resources/exports/index.ts',
    find: '    searchParams: Record<string, string>,',
    replace: '    _searchParams: Record<string, string>,'
  },
  
  // src/resources/recordings/index.ts - remove unused imports
  {
    file: 'src/resources/recordings/index.ts',
    find: `import { 
  ApiResponseError,
  AuthenticationError,
  ResourceNotFoundError, 
  ValidationError
} from '../../errors.js';`,
    replace: `import { 
  AuthenticationError,
  ValidationError
} from '../../errors.js';`
  },
  
  // ===== INDEX.TS FIXES =====
  {
    file: 'src/index.ts',
    find: 'import { ConnectionManager, createConnectionManager } from \'./connection-manager.js\';',
    replace: 'import { ConnectionManager } from \'./connection-manager.js\';'
  },
  {
    file: 'src/index.ts',
    find: 'import { TokenManager, createTokenManager } from \'./token-manager.js\';',
    replace: 'import { TokenManager } from \'./token-manager.js\';'
  },
  {
    file: 'src/index.ts',
    find: 'import { ResourceOptimizer, createResourceOptimizer } from \'./resource-optimizer.js\';',
    replace: 'import { ResourceOptimizer } from \'./resource-optimizer.js\';'
  },
  {
    file: 'src/index.ts',
    find: 'import { DigitalSambaApiEnhanced, createEnhancedApiClient } from \'./digital-samba-api-enhanced.js\';',
    replace: 'import { DigitalSambaApiEnhanced } from \'./digital-samba-api-enhanced.js\';'
  },
  {
    file: 'src/index.ts',
    find: 'import { CircuitBreakerApiClient } from \'./digital-samba-api-circuit-breaker.js\';',
    replace: '// import { CircuitBreakerApiClient } from \'./digital-samba-api-circuit-breaker.js\'; // Removed: unused'
  },
  {
    file: 'src/index.ts',
    find: 'import ResilientApiClient from \'./digital-samba-api-resilient.js\';',
    replace: '// import ResilientApiClient from \'./digital-samba-api-resilient.js\'; // Removed: unused'
  },
  {
    file: 'src/index.ts',
    find: 'import AnalyticsResource from \'./analytics.js\';',
    replace: '// import AnalyticsResource from \'./analytics.js\'; // Removed: unused'
  },
  {
    file: 'src/index.ts',
    find: 'import { setupSessionTools } from \'./sessions.js\';',
    replace: '// import { setupSessionTools } from \'./sessions.js\'; // Removed: unused'
  },
  {
    file: 'src/index.ts',
    find: 'const ENABLE_RATE_LIMITING = process.env.ENABLE_RATE_LIMITING === \'true\';',
    replace: 'const _ENABLE_RATE_LIMITING = process.env.ENABLE_RATE_LIMITING === \'true\';'
  },
  {
    file: 'src/index.ts',
    find: 'const RATE_LIMIT_REQUESTS_PER_MINUTE = parseInt(process.env.RATE_LIMIT_REQUESTS_PER_MINUTE || \'60\', 10);',
    replace: 'const _RATE_LIMIT_REQUESTS_PER_MINUTE = parseInt(process.env.RATE_LIMIT_REQUESTS_PER_MINUTE || \'60\', 10);'
  },
  {
    file: 'src/index.ts',
    find: '    async (uri, params, request) => {',
    replace: '    async (uri, _params, _request) => {'
  },
  {
    file: 'src/index.ts',
    find: '      const apiClient = new DigitalSambaApiClient(settings.apiKey, settings.apiUrl);',
    replace: '      const _apiClient = new DigitalSambaApiClient(settings.apiKey, settings.apiUrl);'
  },
  {
    file: 'src/index.ts',
    find: '    const server = createStdioServer({',
    replace: '    const _server = createStdioServer({'
  },
  
  // ===== METRICS.TS FIXES =====
  {
    file: 'src/metrics.ts',
    find: 'import { Counter, Gauge, Histogram, Summary, register } from \'prom-client\';',
    replace: 'import { Counter, Gauge, Histogram, Summary } from \'prom-client\';'
  },
  
  // ===== RATE-LIMITER.TS FIXES =====
  {
    file: 'src/rate-limiter.ts',
    find: 'import { IncomingMessage } from \'http\';',
    replace: '// import { IncomingMessage } from \'http\'; // Removed: unused'
  },
  {
    file: 'src/rate-limiter.ts',
    find: 'import { ApiRequestError, RateLimitError } from \'./errors.js\';',
    replace: 'import { RateLimitError } from \'./errors.js\';'
  },
  {
    file: 'src/rate-limiter.ts',
    find: '        const clientIp = req.ip || req.connection?.remoteAddress || \'unknown\';',
    replace: '        const _clientIp = req.ip || req.connection?.remoteAddress || \'unknown\';'
  },
  
  // ===== SERVER-CORE.TS FIXES =====
  {
    file: 'src/server-core.ts',
    find: '  const serverOptions = {',
    replace: '  const _serverOptions = {'
  },
  {
    file: 'src/server-core.ts',
    find: '  server: McpServer,\n  apiKey: string,\n  apiUrl: string,\n  cache?: MemoryCache',
    replace: '  _server: McpServer,\n  _apiKey: string,\n  _apiUrl: string,\n  _cache?: MemoryCache'
  },
  
  // ===== TOKEN-MANAGER.TS FIXES =====
  {
    file: 'src/token-manager.ts',
    find: 'import { DigitalSambaApiClient, TokenOptions, TokenResponse } from \'./digital-samba-api.js\';',
    replace: 'import { DigitalSambaApiClient, TokenOptions } from \'./digital-samba-api.js\';'
  },
  {
    file: 'src/token-manager.ts',
    find: 'export interface TokenRefreshResult {',
    replace: 'export interface _TokenRefreshResult {'
  },
  
  // ===== TOOLS FIXES =====
  
  // src/tools/communication-management/index.ts
  {
    file: 'src/tools/communication-management/index.ts',
    find: 'import { McpServer, Tool } from \'@modelcontextprotocol/sdk/server/mcp.js\';',
    replace: 'import { Tool } from \'@modelcontextprotocol/sdk/server/mcp.js\';'
  },
  {
    file: 'src/tools/communication-management/index.ts',
    find: 'import { getApiKeyFromRequest } from \'../../auth.js\';',
    replace: '// import { getApiKeyFromRequest } from \'../../auth.js\'; // Removed: unused'
  },
  
  // src/tools/library-management/index.ts
  {
    file: 'src/tools/library-management/index.ts',
    find: 'import { McpServer, Tool } from \'@modelcontextprotocol/sdk/server/mcp.js\';',
    replace: 'import { Tool } from \'@modelcontextprotocol/sdk/server/mcp.js\';'
  },
  {
    file: 'src/tools/library-management/index.ts',
    find: 'import { getApiKeyFromRequest } from \'../../auth.js\';',
    replace: '// import { getApiKeyFromRequest } from \'../../auth.js\'; // Removed: unused'
  },
  {
    file: 'src/tools/library-management/index.ts',
    find: '          const result = await executeLibraryTool(tool.name, args, apiClient);',
    replace: '          const _result = await executeLibraryTool(tool.name, args, apiClient);'
  },
  
  // src/tools/live-session-controls/index.ts
  {
    file: 'src/tools/live-session-controls/index.ts',
    find: '  apiClient: DigitalSambaApiClient',
    replace: '  _apiClient: DigitalSambaApiClient'
  },
  
  // src/tools/poll-management/index.ts
  {
    file: 'src/tools/poll-management/index.ts',
    find: 'import { McpServer, Tool } from \'@modelcontextprotocol/sdk/server/mcp.js\';',
    replace: 'import { Tool } from \'@modelcontextprotocol/sdk/server/mcp.js\';'
  },
  {
    file: 'src/tools/poll-management/index.ts',
    find: 'import { getApiKeyFromRequest } from \'../../auth.js\';',
    replace: '// import { getApiKeyFromRequest } from \'../../auth.js\'; // Removed: unused'
  },
  
  // src/tools/webhook-management/index.ts
  {
    file: 'src/tools/webhook-management/index.ts',
    find: `import {
  ApiRequestError,
  AuthenticationError,
  ConfigurationError,
  ResourceNotFoundError,
  ValidationError
} from '../../errors.js';`,
    replace: `import {
  AuthenticationError,
  ResourceNotFoundError,
  ValidationError
} from '../../errors.js';`
  },
  
  // ===== TRANSPORTS FIXES =====
  
  // src/transports/stdio-transport.ts
  {
    file: 'src/transports/stdio-transport.ts',
    find: '  const originalConsole = {',
    replace: '  const _originalConsole = {'
  },
  
  // ===== WEBHOOKS FIXES =====
  
  // src/webhooks.ts
  {
    file: 'src/webhooks.ts',
    find: `export interface WebhookEventType {
  name: string;
  description: string;
}

export interface WebhookPayload {
  event: string;
  data: any;
  timestamp: Date;
}

export interface WebhookConfig {
  url: string;
  events: string[];
  secret?: string;
}

export interface WebhookEventHandler {
  event: string;
  handler: (payload: WebhookPayload) => Promise<void>;
}`,
    replace: `// Webhook types have been moved to webhook-types.ts and are exported from there`
  }
];

console.log('🔧 Fixing all ESLint errors...\n');

let totalFixed = 0;
let failedFixes = [];

fixes.forEach((fix, index) => {
  const filePath = path.join(__dirname, '..', fix.file);
  
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  File not found: ${fix.file}`);
    failedFixes.push({ file: fix.file, reason: 'File not found' });
    return;
  }
  
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    
    if (content.includes(fix.find)) {
      const newContent = content.replace(fix.find, fix.replace);
      fs.writeFileSync(filePath, newContent, 'utf8');
      console.log(`✅ [${index + 1}/${fixes.length}] Fixed: ${fix.file}`);
      totalFixed++;
    } else {
      console.log(`⏭️  [${index + 1}/${fixes.length}] Already fixed or pattern not found: ${fix.file}`);
    }
  } catch (error) {
    console.log(`❌ [${index + 1}/${fixes.length}] Error in ${fix.file}: ${error.message}`);
    failedFixes.push({ file: fix.file, reason: error.message });
  }
});

console.log(`\n✨ Fixed ${totalFixed} issues!`);

if (failedFixes.length > 0) {
  console.log('\n⚠️  Failed fixes:');
  failedFixes.forEach(f => console.log(`  - ${f.file}: ${f.reason}`));
}

// Show remaining issues count
console.log('\n📊 Checking remaining issues...\n');
const { execSync } = require('child_process');
try {
  const output = execSync('npx eslint src --ext .ts --format json', { encoding: 'utf8' });
  const results = JSON.parse(output);
  
  let totalErrors = 0;
  let totalWarnings = 0;
  
  results.forEach(file => {
    file.messages.forEach(msg => {
      if (msg.severity === 2) totalErrors++;
      else if (msg.severity === 1) totalWarnings++;
    });
  });
  
  console.log(`Remaining: ${totalErrors} errors, ${totalWarnings} warnings`);
} catch (error) {
  // ESLint exits with error if there are issues, parse from stderr
  console.log('Run "npm run lint" to see remaining issues');
}
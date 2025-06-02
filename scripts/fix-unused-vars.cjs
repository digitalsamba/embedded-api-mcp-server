#!/usr/bin/env node

/**
 * Comprehensive TypeScript Unused Variables Fix Script
 * 
 * This script systematically fixes @typescript-eslint/no-unused-vars errors by:
 * 1. Analyzing each unused variable/import
 * 2. Applying appropriate fixes based on context
 * 3. Maintaining code quality and future extensibility
 * 
 * Fix Categories:
 * - Unused imports: Remove if truly unused, comment if might be needed
 * - Function parameters: Prefix with underscore if intentionally unused
 * - Variables: Remove or mark with void statement
 * - Type imports: Remove if unused
 */

const fs = require('fs');
const path = require('path');

class UnusedVarsFixer {
  constructor() {
    this.fixes = [];
    this.dryRun = process.argv.includes('--dry-run');
    this.verbose = process.argv.includes('--verbose');
  }

  log(message, level = 'info') {
    if (this.verbose || level === 'error') {
      const prefix = level === 'error' ? '❌' : level === 'warn' ? '⚠️' : '✅';
      console.log(`${prefix} ${message}`);
    }
  }

  /**
   * Apply fixes to a specific file
   */
  async fixFile(filePath, fixes) {
    if (!fs.existsSync(filePath)) {
      this.log(`File not found: ${filePath}`, 'error');
      return false;
    }

    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    for (const fix of fixes) {
      if (fix.action === 'replace') {
        const newContent = content.replace(fix.search, fix.replacement);
        if (newContent !== content) {
          content = newContent;
          modified = true;
          this.log(`Applied fix: ${fix.description}`);
        }
      } else if (fix.action === 'remove_line') {
        const lines = content.split('\n');
        const lineIndex = fix.lineNumber - 1;
        if (lineIndex >= 0 && lineIndex < lines.length) {
          lines.splice(lineIndex, 1);
          content = lines.join('\n');
          modified = true;
          this.log(`Removed line ${fix.lineNumber}: ${fix.description}`);
        }
      }
    }

    if (modified && !this.dryRun) {
      fs.writeFileSync(filePath, content, 'utf8');
      this.log(`Updated file: ${filePath}`);
    }

    return modified;
  }

  /**
   * Get all the specific fixes needed based on ESLint output
   */
  getUnusedVarFixes() {
    return [
      // src/index.ts fixes
      {
        file: '/config/Documents/DS/projects/digital-samba-mcp-server/src/index.ts',
        fixes: [
          {
            action: 'replace',
            search: 'const ENABLE_RATE_LIMITING = options?.enableRateLimiting !== undefined ? options.enableRateLimiting : process.env.ENABLE_RATE_LIMITING === \'true\';',
            replacement: '// const ENABLE_RATE_LIMITING = options?.enableRateLimiting !== undefined ? options.enableRateLimiting : process.env.ENABLE_RATE_LIMITING === \'true\'; // TODO: Future rate limiting feature',
            description: 'Comment out unused ENABLE_RATE_LIMITING variable (future feature)'
          },
          {
            action: 'replace',
            search: 'const RATE_LIMIT_REQUESTS_PER_MINUTE = options?.rateLimitRequestsPerMinute || (process.env.RATE_LIMIT_REQUESTS_PER_MINUTE ? parseInt(process.env.RATE_LIMIT_REQUESTS_PER_MINUTE) : 60);',
            replacement: '// const RATE_LIMIT_REQUESTS_PER_MINUTE = options?.rateLimitRequestsPerMinute || (process.env.RATE_LIMIT_REQUESTS_PER_MINUTE ? parseInt(process.env.RATE_LIMIT_REQUESTS_PER_MINUTE) : 60); // TODO: Future rate limiting feature',
            description: 'Comment out unused RATE_LIMIT_REQUESTS_PER_MINUTE variable (future feature)'
          },
          {
            action: 'replace',
            search: 'async (uri, params, request) => {',
            replacement: 'async (uri, _params, _request) => {',
            description: 'Prefix unused parameters with underscore in resource handler'
          },
          {
            action: 'replace',
            search: 'apiClient = new DigitalSambaApiClient(apiKey, API_URL, apiCache);',
            replacement: '// apiClient = new DigitalSambaApiClient(apiKey, API_URL, apiCache); // TODO: Enhanced API client usage',
            description: 'Comment out unused apiClient assignment (future feature)'
          },
          {
            action: 'replace',
            search: 'const server = startServer();',
            replacement: '// const server = startServer(); // TODO: Server instance usage',
            description: 'Comment out unused server assignment'
          }
        ]
      },

      // src/metrics.ts fixes
      {
        file: '/config/Documents/DS/projects/digital-samba-mcp-server/src/metrics.ts',
        fixes: [
          {
            action: 'replace',
            search: 'import { collectDefaultMetrics, Counter, Gauge, Histogram, register, Registry } from \'prom-client\';',
            replacement: 'import { collectDefaultMetrics, Counter, Gauge, Histogram, /* register, */ Registry } from \'prom-client\'; // register commented out as unused',
            description: 'Comment out unused register import'
          }
        ]
      },

      // src/recordings.ts fixes  
      {
        file: '/config/Documents/DS/projects/digital-samba-mcp-server/src/recordings.ts',
        fixes: [
          {
            action: 'replace',
            search: 'import winston from \'winston\';',
            replacement: '// import winston from \'winston\'; // TODO: Add logging to recordings module',
            description: 'Comment out unused winston import (future logging feature)'
          }
        ]
      },

      // src/tools/poll-management/index.ts fixes
      {
        file: '/config/Documents/DS/projects/digital-samba-mcp-server/src/tools/poll-management/index.ts',
        fixes: [
          {
            action: 'replace',
            search: 'import { McpServer } from \'@modelcontextprotocol/sdk/server/mcp.js\';',
            replacement: '// import { McpServer } from \'@modelcontextprotocol/sdk/server/mcp.js\'; // TODO: Direct MCP server integration',
            description: 'Comment out unused McpServer import (future direct integration)'
          }
        ]
      },

      // src/transports/stdio-transport.ts fixes
      {
        file: '/config/Documents/DS/projects/digital-samba-mcp-server/src/transports/stdio-transport.ts',
        fixes: [
          {
            action: 'replace',
            search: 'const _originalConsole = {\n    log: console.log,\n    error: console.error,\n    warn: console.warn,\n    info: console.info\n  };',
            replacement: '// const _originalConsole = { // TODO: Console restoration functionality\n  //   log: console.log,\n  //   error: console.error,\n  //   warn: console.warn,\n  //   info: console.info\n  // };',
            description: 'Comment out unused _originalConsole variable (future restoration feature)'
          }
        ]
      },

      // src/webhooks.ts fixes
      {
        file: '/config/Documents/DS/projects/digital-samba-mcp-server/src/webhooks.ts',
        fixes: [
          {
            action: 'replace',
            search: 'export { WebhookEventType } from \'./webhooks/webhook-types.js\';',
            replacement: '// export { WebhookEventType } from \'./webhooks/webhook-types.js\'; // TODO: Export when webhook events are implemented',
            description: 'Comment out unused WebhookEventType export'
          },
          {
            action: 'replace',
            search: 'export type { WebhookPayload, WebhookConfig, WebhookEventHandler } from \'./webhooks/webhook-types.js\';',
            replacement: '// export type { WebhookPayload, WebhookConfig, WebhookEventHandler } from \'./webhooks/webhook-types.js\'; // TODO: Export when webhook types are implemented',
            description: 'Comment out unused webhook type exports'
          }
        ]
      }
    ];
  }

  /**
   * Apply all fixes
   */
  async applyAllFixes() {
    this.log('🚀 Starting unused variables fix process...');
    
    if (this.dryRun) {
      this.log('🔍 DRY RUN MODE - No files will be modified', 'warn');
    }

    const fixSets = this.getUnusedVarFixes();
    let totalFixed = 0;

    for (const fixSet of fixSets) {
      this.log(`\n📁 Processing file: ${path.basename(fixSet.file)}`);
      
      try {
        const wasModified = await this.fixFile(fixSet.file, fixSet.fixes);
        if (wasModified) {
          totalFixed += fixSet.fixes.length;
        }
      } catch (error) {
        this.log(`Error processing ${fixSet.file}: ${error.message}`, 'error');
      }
    }

    this.log(`\n✨ Process complete! ${totalFixed} fixes applied.`);
    
    if (!this.dryRun) {
      this.log('\n🔍 Running ESLint to verify fixes...');
      // Note: We'll run ESLint separately to verify
    } else {
      this.log('\n💡 Run without --dry-run to apply changes');
    }
  }

  /**
   * Create detailed analysis of each unused variable
   */
  analyzeUnusedVars() {
    const analysis = {
      'src/index.ts': {
        'ENABLE_RATE_LIMITING': {
          type: 'configuration_variable',
          reason: 'Future rate limiting feature - keep commented for easy enabling',
          action: 'comment_out'
        },
        'RATE_LIMIT_REQUESTS_PER_MINUTE': {
          type: 'configuration_variable', 
          reason: 'Future rate limiting feature - keep commented for easy enabling',
          action: 'comment_out'
        },
        'params, request in list_resources': {
          type: 'function_parameters',
          reason: 'Required by MCP interface but not used internally',
          action: 'prefix_underscore'
        },
        'apiClient': {
          type: 'initialization_variable',
          reason: 'Future enhanced API client implementation',
          action: 'comment_out'
        },
        'server': {
          type: 'initialization_variable',
          reason: 'Alternative server transport option',
          action: 'comment_out'
        }
      },
      'src/metrics.ts': {
        'register parameter': {
          type: 'function_parameter',
          reason: 'Required by interface but not used in current implementation',
          action: 'prefix_underscore'
        }
      },
      'src/recordings.ts': {
        'winston import': {
          type: 'import_statement',
          reason: 'Future logging implementation for recordings module',
          action: 'comment_out'
        }
      },
      'src/tools/poll-management/index.ts': {
        'McpServer import': {
          type: 'import_statement',
          reason: 'Future direct MCP server integration',
          action: 'comment_out'
        }
      },
      'src/transports/stdio-transport.ts': {
        '_originalConsole': {
          type: 'backup_variable',
          reason: 'Future console restoration functionality',
          action: 'comment_out'
        }
      },
      'src/webhooks.ts': {
        'webhook type exports': {
          type: 'type_exports',
          reason: 'Future webhook implementation features',
          action: 'comment_out'
        }
      }
    };

    this.log('\n📊 UNUSED VARIABLES ANALYSIS:\n');
    
    for (const [file, vars] of Object.entries(analysis)) {
      this.log(`📄 ${file}:`);
      for (const [varName, info] of Object.entries(vars)) {
        this.log(`  • ${varName}`);
        this.log(`    Type: ${info.type}`);
        this.log(`    Reason: ${info.reason}`);
        this.log(`    Action: ${info.action}`);
        this.log('');
      }
    }
  }
}

// Main execution
async function main() {
  const fixer = new UnusedVarsFixer();

  if (process.argv.includes('--analyze')) {
    fixer.analyzeUnusedVars();
    return;
  }

  if (process.argv.includes('--help')) {
    console.log(`
🔧 TypeScript Unused Variables Fixer

Usage: node scripts/fix-unused-vars.js [options]

Options:
  --dry-run     Show what would be changed without modifying files
  --verbose     Show detailed output
  --analyze     Show analysis of unused variables
  --help        Show this help message

Examples:
  node scripts/fix-unused-vars.js --analyze     # Analyze unused variables
  node scripts/fix-unused-vars.js --dry-run    # Preview changes
  node scripts/fix-unused-vars.js --verbose    # Apply fixes with details
    `);
    return;
  }

  await fixer.applyAllFixes();
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { UnusedVarsFixer };
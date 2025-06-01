#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const fixes = [
  // Fix unused resourceType and resourceId in digital-samba-api.ts
  {
    file: 'src/digital-samba-api.ts',
    find: '          const resourceType = matches ? matches[1] : \'resource\';\n          const resourceId = matches ? matches[2] : \'unknown\';',
    replace: '          const _resourceType = matches ? matches[1] : \'resource\';\n          const _resourceId = matches ? matches[2] : \'unknown\';'
  },
  // Remove unused ApiRequestError import from graceful-degradation.ts
  {
    file: 'src/graceful-degradation.ts',
    find: 'import { ApiRequestError, DegradedServiceError } from \'./errors.js\';',
    replace: 'import { DegradedServiceError } from \'./errors.js\';'
  },
  // Fix unused config parameter in graceful-degradation.ts
  {
    file: 'src/graceful-degradation.ts',
    find: '        .some(([opName, config]) => opName === componentName);',
    replace: '        .some(([opName, _config]) => opName === componentName);'
  },
  // Fix unused originalConsole in index.ts
  {
    file: 'src/index.ts',
    find: '  const originalConsole = {',
    replace: '  const _originalConsole = {'
  },
  // Remove unused z import from index.ts
  {
    file: 'src/index.ts',
    find: 'import { z } from \'zod\';',
    replace: '// import { z } from \'zod\'; // Removed: unused'
  },
  // Remove unused createConnectionManager import from index.ts
  {
    file: 'src/index.ts',
    find: 'import { ConnectionManager, createConnectionManager } from \'./connection-manager.js\';',
    replace: 'import { ConnectionManager } from \'./connection-manager.js\';'
  },
  // Remove unused imports from various files
  {
    file: 'src/index.ts',
    find: 'import { generateMeeting, updateMeeting, deleteMeeting, addMeetingParticipant } from \'./meetings.js\';',
    replace: '// Meetings functionality is imported but not directly used in index'
  },
  // Remove unused z imports from tools
  {
    file: 'src/tools/room-management/index.ts',
    find: 'import { z } from \'zod\';',
    replace: '// import { z } from \'zod\'; // Removed: unused'
  },
  {
    file: 'src/tools/session-management/index.ts',
    find: 'import { z } from \'zod\';',
    replace: '// import { z } from \'zod\'; // Removed: unused'
  },
  // Fix unused parameters in webhook files
  {
    file: 'src/webhooks/webhook-service.ts',
    find: 'import { getApiKeyFromRequest } from \'../auth.js\';',
    replace: '// import { getApiKeyFromRequest } from \'../auth.js\'; // Removed: unused'
  },
  // Fix unused imports in tools
  {
    file: 'src/tools/webhook-management/index.ts',
    find: 'import {\n  ApiRequestError,\n  AuthenticationError,\n  ConfigurationError,\n  ResourceNotFoundError,\n  ValidationError\n} from \'../../errors.js\';',
    replace: 'import {\n  AuthenticationError,\n  ResourceNotFoundError,\n  ValidationError\n} from \'../../errors.js\';'
  },
  // Fix let -> const issues
  {
    file: 'src/tools/webhook-management/index.ts',
    find: '        let errorResponse = {',
    replace: '        const errorResponse = {'
  }
];

console.log('🔧 Fixing common unused variable issues...\n');

let totalFixed = 0;

fixes.forEach(fix => {
  const filePath = path.join(__dirname, '..', fix.file);
  
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  File not found: ${fix.file}`);
    return;
  }
  
  const content = fs.readFileSync(filePath, 'utf8');
  
  if (content.includes(fix.find)) {
    const newContent = content.replace(fix.find, fix.replace);
    fs.writeFileSync(filePath, newContent, 'utf8');
    console.log(`✅ Fixed: ${fix.file}`);
    totalFixed++;
  } else {
    console.log(`⏭️  Already fixed or not found: ${fix.file}`);
  }
});

console.log(`\n✨ Fixed ${totalFixed} issues!`);

// Run ESLint to check remaining issues
console.log('\n📊 Remaining ESLint issues:\n');
try {
  execSync('npx eslint src --ext .ts', { stdio: 'inherit' });
} catch (error) {
  // ESLint exits with error code if there are issues
}
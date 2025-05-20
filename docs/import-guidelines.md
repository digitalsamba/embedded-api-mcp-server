# Import Ordering Guidelines for Digital Samba MCP Server

To ensure consistency across the codebase, all import statements should follow these guidelines:

## Import Order

Imports should be grouped in the following order, with a blank line between each group:

1. **Node.js built-in modules** (e.g., fs, path, http, crypto)
2. **External dependencies** (third-party packages)
3. **MCP SDK imports**
4. **Local modules** (from this project)
5. **Type imports** (if separated)

## Example

```typescript
// 1. Node.js built-in modules
import { createServer } from 'http';
import { randomUUID } from 'crypto';
import path from 'path';

// 2. External dependencies
import express from 'express';
import { z } from 'zod';
import winston from 'winston';

// 3. MCP SDK imports
import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';

// 4. Local modules
import { DigitalSambaApiClient } from './digital-samba-api.js';
import logger from './logger.js';
import apiKeyContext, { getApiKeyFromRequest } from './auth.js';
import WebhookService, { setupWebhookTools } from './webhooks.js';
import { setupMeetingSchedulingFunctionality } from './meetings.js';
```

## Additional Guidelines

1. **Alphabetical Sorting**: Within each group, imports should be sorted alphabetically.
2. **Named Imports**: Named imports should be sorted alphabetically, e.g., `import { a, b, c } from 'module';`
3. **Default Imports**: Default imports should come before named imports from the same module.
4. **No Inline Comments**: Avoid placing comments on the same line as an import.
5. **Type Imports**: Consider using explicit type imports with `import type { ... }` for TypeScript types.
6. **Absolute Paths**: Use absolute paths for imports when available.

## Example Implementation

Let's apply these guidelines to a file:

### Before:

```typescript
import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import express from 'express';
import { createServer as createHttpServer } from 'http';
import { randomUUID } from 'crypto';
import { z } from 'zod';
import { DigitalSambaApiClient } from './digital-samba-api.js';
import logger from './logger.js';
import apiKeyContext from './auth.js';
```

### After:

```typescript
import { randomUUID } from 'crypto';
import { createServer as createHttpServer } from 'http';

import express from 'express';
import { z } from 'zod';

import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';

import apiKeyContext from './auth.js';
import { DigitalSambaApiClient } from './digital-samba-api.js';
import logger from './logger.js';
```

## Benefits of Standardized Imports

- Improved code readability
- Easier to detect unused imports
- Simplified merge conflict resolution
- Better organization of dependencies
- Consistent codebase style

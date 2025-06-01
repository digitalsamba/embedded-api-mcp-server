[36m[1m🔧 Digital Samba MCP Server - Manual ESLint Fixes Guide[0m

[34mAnalyzing current ESLint issues...[0m

[31m[1m❌ Unused Variables (65 issues)[0m

[34m📄 src/digital-samba-api.ts[0m

  [33mLine 691:17[0m - 'resourceType' is assigned a value but never used.
[37m   688 |           // Not Found error[0m
[37m   689 |           // Try to extract resource type and ID from the endpoint[0m
[37m   690 |           const matches = endpoint.match(/\/([^/]+)\/([^/]+)/);[0m
[33m>  691 |           const resourceType = matches ? matches[1] : 'resource';[0m
[37m   692 |           const resourceId = matches ? matches[2] : 'unknown';[0m
[37m   693 |           [0m
[37m   694 |           // For backwards compatibility with tests, throw a generic API error[0m

  [32mSuggested fixes:[0m
  1. Remove the variable if truly unused
  2. Prefix with underscore: [36m_resourceType[0m
  3. Add a comment explaining why it's needed: [36m// eslint-disable-next-line @typescript-eslint/no-unused-vars[0m

  [33mLine 692:17[0m - 'resourceId' is assigned a value but never used.
[37m   689 |           // Try to extract resource type and ID from the endpoint[0m
[37m   690 |           const matches = endpoint.match(/\/([^/]+)\/([^/]+)/);[0m
[37m   691 |           const resourceType = matches ? matches[1] : 'resource';[0m
[33m>  692 |           const resourceId = matches ? matches[2] : 'unknown';[0m
[37m   693 |           [0m
[37m   694 |           // For backwards compatibility with tests, throw a generic API error[0m
[37m   695 |           throw new ApiResponseError([0m

  [32mSuggested fixes:[0m
  1. Remove the variable if truly unused
  2. Prefix with underscore: [36m_resourceId[0m
  3. Add a comment explaining why it's needed: [36m// eslint-disable-next-line @typescript-eslint/no-unused-vars[0m

[34m📄 src/graceful-degradation.ts[0m

  [33mLine 27:10[0m - 'ApiRequestError' is defined but never used.
[37m    24 | // Local modules[0m
[37m    25 | import { MemoryCache } from './cache.js';[0m
[37m    26 | import logger from './logger.js';[0m
[33m>   27 | import { ApiRequestError, DegradedServiceError } from './errors.js';[0m
[37m    28 | import circuitBreakerRegistry, { CircuitBreaker, CircuitState } from './circuit-breaker.js';[0m
[37m    29 | [0m
[37m    30 | /**[0m

  [32mSuggested fixes:[0m
  1. Remove the variable if truly unused
  2. Prefix with underscore: [36m_ApiRequestError[0m
  3. Add a comment explaining why it's needed: [36m// eslint-disable-next-line @typescript-eslint/no-unused-vars[0m

  [33mLine 795:25[0m - 'config' is defined but never used. Allowed unused args must match /^_/u.
[37m   792 |       [0m
[37m   793 |       // Check if component has a fallback[0m
[37m   794 |       const hasFallback = Array.from(this.fallbacks.entries())[0m
[33m>  795 |         .some(([opName, config]) => opName === componentName);[0m
[37m   796 |       [0m
[37m   797 |       // Get the fallback config if it exists[0m
[37m   798 |       const fallbackConfig = Array.from(this.fallbacks.entries())[0m

  [32mSuggested fixes:[0m
  1. Remove the variable if truly unused
  2. Prefix with underscore: [36m_config[0m
  3. Add a comment explaining why it's needed: [36m// eslint-disable-next-line @typescript-eslint/no-unused-vars[0m

[34m📄 src/index.ts[0m

  [33mLine 13:9[0m - 'originalConsole' is assigned a value but never used.
[37m    10 | // as it would interfere with the JSON-RPC protocol[0m
[37m    11 | if (isMcpJsonRpcMode) {[0m
[37m    12 |   // In MCP mode, redirect all stdout console outputs to stderr[0m
[33m>   13 |   const originalConsole = {[0m
[37m    14 |     log: console.log,[0m
[37m    15 |     info: console.info,[0m
[37m    16 |     warn: console.warn[0m

  [32mSuggested fixes:[0m
  1. Remove the variable if truly unused
  2. Prefix with underscore: [36m_originalConsole[0m
  3. Add a comment explaining why it's needed: [36m// eslint-disable-next-line @typescript-eslint/no-unused-vars[0m

  [33mLine 39:10[0m - 'z' is defined but never used.
[37m    36 | [0m
[37m    37 | // External dependencies[0m
[37m    38 | import express from 'express';[0m
[33m>   39 | import { z } from 'zod';[0m
[37m    40 | [0m
[37m    41 | // MCP SDK imports[0m
[37m    42 | import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';[0m

  [32mSuggested fixes:[0m
  1. Remove the variable if truly unused
  2. Prefix with underscore: [36m_z[0m
  3. Add a comment explaining why it's needed: [36m// eslint-disable-next-line @typescript-eslint/no-unused-vars[0m

  [33mLine 47:10[0m - 'createConnectionManager' is defined but never used.
[37m    44 | [0m
[37m    45 | // Local modules[0m
[37m    46 | import apiKeyContext, { extractApiKey, getApiKeyFromRequest } from './auth.js';[0m
[33m>   47 | import { createConnectionManager } from './connection-manager.js';[0m
[37m    48 | import { createTokenManager } from './token-manager.js';[0m
[37m    49 | import { createResourceOptimizer } from './resource-optimizer.js';[0m
[37m    50 | import { createEnhancedApiClient, EnhancedDigitalSambaApiClient } from './digital-samba-api-enhanced.js';[0m

  [32mSuggested fixes:[0m
  1. Remove the variable if truly unused
  2. Prefix with underscore: [36m_createConnectionManager[0m
  3. Add a comment explaining why it's needed: [36m// eslint-disable-next-line @typescript-eslint/no-unused-vars[0m

  [33mLine 48:10[0m - 'createTokenManager' is defined but never used.
[37m    45 | // Local modules[0m
[37m    46 | import apiKeyContext, { extractApiKey, getApiKeyFromRequest } from './auth.js';[0m
[37m    47 | import { createConnectionManager } from './connection-manager.js';[0m
[33m>   48 | import { createTokenManager } from './token-manager.js';[0m
[37m    49 | import { createResourceOptimizer } from './resource-optimizer.js';[0m
[37m    50 | import { createEnhancedApiClient, EnhancedDigitalSambaApiClient } from './digital-samba-api-enhanced.js';[0m
[37m    51 | import { CircuitBreakerApiClient } from './digital-samba-api-circuit-breaker.js';[0m

  [32mSuggested fixes:[0m
  1. Remove the variable if truly unused
  2. Prefix with underscore: [36m_createTokenManager[0m
  3. Add a comment explaining why it's needed: [36m// eslint-disable-next-line @typescript-eslint/no-unused-vars[0m

  [33mLine 49:10[0m - 'createResourceOptimizer' is defined but never used.
[37m    46 | import apiKeyContext, { extractApiKey, getApiKeyFromRequest } from './auth.js';[0m
[37m    47 | import { createConnectionManager } from './connection-manager.js';[0m
[37m    48 | import { createTokenManager } from './token-manager.js';[0m
[33m>   49 | import { createResourceOptimizer } from './resource-optimizer.js';[0m
[37m    50 | import { createEnhancedApiClient, EnhancedDigitalSambaApiClient } from './digital-samba-api-enhanced.js';[0m
[37m    51 | import { CircuitBreakerApiClient } from './digital-samba-api-circuit-breaker.js';[0m
[37m    52 | import ResilientApiClient from './digital-samba-api-resilient.js';[0m

  [32mSuggested fixes:[0m
  1. Remove the variable if truly unused
  2. Prefix with underscore: [36m_createResourceOptimizer[0m
  3. Add a comment explaining why it's needed: [36m// eslint-disable-next-line @typescript-eslint/no-unused-vars[0m

  [33mLine 50:10[0m - 'createEnhancedApiClient' is defined but never used.
[37m    47 | import { createConnectionManager } from './connection-manager.js';[0m
[37m    48 | import { createTokenManager } from './token-manager.js';[0m
[37m    49 | import { createResourceOptimizer } from './resource-optimizer.js';[0m
[33m>   50 | import { createEnhancedApiClient, EnhancedDigitalSambaApiClient } from './digital-samba-api-enhanced.js';[0m
[37m    51 | import { CircuitBreakerApiClient } from './digital-samba-api-circuit-breaker.js';[0m
[37m    52 | import ResilientApiClient from './digital-samba-api-resilient.js';[0m
[37m    53 | import { MemoryCache } from './cache.js';[0m

  [32mSuggested fixes:[0m
  1. Remove the variable if truly unused
  2. Prefix with underscore: [36m_createEnhancedApiClient[0m
  3. Add a comment explaining why it's needed: [36m// eslint-disable-next-line @typescript-eslint/no-unused-vars[0m

  [33mLine 51:10[0m - 'CircuitBreakerApiClient' is defined but never used.
[37m    48 | import { createTokenManager } from './token-manager.js';[0m
[37m    49 | import { createResourceOptimizer } from './resource-optimizer.js';[0m
[37m    50 | import { createEnhancedApiClient, EnhancedDigitalSambaApiClient } from './digital-samba-api-enhanced.js';[0m
[33m>   51 | import { CircuitBreakerApiClient } from './digital-samba-api-circuit-breaker.js';[0m
[37m    52 | import ResilientApiClient from './digital-samba-api-resilient.js';[0m
[37m    53 | import { MemoryCache } from './cache.js';[0m
[37m    54 | import { DigitalSambaApiClient } from './digital-samba-api.js';[0m

  [32mSuggested fixes:[0m
  1. Remove the variable if truly unused
  2. Prefix with underscore: [36m_CircuitBreakerApiClient[0m
  3. Add a comment explaining why it's needed: [36m// eslint-disable-next-line @typescript-eslint/no-unused-vars[0m

  [33mLine 52:8[0m - 'ResilientApiClient' is defined but never used.
[37m    49 | import { createResourceOptimizer } from './resource-optimizer.js';[0m
[37m    50 | import { createEnhancedApiClient, EnhancedDigitalSambaApiClient } from './digital-samba-api-enhanced.js';[0m
[37m    51 | import { CircuitBreakerApiClient } from './digital-samba-api-circuit-breaker.js';[0m
[33m>   52 | import ResilientApiClient from './digital-samba-api-resilient.js';[0m
[37m    53 | import { MemoryCache } from './cache.js';[0m
[37m    54 | import { DigitalSambaApiClient } from './digital-samba-api.js';[0m
[37m    55 | import logger from './logger.js';[0m

  [32mSuggested fixes:[0m
  1. Remove the variable if truly unused
  2. Prefix with underscore: [36m_ResilientApiClient[0m
  3. Add a comment explaining why it's needed: [36m// eslint-disable-next-line @typescript-eslint/no-unused-vars[0m

  [33mLine 61:8[0m - 'AnalyticsResource' is defined but never used.
[37m    58 | import { setupRecordingFunctionality } from './recordings.js';[0m
[37m    59 | import WebhookService, { setupWebhookTools } from './webhooks.js';[0m
[37m    60 | import gracefulDegradation, { ServiceHealthStatus } from './graceful-degradation.js';[0m
[33m>   61 | import AnalyticsResource from './analytics.js';[0m
[37m    62 | import { setupSessionTools } from './sessions.js';[0m
[37m    63 | [0m
[37m    64 | // Import modular resources and tools[0m

  [32mSuggested fixes:[0m
  1. Remove the variable if truly unused
  2. Prefix with underscore: [36m_AnalyticsResource[0m
  3. Add a comment explaining why it's needed: [36m// eslint-disable-next-line @typescript-eslint/no-unused-vars[0m

  [33mLine 62:10[0m - 'setupSessionTools' is defined but never used.
[37m    59 | import WebhookService, { setupWebhookTools } from './webhooks.js';[0m
[37m    60 | import gracefulDegradation, { ServiceHealthStatus } from './graceful-degradation.js';[0m
[37m    61 | import AnalyticsResource from './analytics.js';[0m
[33m>   62 | import { setupSessionTools } from './sessions.js';[0m
[37m    63 | [0m
[37m    64 | // Import modular resources and tools[0m
[37m    65 | import { registerAnalyticsResources, handleAnalyticsResource } from './resources/analytics/index.js';[0m

  [32mSuggested fixes:[0m
  1. Remove the variable if truly unused
  2. Prefix with underscore: [36m_setupSessionTools[0m
  3. Add a comment explaining why it's needed: [36m// eslint-disable-next-line @typescript-eslint/no-unused-vars[0m

  [33mLine 125:9[0m - 'ENABLE_RATE_LIMITING' is assigned a value but never used.
[37m   122 |   const WEBHOOK_SECRET = options?.webhookSecret || process.env.WEBHOOK_SECRET;[0m
[37m   123 |   const WEBHOOK_ENDPOINT = options?.webhookEndpoint || process.env.WEBHOOK_ENDPOINT || '/webhooks/digitalsamba';[0m
[37m   124 |   const PUBLIC_URL = options?.publicUrl || process.env.PUBLIC_URL || `http://localhost:${PORT}`;[0m
[33m>  125 |   const ENABLE_RATE_LIMITING = options?.enableRateLimiting !== undefined ? options.enableRateLimiting : process.env.ENABLE_RATE_LIMITING === 'true';[0m
[37m   126 |   const RATE_LIMIT_REQUESTS_PER_MINUTE = options?.rateLimitRequestsPerMinute || (process.env.RATE_LIMIT_REQUESTS_PER_MINUTE ? parseInt(process.env.RATE_LIMIT_REQUESTS_PER_MINUTE) : 60);[0m
[37m   127 |   const ENABLE_CACHE = options?.enableCache !== undefined ? options.enableCache : process.env.ENABLE_CACHE === 'true';[0m
[37m   128 |   const CACHE_TTL = options?.cacheTtl || (process.env.CACHE_TTL ? parseInt(process.env.CACHE_TTL) : 5 * 60 * 1000); // 5 minutes default[0m

  [32mSuggested fixes:[0m
  1. Remove the variable if truly unused
  2. Prefix with underscore: [36m_ENABLE_RATE_LIMITING[0m
  3. Add a comment explaining why it's needed: [36m// eslint-disable-next-line @typescript-eslint/no-unused-vars[0m

  [33mLine 126:9[0m - 'RATE_LIMIT_REQUESTS_PER_MINUTE' is assigned a value but never used.
[37m   123 |   const WEBHOOK_ENDPOINT = options?.webhookEndpoint || process.env.WEBHOOK_ENDPOINT || '/webhooks/digitalsamba';[0m
[37m   124 |   const PUBLIC_URL = options?.publicUrl || process.env.PUBLIC_URL || `http://localhost:${PORT}`;[0m
[37m   125 |   const ENABLE_RATE_LIMITING = options?.enableRateLimiting !== undefined ? options.enableRateLimiting : process.env.ENABLE_RATE_LIMITING === 'true';[0m
[33m>  126 |   const RATE_LIMIT_REQUESTS_PER_MINUTE = options?.rateLimitRequestsPerMinute || (process.env.RATE_LIMIT_REQUESTS_PER_MINUTE ? parseInt(process.env.RATE_LIMIT_REQUESTS_PER_MINUTE) : 60);[0m
[37m   127 |   const ENABLE_CACHE = options?.enableCache !== undefined ? options.enableCache : process.env.ENABLE_CACHE === 'true';[0m
[37m   128 |   const CACHE_TTL = options?.cacheTtl || (process.env.CACHE_TTL ? parseInt(process.env.CACHE_TTL) : 5 * 60 * 1000); // 5 minutes default[0m
[37m   129 |   const ENABLE_CONNECTION_MANAGEMENT = options?.enableConnectionManagement !== undefined ? options.enableConnectionManagement : process.env.ENABLE_CONNECTION_MANAGEMENT === 'true';[0m

  [32mSuggested fixes:[0m
  1. Remove the variable if truly unused
  2. Prefix with underscore: [36m_RATE_LIMIT_REQUESTS_PER_MINUTE[0m
  3. Add a comment explaining why it's needed: [36m// eslint-disable-next-line @typescript-eslint/no-unused-vars[0m

  [33mLine 328:19[0m - 'params' is defined but never used. Allowed unused args must match /^_/u.
[37m   325 |     server.resource([0m
[37m   326 |       resource.name,[0m
[37m   327 |       new ResourceTemplate(resource.uri, { list: undefined }),[0m
[33m>  328 |       async (uri, params, request) => {[0m
[37m   329 |         logger.info(`Handling export resource: ${resource.name}`);[0m
[37m   330 |         [0m
[37m   331 |         try {[0m

  [32mSuggested fixes:[0m
  1. Remove the variable if truly unused
  2. Prefix with underscore: [36m_params[0m
  3. Add a comment explaining why it's needed: [36m// eslint-disable-next-line @typescript-eslint/no-unused-vars[0m

  [33mLine 328:27[0m - 'request' is defined but never used. Allowed unused args must match /^_/u.
[37m   325 |     server.resource([0m
[37m   326 |       resource.name,[0m
[37m   327 |       new ResourceTemplate(resource.uri, { list: undefined }),[0m
[33m>  328 |       async (uri, params, request) => {[0m
[37m   329 |         logger.info(`Handling export resource: ${resource.name}`);[0m
[37m   330 |         [0m
[37m   331 |         try {[0m

  [32mSuggested fixes:[0m
  1. Remove the variable if truly unused
  2. Prefix with underscore: [36m_request[0m
  3. Add a comment explaining why it's needed: [36m// eslint-disable-next-line @typescript-eslint/no-unused-vars[0m

  [33mLine 388:11[0m - 'apiClient' is assigned a value but never used.
[37m   385 |             }[0m
[37m   386 |           );[0m
[37m   387 |         } else {[0m
[33m>  388 |           apiClient = new DigitalSambaApiClient(apiKey, API_URL, apiCache);[0m
[37m   389 |         }[0m
[37m   390 |         [0m
[37m   391 |         // Execute the tool using the modular function[0m

  [32mSuggested fixes:[0m
  1. Remove the variable if truly unused
  2. Prefix with underscore: [36m_apiClient[0m
  3. Add a comment explaining why it's needed: [36m// eslint-disable-next-line @typescript-eslint/no-unused-vars[0m

  [33mLine 1157:11[0m - 'server' is assigned a value but never used.
[37m  1154 |       cacheEnabled: !!serverConfig.cache[0m
[37m  1155 |     });[0m
[37m  1156 |     [0m
[33m> 1157 |     const server = startServer();[0m
[37m  1158 |     console.log(`Server started successfully`);[0m
[37m  1159 |   } catch (error) {[0m
[37m  1160 |     console.error('Failed to start server:', error);[0m

  [32mSuggested fixes:[0m
  1. Remove the variable if truly unused
  2. Prefix with underscore: [36m_server[0m
  3. Add a comment explaining why it's needed: [36m// eslint-disable-next-line @typescript-eslint/no-unused-vars[0m

[34m📄 src/metrics.ts[0m

  [33mLine 24:60[0m - 'register' is defined but never used.
[37m    21 | import os from 'os';[0m
[37m    22 | [0m
[37m    23 | // External dependencies[0m
[33m>   24 | import { collectDefaultMetrics, Counter, Gauge, Histogram, register, Registry } from 'prom-client';[0m
[37m    25 | import express from 'express';[0m
[37m    26 | [0m
[37m    27 | // Local modules[0m

  [32mSuggested fixes:[0m
  1. Remove the variable if truly unused
  2. Prefix with underscore: [36m_register[0m
  3. Add a comment explaining why it's needed: [36m// eslint-disable-next-line @typescript-eslint/no-unused-vars[0m

[34m📄 src/rate-limiter.ts[0m

  [33mLine 22:10[0m - 'IncomingMessage' is defined but never used.
[37m    19 |  */[0m
[37m    20 | [0m
[37m    21 | // Node.js built-in modules[0m
[33m>   22 | import { IncomingMessage } from 'http';[0m
[37m    23 | [0m
[37m    24 | // External dependencies [0m
[37m    25 | import { Request, Response, NextFunction } from 'express';[0m

  [32mSuggested fixes:[0m
  1. Remove the variable if truly unused
  2. Prefix with underscore: [36m_IncomingMessage[0m
  3. Add a comment explaining why it's needed: [36m// eslint-disable-next-line @typescript-eslint/no-unused-vars[0m

  [33mLine 29:10[0m - 'ApiRequestError' is defined but never used.
[37m    26 | [0m
[37m    27 | // Local modules[0m
[37m    28 | import logger from './logger.js';[0m
[33m>   29 | import { ApiRequestError } from './errors.js';[0m
[37m    30 | [0m
[37m    31 | /**[0m
[37m    32 |  * Rate limiter options interface[0m

  [32mSuggested fixes:[0m
  1. Remove the variable if truly unused
  2. Prefix with underscore: [36m_ApiRequestError[0m
  3. Add a comment explaining why it's needed: [36m// eslint-disable-next-line @typescript-eslint/no-unused-vars[0m

  [33mLine 202:9[0m - 'clientIp' is assigned a value but never used.
[37m   199 |       // Trust proxy if enabled[0m
[37m   200 |       let clientIp = req.ip;[0m
[37m   201 |       if (this.options.trustProxy && req.headers['x-forwarded-for']) {[0m
[33m>  202 |         clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() || req.ip;[0m
[37m   203 |       }[0m
[37m   204 |       [0m
[37m   205 |       // Generate client key[0m

  [32mSuggested fixes:[0m
  1. Remove the variable if truly unused
  2. Prefix with underscore: [36m_clientIp[0m
  3. Add a comment explaining why it's needed: [36m// eslint-disable-next-line @typescript-eslint/no-unused-vars[0m

[34m📄 src/resources/analytics/index.ts[0m

  [33mLine 23:9[0m - 'analytics' is assigned a value but never used.
[37m    20 |  * @returns Array of MCP Resource definitions[0m
[37m    21 |  */[0m
[37m    22 | export function registerAnalyticsResources(apiClient: DigitalSambaApiClient): Resource[] {[0m
[33m>   23 |   const analytics = new AnalyticsResource(apiClient);[0m
[37m    24 |   [0m
[37m    25 |   return [[0m
[37m    26 |     {[0m

  [32mSuggested fixes:[0m
  1. Remove the variable if truly unused
  2. Prefix with underscore: [36m_analytics[0m
  3. Add a comment explaining why it's needed: [36m// eslint-disable-next-line @typescript-eslint/no-unused-vars[0m

[34m📄 src/resources/content/index.ts[0m

  [33mLine 22:10[0m - 'z' is defined but never used.
[37m    19 |  */[0m
[37m    20 | [0m
[37m    21 | // External dependencies[0m
[33m>   22 | import { z } from 'zod';[0m
[37m    23 | [0m
[37m    24 | // MCP SDK imports[0m
[37m    25 | import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';[0m

  [32mSuggested fixes:[0m
  1. Remove the variable if truly unused
  2. Prefix with underscore: [36m_z[0m
  3. Add a comment explaining why it's needed: [36m// eslint-disable-next-line @typescript-eslint/no-unused-vars[0m

  [33mLine 25:10[0m - 'McpServer' is defined but never used.
[37m    22 | import { z } from 'zod';[0m
[37m    23 | [0m
[37m    24 | // MCP SDK imports[0m
[33m>   25 | import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';[0m
[37m    26 | import { [0m
[37m    27 |   ErrorCode, [0m
[37m    28 |   McpError,[0m

  [32mSuggested fixes:[0m
  1. Remove the variable if truly unused
  2. Prefix with underscore: [36m_McpServer[0m
  3. Add a comment explaining why it's needed: [36m// eslint-disable-next-line @typescript-eslint/no-unused-vars[0m

  [33mLine 35:3[0m - 'Library' is defined but never used.
[37m    32 | // Local modules[0m
[37m    33 | import { [0m
[37m    34 |   DigitalSambaApiClient, [0m
[33m>   35 |   Library, [0m
[37m    36 |   LibraryFolder,[0m
[37m    37 |   LibraryFile,[0m
[37m    38 |   ApiResponse [0m

  [32mSuggested fixes:[0m
  1. Remove the variable if truly unused
  2. Prefix with underscore: [36m_Library[0m
  3. Add a comment explaining why it's needed: [36m// eslint-disable-next-line @typescript-eslint/no-unused-vars[0m

  [33mLine 36:3[0m - 'LibraryFolder' is defined but never used.
[37m    33 | import { [0m
[37m    34 |   DigitalSambaApiClient, [0m
[37m    35 |   Library, [0m
[33m>   36 |   LibraryFolder,[0m
[37m    37 |   LibraryFile,[0m
[37m    38 |   ApiResponse [0m
[37m    39 | } from '../../digital-samba-api.js';[0m

  [32mSuggested fixes:[0m
  1. Remove the variable if truly unused
  2. Prefix with underscore: [36m_LibraryFolder[0m
  3. Add a comment explaining why it's needed: [36m// eslint-disable-next-line @typescript-eslint/no-unused-vars[0m

  [33mLine 37:3[0m - 'LibraryFile' is defined but never used.
[37m    34 |   DigitalSambaApiClient, [0m
[37m    35 |   Library, [0m
[37m    36 |   LibraryFolder,[0m
[33m>   37 |   LibraryFile,[0m
[37m    38 |   ApiResponse [0m
[37m    39 | } from '../../digital-samba-api.js';[0m
[37m    40 | import logger from '../../logger.js';[0m

  [32mSuggested fixes:[0m
  1. Remove the variable if truly unused
  2. Prefix with underscore: [36m_LibraryFile[0m
  3. Add a comment explaining why it's needed: [36m// eslint-disable-next-line @typescript-eslint/no-unused-vars[0m

  [33mLine 38:3[0m - 'ApiResponse' is defined but never used.
[37m    35 |   Library, [0m
[37m    36 |   LibraryFolder,[0m
[37m    37 |   LibraryFile,[0m
[33m>   38 |   ApiResponse [0m
[37m    39 | } from '../../digital-samba-api.js';[0m
[37m    40 | import logger from '../../logger.js';[0m
[37m    41 | [0m

  [32mSuggested fixes:[0m
  1. Remove the variable if truly unused
  2. Prefix with underscore: [36m_ApiResponse[0m
  3. Add a comment explaining why it's needed: [36m// eslint-disable-next-line @typescript-eslint/no-unused-vars[0m

[34m📄 src/resources/exports/index.ts[0m

  [33mLine 151:5[0m - 'searchParams' is defined but never used. Allowed unused args must match /^_/u.
[37m   148 |    */[0m
[37m   149 |   private async handleRecordingExport([0m
[37m   150 |     pathParts: string[], [0m
[33m>  151 |     searchParams: URLSearchParams[0m
[37m   152 |   ): Promise<{ contents: Array<{ type: string; text: string }> }> {[0m
[37m   153 |     if (pathParts.length < 3) {[0m
[37m   154 |       throw new McpError(ErrorCode.InvalidRequest, 'Recording export requires: /recordings/{recordingId}');[0m

  [32mSuggested fixes:[0m
  1. Remove the variable if truly unused
  2. Prefix with underscore: [36m_searchParams[0m
  3. Add a comment explaining why it's needed: [36m// eslint-disable-next-line @typescript-eslint/no-unused-vars[0m

  [33mLine 179:5[0m - 'searchParams' is defined but never used. Allowed unused args must match /^_/u.
[37m   176 |    */[0m
[37m   177 |   private async handleSessionExport([0m
[37m   178 |     pathParts: string[], [0m
[33m>  179 |     searchParams: URLSearchParams[0m
[37m   180 |   ): Promise<{ contents: Array<{ type: string; text: string }> }> {[0m
[37m   181 |     if (pathParts.length < 4) {[0m
[37m   182 |       throw new McpError(ErrorCode.InvalidRequest, 'Session export requires: /sessions/{sessionId}/{type}');[0m

  [32mSuggested fixes:[0m
  1. Remove the variable if truly unused
  2. Prefix with underscore: [36m_searchParams[0m
  3. Add a comment explaining why it's needed: [36m// eslint-disable-next-line @typescript-eslint/no-unused-vars[0m

[34m📄 src/resources/recordings/index.ts[0m

  [33mLine 25:3[0m - 'ApiResponseError' is defined but never used.
[37m    22 | import { getApiKeyFromRequest } from '../../auth.js';[0m
[37m    23 | import { DigitalSambaApiClient } from '../../digital-samba-api.js';[0m
[37m    24 | import { [0m
[33m>   25 |   ApiResponseError,[0m
[37m    26 |   AuthenticationError,[0m
[37m    27 |   ResourceNotFoundError, [0m
[37m    28 |   ValidationError[0m

  [32mSuggested fixes:[0m
  1. Remove the variable if truly unused
  2. Prefix with underscore: [36m_ApiResponseError[0m
  3. Add a comment explaining why it's needed: [36m// eslint-disable-next-line @typescript-eslint/no-unused-vars[0m

  [33mLine 27:3[0m - 'ResourceNotFoundError' is defined but never used.
[37m    24 | import { [0m
[37m    25 |   ApiResponseError,[0m
[37m    26 |   AuthenticationError,[0m
[33m>   27 |   ResourceNotFoundError, [0m
[37m    28 |   ValidationError[0m
[37m    29 | } from '../../errors.js';[0m
[37m    30 | import logger from '../../logger.js';[0m

  [32mSuggested fixes:[0m
  1. Remove the variable if truly unused
  2. Prefix with underscore: [36m_ResourceNotFoundError[0m
  3. Add a comment explaining why it's needed: [36m// eslint-disable-next-line @typescript-eslint/no-unused-vars[0m

[34m📄 src/server-core.ts[0m

  [33mLine 61:5[0m - 'serverOptions' is assigned a value but never used.
[37m    58 |     enableWebhooks = false,[0m
[37m    59 |     webhookSecret,[0m
[37m    60 |     webhookEndpoint = '/webhooks/digitalsamba',[0m
[33m>   61 |     serverOptions = {}[0m
[37m    62 |   } = config;[0m
[37m    63 | [0m
[37m    64 |   logger.info('Creating server core', {[0m

  [32mSuggested fixes:[0m
  1. Remove the variable if truly unused
  2. Prefix with underscore: [36m_serverOptions[0m
  3. Add a comment explaining why it's needed: [36m// eslint-disable-next-line @typescript-eslint/no-unused-vars[0m

  [33mLine 102:3[0m - 'server' is defined but never used. Allowed unused args must match /^_/u.
[37m    99 |  * Set up core resources that are available in both HTTP and STDIO modes[0m
[37m   100 |  */[0m
[37m   101 | function setupCoreResources([0m
[33m>  102 |   server: McpServer, [0m
[37m   103 |   apiKey: string | undefined, [0m
[37m   104 |   apiUrl: string, [0m
[37m   105 |   cache?: MemoryCache[0m

  [32mSuggested fixes:[0m
  1. Remove the variable if truly unused
  2. Prefix with underscore: [36m_server[0m
  3. Add a comment explaining why it's needed: [36m// eslint-disable-next-line @typescript-eslint/no-unused-vars[0m

  [33mLine 103:3[0m - 'apiKey' is defined but never used. Allowed unused args must match /^_/u.
[37m   100 |  */[0m
[37m   101 | function setupCoreResources([0m
[37m   102 |   server: McpServer, [0m
[33m>  103 |   apiKey: string | undefined, [0m
[37m   104 |   apiUrl: string, [0m
[37m   105 |   cache?: MemoryCache[0m
[37m   106 | ): void {[0m

  [32mSuggested fixes:[0m
  1. Remove the variable if truly unused
  2. Prefix with underscore: [36m_apiKey[0m
  3. Add a comment explaining why it's needed: [36m// eslint-disable-next-line @typescript-eslint/no-unused-vars[0m

  [33mLine 104:3[0m - 'apiUrl' is defined but never used. Allowed unused args must match /^_/u.
[37m   101 | function setupCoreResources([0m
[37m   102 |   server: McpServer, [0m
[37m   103 |   apiKey: string | undefined, [0m
[33m>  104 |   apiUrl: string, [0m
[37m   105 |   cache?: MemoryCache[0m
[37m   106 | ): void {[0m
[37m   107 |   // Import the resource setup from the main index file[0m

  [32mSuggested fixes:[0m
  1. Remove the variable if truly unused
  2. Prefix with underscore: [36m_apiUrl[0m
  3. Add a comment explaining why it's needed: [36m// eslint-disable-next-line @typescript-eslint/no-unused-vars[0m

  [33mLine 105:3[0m - 'cache' is defined but never used. Allowed unused args must match /^_/u.
[37m   102 |   server: McpServer, [0m
[37m   103 |   apiKey: string | undefined, [0m
[37m   104 |   apiUrl: string, [0m
[33m>  105 |   cache?: MemoryCache[0m
[37m   106 | ): void {[0m
[37m   107 |   // Import the resource setup from the main index file[0m
[37m   108 |   // This ensures we use the exact same resource definitions[0m

  [32mSuggested fixes:[0m
  1. Remove the variable if truly unused
  2. Prefix with underscore: [36m_cache[0m
  3. Add a comment explaining why it's needed: [36m// eslint-disable-next-line @typescript-eslint/no-unused-vars[0m

  [33mLine 123:3[0m - 'server' is defined but never used. Allowed unused args must match /^_/u.
[37m   120 |  * Set up core tools that are available in both HTTP and STDIO modes  [0m
[37m   121 |  */[0m
[37m   122 | function setupCoreTools([0m
[33m>  123 |   server: McpServer,[0m
[37m   124 |   apiKey: string | undefined,[0m
[37m   125 |   apiUrl: string,[0m
[37m   126 |   cache?: MemoryCache[0m

  [32mSuggested fixes:[0m
  1. Remove the variable if truly unused
  2. Prefix with underscore: [36m_server[0m
  3. Add a comment explaining why it's needed: [36m// eslint-disable-next-line @typescript-eslint/no-unused-vars[0m

  [33mLine 124:3[0m - 'apiKey' is defined but never used. Allowed unused args must match /^_/u.
[37m   121 |  */[0m
[37m   122 | function setupCoreTools([0m
[37m   123 |   server: McpServer,[0m
[33m>  124 |   apiKey: string | undefined,[0m
[37m   125 |   apiUrl: string,[0m
[37m   126 |   cache?: MemoryCache[0m
[37m   127 | ): void {[0m

  [32mSuggested fixes:[0m
  1. Remove the variable if truly unused
  2. Prefix with underscore: [36m_apiKey[0m
  3. Add a comment explaining why it's needed: [36m// eslint-disable-next-line @typescript-eslint/no-unused-vars[0m

  [33mLine 125:3[0m - 'apiUrl' is defined but never used. Allowed unused args must match /^_/u.
[37m   122 | function setupCoreTools([0m
[37m   123 |   server: McpServer,[0m
[37m   124 |   apiKey: string | undefined,[0m
[33m>  125 |   apiUrl: string,[0m
[37m   126 |   cache?: MemoryCache[0m
[37m   127 | ): void {[0m
[37m   128 |   // Import the tool setup from the main index file[0m

  [32mSuggested fixes:[0m
  1. Remove the variable if truly unused
  2. Prefix with underscore: [36m_apiUrl[0m
  3. Add a comment explaining why it's needed: [36m// eslint-disable-next-line @typescript-eslint/no-unused-vars[0m

  [33mLine 126:3[0m - 'cache' is defined but never used. Allowed unused args must match /^_/u.
[37m   123 |   server: McpServer,[0m
[37m   124 |   apiKey: string | undefined,[0m
[37m   125 |   apiUrl: string,[0m
[33m>  126 |   cache?: MemoryCache[0m
[37m   127 | ): void {[0m
[37m   128 |   // Import the tool setup from the main index file[0m
[37m   129 |   // This ensures we use the exact same tool definitions[0m

  [32mSuggested fixes:[0m
  1. Remove the variable if truly unused
  2. Prefix with underscore: [36m_cache[0m
  3. Add a comment explaining why it's needed: [36m// eslint-disable-next-line @typescript-eslint/no-unused-vars[0m

[34m📄 src/token-manager.ts[0m

  [33mLine 26:47[0m - 'TokenResponse' is defined but never used.
[37m    23 | import logger from './logger.js';[0m
[37m    24 | import apiKeyContext from './auth.js';[0m
[37m    25 | import { AuthenticationError } from './errors.js';[0m
[33m>   26 | import { DigitalSambaApiClient, TokenOptions, TokenResponse } from './digital-samba-api.js';[0m
[37m    27 | [0m
[37m    28 | /**[0m
[37m    29 |  * Token manager options interface[0m

  [32mSuggested fixes:[0m
  1. Remove the variable if truly unused
  2. Prefix with underscore: [36m_TokenResponse[0m
  3. Add a comment explaining why it's needed: [36m// eslint-disable-next-line @typescript-eslint/no-unused-vars[0m

  [33mLine 80:11[0m - 'TokenRefreshResult' is defined but never used.
[37m    77 | /**[0m
[37m    78 |  * Token refresh result[0m
[37m    79 |  */[0m
[33m>   80 | interface TokenRefreshResult {[0m
[37m    81 |   /** The new token */[0m
[37m    82 |   token: Token;[0m
[37m    83 |   [0m

  [32mSuggested fixes:[0m
  1. Remove the variable if truly unused
  2. Prefix with underscore: [36m_TokenRefreshResult[0m
  3. Add a comment explaining why it's needed: [36m// eslint-disable-next-line @typescript-eslint/no-unused-vars[0m

[34m📄 src/tools/communication-management/index.ts[0m

  [33mLine 26:10[0m - 'McpServer' is defined but never used.
[37m    23 | import { z } from 'zod';[0m
[37m    24 | [0m
[37m    25 | // MCP SDK imports[0m
[33m>   26 | import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';[0m
[37m    27 | import { [0m
[37m    28 |   ErrorCode, [0m
[37m    29 |   McpError[0m

  [32mSuggested fixes:[0m
  1. Remove the variable if truly unused
  2. Prefix with underscore: [36m_McpServer[0m
  3. Add a comment explaining why it's needed: [36m// eslint-disable-next-line @typescript-eslint/no-unused-vars[0m

  [33mLine 33:10[0m - 'getApiKeyFromRequest' is defined but never used.
[37m    30 | } from '@modelcontextprotocol/sdk/types.js';[0m
[37m    31 | [0m
[37m    32 | // Local modules[0m
[33m>   33 | import { getApiKeyFromRequest } from '../../auth.js';[0m
[37m    34 | import { DigitalSambaApiClient } from '../../digital-samba-api.js';[0m
[37m    35 | import logger from '../../logger.js';[0m
[37m    36 | [0m

  [32mSuggested fixes:[0m
  1. Remove the variable if truly unused
  2. Prefix with underscore: [36m_getApiKeyFromRequest[0m
  3. Add a comment explaining why it's needed: [36m// eslint-disable-next-line @typescript-eslint/no-unused-vars[0m

[34m📄 src/tools/library-management/index.ts[0m

  [33mLine 28:10[0m - 'McpServer' is defined but never used.
[37m    25 | import { z } from 'zod';[0m
[37m    26 | [0m
[37m    27 | // MCP SDK imports[0m
[33m>   28 | import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';[0m
[37m    29 | import { [0m
[37m    30 |   ErrorCode, [0m
[37m    31 |   McpError[0m

  [32mSuggested fixes:[0m
  1. Remove the variable if truly unused
  2. Prefix with underscore: [36m_McpServer[0m
  3. Add a comment explaining why it's needed: [36m// eslint-disable-next-line @typescript-eslint/no-unused-vars[0m

  [33mLine 35:10[0m - 'getApiKeyFromRequest' is defined but never used.
[37m    32 | } from '@modelcontextprotocol/sdk/types.js';[0m
[37m    33 | [0m
[37m    34 | // Local modules[0m
[33m>   35 | import { getApiKeyFromRequest } from '../../auth.js';[0m
[37m    36 | import { DigitalSambaApiClient } from '../../digital-samba-api.js';[0m
[37m    37 | import logger from '../../logger.js';[0m
[37m    38 | [0m

  [32mSuggested fixes:[0m
  1. Remove the variable if truly unused
  2. Prefix with underscore: [36m_getApiKeyFromRequest[0m
  3. Add a comment explaining why it's needed: [36m// eslint-disable-next-line @typescript-eslint/no-unused-vars[0m

  [33mLine 304:11[0m - 'result' is assigned a value but never used.
[37m   301 |   logger.info('Updating library', { libraryId, updates });[0m
[37m   302 |   [0m
[37m   303 |   try {[0m
[33m>  304 |     const result = await apiClient.updateLibrary(libraryId, updates);[0m
[37m   305 |     [0m
[37m   306 |     return {[0m
[37m   307 |       content: [{ [0m

  [32mSuggested fixes:[0m
  1. Remove the variable if truly unused
  2. Prefix with underscore: [36m_result[0m
  3. Add a comment explaining why it's needed: [36m// eslint-disable-next-line @typescript-eslint/no-unused-vars[0m

[34m📄 src/tools/live-session-controls/index.ts[0m

  [33mLine 130:3[0m - 'apiClient' is defined but never used. Allowed unused args must match /^_/u.
[37m   127 |  */[0m
[37m   128 | async function handleStartTranscription([0m
[37m   129 |   params: { roomId: string },[0m
[33m>  130 |   apiClient: DigitalSambaApiClient[0m
[37m   131 | ): Promise<any> {[0m
[37m   132 |   const { roomId } = params;[0m
[37m   133 |   [0m

  [32mSuggested fixes:[0m
  1. Remove the variable if truly unused
  2. Prefix with underscore: [36m_apiClient[0m
  3. Add a comment explaining why it's needed: [36m// eslint-disable-next-line @typescript-eslint/no-unused-vars[0m

  [33mLine 192:3[0m - 'apiClient' is defined but never used. Allowed unused args must match /^_/u.
[37m   189 |  */[0m
[37m   190 | async function handleStopTranscription([0m
[37m   191 |   params: { roomId: string },[0m
[33m>  192 |   apiClient: DigitalSambaApiClient[0m
[37m   193 | ): Promise<any> {[0m
[37m   194 |   const { roomId } = params;[0m
[37m   195 |   [0m

  [32mSuggested fixes:[0m
  1. Remove the variable if truly unused
  2. Prefix with underscore: [36m_apiClient[0m
  3. Add a comment explaining why it's needed: [36m// eslint-disable-next-line @typescript-eslint/no-unused-vars[0m

[34m📄 src/tools/poll-management/index.ts[0m

  [33mLine 24:10[0m - 'McpServer' is defined but never used.
[37m    21 | import { z } from 'zod';[0m
[37m    22 | [0m
[37m    23 | // MCP SDK imports[0m
[33m>   24 | import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';[0m
[37m    25 | import { [0m
[37m    26 |   ErrorCode, [0m
[37m    27 |   McpError[0m

  [32mSuggested fixes:[0m
  1. Remove the variable if truly unused
  2. Prefix with underscore: [36m_McpServer[0m
  3. Add a comment explaining why it's needed: [36m// eslint-disable-next-line @typescript-eslint/no-unused-vars[0m

  [33mLine 31:10[0m - 'getApiKeyFromRequest' is defined but never used.
[37m    28 | } from '@modelcontextprotocol/sdk/types.js';[0m
[37m    29 | [0m
[37m    30 | // Local modules[0m
[33m>   31 | import { getApiKeyFromRequest } from '../../auth.js';[0m
[37m    32 | import { DigitalSambaApiClient } from '../../digital-samba-api.js';[0m
[37m    33 | import logger from '../../logger.js';[0m
[37m    34 | [0m

  [32mSuggested fixes:[0m
  1. Remove the variable if truly unused
  2. Prefix with underscore: [36m_getApiKeyFromRequest[0m
  3. Add a comment explaining why it's needed: [36m// eslint-disable-next-line @typescript-eslint/no-unused-vars[0m

[34m📄 src/tools/room-management/index.ts[0m

  [33mLine 11:10[0m - 'z' is defined but never used.
[37m     8 |  */[0m
[37m     9 | [0m
[37m    10 | import { Tool } from '@modelcontextprotocol/sdk/types.js';[0m
[33m>   11 | import { z } from 'zod';[0m
[37m    12 | import { DigitalSambaApiClient } from '../../digital-samba-api.js';[0m
[37m    13 | import { EnhancedDigitalSambaApiClient } from '../../digital-samba-api-enhanced.js';[0m
[37m    14 | import { getApiKeyFromRequest } from '../../auth.js';[0m

  [32mSuggested fixes:[0m
  1. Remove the variable if truly unused
  2. Prefix with underscore: [36m_z[0m
  3. Add a comment explaining why it's needed: [36m// eslint-disable-next-line @typescript-eslint/no-unused-vars[0m

[34m📄 src/tools/session-management/index.ts[0m

  [33mLine 12:10[0m - 'z' is defined but never used.
[37m     9 |  */[0m
[37m    10 | [0m
[37m    11 | import { Tool } from '@modelcontextprotocol/sdk/types.js';[0m
[33m>   12 | import { z } from 'zod';[0m
[37m    13 | import { DigitalSambaApiClient } from '../../digital-samba-api.js';[0m
[37m    14 | import { getApiKeyFromRequest } from '../../auth.js';[0m
[37m    15 | import logger from '../../logger.js';[0m

  [32mSuggested fixes:[0m
  1. Remove the variable if truly unused
  2. Prefix with underscore: [36m_z[0m
  3. Add a comment explaining why it's needed: [36m// eslint-disable-next-line @typescript-eslint/no-unused-vars[0m

[34m📄 src/tools/webhook-management/index.ts[0m

  [33mLine 19:3[0m - 'ApiRequestError' is defined but never used.
[37m    16 | import { getApiKeyFromRequest } from '../../auth.js';[0m
[37m    17 | import { DigitalSambaApiClient } from '../../digital-samba-api.js';[0m
[37m    18 | import {[0m
[33m>   19 |   ApiRequestError,[0m
[37m    20 |   ApiResponseError,[0m
[37m    21 |   AuthenticationError,[0m
[37m    22 |   ConfigurationError,[0m

  [32mSuggested fixes:[0m
  1. Remove the variable if truly unused
  2. Prefix with underscore: [36m_ApiRequestError[0m
  3. Add a comment explaining why it's needed: [36m// eslint-disable-next-line @typescript-eslint/no-unused-vars[0m

  [33mLine 22:3[0m - 'ConfigurationError' is defined but never used.
[37m    19 |   ApiRequestError,[0m
[37m    20 |   ApiResponseError,[0m
[37m    21 |   AuthenticationError,[0m
[33m>   22 |   ConfigurationError,[0m
[37m    23 |   ResourceNotFoundError,[0m
[37m    24 |   ValidationError[0m
[37m    25 | } from '../../errors.js';[0m

  [32mSuggested fixes:[0m
  1. Remove the variable if truly unused
  2. Prefix with underscore: [36m_ConfigurationError[0m
  3. Add a comment explaining why it's needed: [36m// eslint-disable-next-line @typescript-eslint/no-unused-vars[0m

[34m📄 src/transports/stdio-transport.ts[0m

  [33mLine 106:9[0m - 'originalConsole' is assigned a value but never used.
[37m   103 |  * console output must be redirected to stderr to avoid protocol conflicts.[0m
[37m   104 |  */[0m
[37m   105 | function setupConsoleRedirection(): void {[0m
[33m>  106 |   const originalConsole = {[0m
[37m   107 |     log: console.log,[0m
[37m   108 |     info: console.info,[0m
[37m   109 |     warn: console.warn,[0m

  [32mSuggested fixes:[0m
  1. Remove the variable if truly unused
  2. Prefix with underscore: [36m_originalConsole[0m
  3. Add a comment explaining why it's needed: [36m// eslint-disable-next-line @typescript-eslint/no-unused-vars[0m

[34m📄 src/webhooks.ts[0m

  [33mLine 23:3[0m - 'WebhookEventType' is defined but never used.
[37m    20 | [0m
[37m    21 | // Local modules - modular structure[0m
[37m    22 | import {[0m
[33m>   23 |   WebhookEventType,[0m
[37m    24 |   WebhookPayload,[0m
[37m    25 |   WebhookConfig,[0m
[37m    26 |   WebhookEventHandler[0m

  [32mSuggested fixes:[0m
  1. Remove the variable if truly unused
  2. Prefix with underscore: [36m_WebhookEventType[0m
  3. Add a comment explaining why it's needed: [36m// eslint-disable-next-line @typescript-eslint/no-unused-vars[0m

  [33mLine 24:3[0m - 'WebhookPayload' is defined but never used.
[37m    21 | // Local modules - modular structure[0m
[37m    22 | import {[0m
[37m    23 |   WebhookEventType,[0m
[33m>   24 |   WebhookPayload,[0m
[37m    25 |   WebhookConfig,[0m
[37m    26 |   WebhookEventHandler[0m
[37m    27 | } from './webhooks/webhook-types.js';[0m

  [32mSuggested fixes:[0m
  1. Remove the variable if truly unused
  2. Prefix with underscore: [36m_WebhookPayload[0m
  3. Add a comment explaining why it's needed: [36m// eslint-disable-next-line @typescript-eslint/no-unused-vars[0m

  [33mLine 25:3[0m - 'WebhookConfig' is defined but never used.
[37m    22 | import {[0m
[37m    23 |   WebhookEventType,[0m
[37m    24 |   WebhookPayload,[0m
[33m>   25 |   WebhookConfig,[0m
[37m    26 |   WebhookEventHandler[0m
[37m    27 | } from './webhooks/webhook-types.js';[0m
[37m    28 | [0m

  [32mSuggested fixes:[0m
  1. Remove the variable if truly unused
  2. Prefix with underscore: [36m_WebhookConfig[0m
  3. Add a comment explaining why it's needed: [36m// eslint-disable-next-line @typescript-eslint/no-unused-vars[0m

  [33mLine 26:3[0m - 'WebhookEventHandler' is defined but never used.
[37m    23 |   WebhookEventType,[0m
[37m    24 |   WebhookPayload,[0m
[37m    25 |   WebhookConfig,[0m
[33m>   26 |   WebhookEventHandler[0m
[37m    27 | } from './webhooks/webhook-types.js';[0m
[37m    28 | [0m
[37m    29 | import { WebhookService } from './webhooks/webhook-service.js';[0m

  [32mSuggested fixes:[0m
  1. Remove the variable if truly unused
  2. Prefix with underscore: [36m_WebhookEventHandler[0m
  3. Add a comment explaining why it's needed: [36m// eslint-disable-next-line @typescript-eslint/no-unused-vars[0m

[34m📄 src/webhooks/webhook-service.ts[0m

  [33mLine 23:10[0m - 'getApiKeyFromRequest' is defined but never used.
[37m    20 | import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';[0m
[37m    21 | [0m
[37m    22 | // Local modules[0m
[33m>   23 | import { getApiKeyFromRequest } from '../auth.js';[0m
[37m    24 | import { DigitalSambaApiClient } from '../digital-samba-api.js';[0m
[37m    25 | import {[0m
[37m    26 |   ApiRequestError,[0m

  [32mSuggested fixes:[0m
  1. Remove the variable if truly unused
  2. Prefix with underscore: [36m_getApiKeyFromRequest[0m
  3. Add a comment explaining why it's needed: [36m// eslint-disable-next-line @typescript-eslint/no-unused-vars[0m

[33m[1m⚠️  Explicit Any Types (123 issues)[0m

[34m📄 src/digital-samba-api-enhanced.ts[0m

  [33mLine 150:57[0m
[37m   147 |    * @param options Request options[0m
[37m   148 |    * @returns Promise resolving to the response data[0m
[37m   149 |    */[0m
[33m>  150 |   protected async request<T>(endpoint: string, options: any = {}): Promise<T> {[0m
[37m   151 |     // Use connection manager if enabled[0m
[37m   152 |     if (this.enabledFeatures.connectionManagement && this.connectionManager) {[0m
[37m   153 |       const url = endpoint.startsWith('http') ? endpoint : `${this.apiBaseUrl}${endpoint}`;[0m

[34m📄 src/digital-samba-api.ts[0m

  [33mLine 91:18[0m
[37m    88 |   is_breakout?: boolean;[0m
[37m    89 |   parent_id?: string;[0m
[37m    90 |   [0m
[33m>   91 |   [key: string]: any; // For additional properties[0m
[37m    92 | }[0m
[37m    93 | [0m
[37m    94 | export interface RoomCreateSettings {[0m

  [33mLine 126:18[0m
[37m   123 |   private_chat_enabled?: boolean;[0m
[37m   124 |   recordings_enabled?: boolean;[0m
[37m   125 |   [0m
[33m>  126 |   [key: string]: any; // For additional parameters[0m
[37m   127 | }[0m
[37m   128 | [0m
[37m   129 | // Participant related interfaces[0m

  [33mLine 235:18[0m
[37m   232 |   live_participants: number;[0m
[37m   233 |   active_participants: number;[0m
[37m   234 |   max_concurrent_participants?: number;[0m
[33m>  235 |   [key: string]: any; // For additional statistics[0m
[37m   236 | }[0m
[37m   237 | [0m
[37m   238 | // Webhook related interfaces[0m

  [36m... and 23 more in this file[0m

[34m📄 src/errors.ts[0m

  [33mLine 108:18[0m
[37m   105 | export class ApiResponseError extends DigitalSambaError {[0m
[37m   106 |   statusCode: number;[0m
[37m   107 |   apiErrorMessage: string;[0m
[33m>  108 |   apiErrorData?: any;[0m
[37m   109 |   [0m
[37m   110 |   /**[0m
[37m   111 |    * Create a new ApiResponseError[0m

  [33mLine 123:20[0m
[37m   120 |   constructor(message: string, options: { [0m
[37m   121 |     statusCode: number, [0m
[37m   122 |     apiErrorMessage: string, [0m
[33m>  123 |     apiErrorData?: any,[0m
[37m   124 |     cause?: Error[0m
[37m   125 |   }) {[0m
[37m   126 |     super(message);[0m

[34m📄 src/graceful-degradation.ts[0m

  [33mLine 207:49[0m
[37m   204 |   private componentFailureThreshold: number;[0m
[37m   205 |   private componentRecoveryThreshold: number;[0m
[37m   206 |   private healthCheckTimer?: NodeJS.Timeout;[0m
[33m>  207 |   private fallbacks: Map<string, FallbackConfig<any>> = new Map();[0m
[37m   208 |   private componentHealth: Map<string, ServiceComponentHealth> = new Map();[0m
[37m   209 |   private overallHealth: ServiceHealthStatus = ServiceHealthStatus.HEALTHY;[0m
[37m   210 |   [0m

  [33mLine 901:29[0m
[37m   898 |           'fallback_registered' | 'fallback_activated' | 'fallback_deactivated' | [0m
[37m   899 |           'fallback_success' | 'fallback_failure' | 'operation_duration' | [0m
[37m   900 |           'operation_failure' | 'cache_hit' | 'retry_attempt' | 'retry_success' | 'retry_failure',[0m
[33m>  901 |     labels?: Record<string, any>,[0m
[37m   902 |     value?: number[0m
[37m   903 |   ): Promise<void> {[0m
[37m   904 |     try {[0m

[34m📄 src/logger.ts[0m

  [33mLine 43:18[0m
[37m    40 |   statusCode?: number;[0m
[37m    41 |   [0m
[37m    42 |   // Custom metadata[0m
[33m>   43 |   [key: string]: any;[0m
[37m    44 | }[0m
[37m    45 | [0m
[37m    46 | // Generate an instance ID at startup for correlating logs from the same process[0m

  [33mLine 180:35[0m
[37m   177 |         ...(Object.getOwnPropertyNames(error)[0m
[37m   178 |           .filter(prop => !['message', 'stack', 'name'].includes(prop))[0m
[37m   179 |           .reduce((obj, prop) => {[0m
[33m>  180 |             obj[prop] = (error as any)[prop];[0m
[37m   181 |             return obj;[0m
[37m   182 |           }, {} as Record<string, any>))[0m
[37m   183 |       };[0m

  [33mLine 182:35[0m
[37m   179 |           .reduce((obj, prop) => {[0m
[37m   180 |             obj[prop] = (error as any)[prop];[0m
[37m   181 |             return obj;[0m
[33m>  182 |           }, {} as Record<string, any>))[0m
[37m   183 |       };[0m
[37m   184 |     }[0m
[37m   185 |   });[0m

[32mGeneral fix strategies for 'any' types:[0m
1. Replace with specific types based on usage
2. Use [36munknown[0m if the type is truly unknown
3. Create interfaces for object shapes
4. Use generic types for flexible but type-safe code
5. Use type guards for runtime type checking

[1m📊 Summary:[0m
[31mErrors to fix manually: 65[0m
[33mWarnings to address: 123[0m

[32m📝 Detailed fixes guide saved to: /config/Documents/DS/projects/digital-samba-mcp-server/eslint-manual-fixes-2025-06-01T19-53-33-277Z.md[0m


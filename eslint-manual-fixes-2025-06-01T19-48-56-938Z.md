# ESLint Manual Fixes Guide

Generated on: 2025-06-01T19:48:56.939Z

## Summary

- **Unused Variables**: 71 issues
- **Explicit Any**: 123 issues
- **Useless Escapes**: 2 issues
- **Constant Conditions**: 1 issues

## Detailed Issues

### Unused Variables

- **src/digital-samba-api.ts:691:17** - 'resourceType' is assigned a value but never used.
- **src/digital-samba-api.ts:692:17** - 'resourceId' is assigned a value but never used.
- **src/errors.ts:32:32** - 'options' is defined but never used. Allowed unused args must match /^_/u.
- **src/errors.ts:56:32** - 'options' is defined but never used. Allowed unused args must match /^_/u.
- **src/errors.ts:81:32** - 'options' is defined but never used. Allowed unused args must match /^_/u.
- **src/errors.ts:228:32** - 'options' is defined but never used. Allowed unused args must match /^_/u.
- **src/errors.ts:252:32** - 'options' is defined but never used. Allowed unused args must match /^_/u.
- **src/graceful-degradation.ts:27:10** - 'ApiRequestError' is defined but never used.
- **src/graceful-degradation.ts:795:25** - 'config' is defined but never used. Allowed unused args must match /^_/u.
- **src/index.ts:13:9** - 'originalConsole' is assigned a value but never used.
- **src/index.ts:39:10** - 'z' is defined but never used.
- **src/index.ts:47:10** - 'createConnectionManager' is defined but never used.
- **src/index.ts:48:10** - 'createTokenManager' is defined but never used.
- **src/index.ts:49:10** - 'createResourceOptimizer' is defined but never used.
- **src/index.ts:50:10** - 'createEnhancedApiClient' is defined but never used.
- **src/index.ts:51:10** - 'CircuitBreakerApiClient' is defined but never used.
- **src/index.ts:52:8** - 'ResilientApiClient' is defined but never used.
- **src/index.ts:61:8** - 'AnalyticsResource' is defined but never used.
- **src/index.ts:62:10** - 'setupSessionTools' is defined but never used.
- **src/index.ts:125:9** - 'ENABLE_RATE_LIMITING' is assigned a value but never used.
- **src/index.ts:126:9** - 'RATE_LIMIT_REQUESTS_PER_MINUTE' is assigned a value but never used.
- **src/index.ts:328:19** - 'params' is defined but never used. Allowed unused args must match /^_/u.
- **src/index.ts:328:27** - 'request' is defined but never used. Allowed unused args must match /^_/u.
- **src/index.ts:388:11** - 'apiClient' is assigned a value but never used.
- **src/index.ts:1157:11** - 'server' is assigned a value but never used.
- **src/metrics.ts:24:60** - 'register' is defined but never used.
- **src/rate-limiter.ts:22:10** - 'IncomingMessage' is defined but never used.
- **src/rate-limiter.ts:29:10** - 'ApiRequestError' is defined but never used.
- **src/rate-limiter.ts:202:9** - 'clientIp' is assigned a value but never used.
- **src/rate-limiter.ts:271:15** - 'options' is assigned a value but never used.
- **src/resources/analytics/index.ts:23:9** - 'analytics' is assigned a value but never used.
- **src/resources/content/index.ts:22:10** - 'z' is defined but never used.
- **src/resources/content/index.ts:25:10** - 'McpServer' is defined but never used.
- **src/resources/content/index.ts:35:3** - 'Library' is defined but never used.
- **src/resources/content/index.ts:36:3** - 'LibraryFolder' is defined but never used.
- **src/resources/content/index.ts:37:3** - 'LibraryFile' is defined but never used.
- **src/resources/content/index.ts:38:3** - 'ApiResponse' is defined but never used.
- **src/resources/exports/index.ts:151:5** - 'searchParams' is defined but never used. Allowed unused args must match /^_/u.
- **src/resources/exports/index.ts:179:5** - 'searchParams' is defined but never used. Allowed unused args must match /^_/u.
- **src/resources/recordings/index.ts:25:3** - 'ApiResponseError' is defined but never used.
- **src/resources/recordings/index.ts:27:3** - 'ResourceNotFoundError' is defined but never used.
- **src/server-core.ts:61:5** - 'serverOptions' is assigned a value but never used.
- **src/server-core.ts:102:3** - 'server' is defined but never used. Allowed unused args must match /^_/u.
- **src/server-core.ts:103:3** - 'apiKey' is defined but never used. Allowed unused args must match /^_/u.
- **src/server-core.ts:104:3** - 'apiUrl' is defined but never used. Allowed unused args must match /^_/u.
- **src/server-core.ts:105:3** - 'cache' is defined but never used. Allowed unused args must match /^_/u.
- **src/server-core.ts:123:3** - 'server' is defined but never used. Allowed unused args must match /^_/u.
- **src/server-core.ts:124:3** - 'apiKey' is defined but never used. Allowed unused args must match /^_/u.
- **src/server-core.ts:125:3** - 'apiUrl' is defined but never used. Allowed unused args must match /^_/u.
- **src/server-core.ts:126:3** - 'cache' is defined but never used. Allowed unused args must match /^_/u.
- **src/token-manager.ts:26:47** - 'TokenResponse' is defined but never used.
- **src/token-manager.ts:80:11** - 'TokenRefreshResult' is defined but never used.
- **src/tools/communication-management/index.ts:26:10** - 'McpServer' is defined but never used.
- **src/tools/communication-management/index.ts:33:10** - 'getApiKeyFromRequest' is defined but never used.
- **src/tools/library-management/index.ts:28:10** - 'McpServer' is defined but never used.
- **src/tools/library-management/index.ts:35:10** - 'getApiKeyFromRequest' is defined but never used.
- **src/tools/library-management/index.ts:304:11** - 'result' is assigned a value but never used.
- **src/tools/live-session-controls/index.ts:130:3** - 'apiClient' is defined but never used. Allowed unused args must match /^_/u.
- **src/tools/live-session-controls/index.ts:192:3** - 'apiClient' is defined but never used. Allowed unused args must match /^_/u.
- **src/tools/poll-management/index.ts:24:10** - 'McpServer' is defined but never used.
- **src/tools/poll-management/index.ts:31:10** - 'getApiKeyFromRequest' is defined but never used.
- **src/tools/room-management/index.ts:11:10** - 'z' is defined but never used.
- **src/tools/session-management/index.ts:12:10** - 'z' is defined but never used.
- **src/tools/webhook-management/index.ts:19:3** - 'ApiRequestError' is defined but never used.
- **src/tools/webhook-management/index.ts:22:3** - 'ConfigurationError' is defined but never used.
- **src/transports/stdio-transport.ts:106:9** - 'originalConsole' is assigned a value but never used.
- **src/webhooks.ts:23:3** - 'WebhookEventType' is defined but never used.
- **src/webhooks.ts:24:3** - 'WebhookPayload' is defined but never used.
- **src/webhooks.ts:25:3** - 'WebhookConfig' is defined but never used.
- **src/webhooks.ts:26:3** - 'WebhookEventHandler' is defined but never used.
- **src/webhooks/webhook-service.ts:23:10** - 'getApiKeyFromRequest' is defined but never used.

### Useless Escapes

- **src/digital-samba-api.ts:690:48** - Unnecessary escape character: \/.
- **src/digital-samba-api.ts:690:58** - Unnecessary escape character: \/.

### Constant Conditions

- **src/resource-optimizer.ts:500:14** - Unexpected constant condition.


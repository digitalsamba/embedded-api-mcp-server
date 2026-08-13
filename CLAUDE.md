# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with this repository.

## Project Overview

Digital Samba Embedded API MCP Server - a Model Context Protocol server for Digital Samba's Embedded API, providing 144 tools and 37 resources for complete control over video conferencing features.

**This is primarily a hosted remote MCP server** (production: https://mcp.digitalsamba.com, dev: https://mcp-dev.digitalsamba.com) that Digital Samba customers connect to from Claude Desktop or other MCP clients via OAuth. The npm package (`@digitalsamba/embedded-api-mcp-server`) is the legacy stdio distribution and is slated for deprecation.

## API Reference

- Official OpenAPI Specification: https://developer.digitalsamba.com/rest-api/openapi.yaml
- `openapi-stored.yaml` (repo root) is the committed snapshot; the `check-api-updates.yml` workflow diffs it weekly against the live spec and opens an issue on drift

## Development Commands

### Build & Development
- `npm run build` - Build TypeScript to dist/ (also injects version and copies bin/assets)
- `npm run build:clean` - Clean build (removes dist/)
- `npm start` - Run the built server
- `npm run dev` - Development mode using tsx
- `npm run dev -- --developer-key YOUR_KEY` - Development mode with key (stdio)

### Testing
- `npm test` - Run all tests with Jest
- `npm run test:coverage` - Tests with coverage report
- `npm run test:unit` - Run only unit tests
- `npm run test:integration` - Run integration tests
- `npm run test:ci` - CI-specific test configuration (unit tests only with coverage)
- Single test file: `npm test -- path/to/test.test.ts`
- Pattern: `npm test -- --testNamePattern="should create room"`

### Code Quality
- `npm run lint` - ESLint (CI-enforced; errors fail the build)
- `npm run format` - Prettier write
- `npm run format:check` - Prettier check (CI-enforced)
- `npm run size-check` - Check build size
- `npm run release:check` - Pre-release checklist

## Transports

`src/index.ts` selects the transport from `TRANSPORT` env var or `--transport` flag (default: stdio).

- **stdio** (`src/transports/stdio.ts`) - local/legacy mode; reads `DIGITAL_SAMBA_DEVELOPER_KEY`
- **HTTP** (`src/transports/http.ts`) - Express 5 app using `StreamableHTTPServerTransport`; per-session Server instances keyed by `mcp-session-id`; Bearer auth supporting both direct developer keys and OAuth session tokens

### OAuth (HTTP mode)
`src/oauth.ts` implements authorization-code + PKCE with Dynamic Client Registration, using Digital Samba (DS Passport) as the identity provider. OAuth sessions call the API via `/oauth-api/v1/*`; direct developer keys use `/api/v1/*`. Sessions/clients/codes persist in Redis (`src/session-store.ts`, `REDIS_URL`) with an in-memory fallback.

### Key environment variables
- `TRANSPORT` (stdio | http), `PORT`, `HOST`
- `DIGITAL_SAMBA_DEVELOPER_KEY`, `DIGITAL_SAMBA_API_URL`, `OAUTH_API_URL`
- `OAUTH_CLIENT_ID`, `OAUTH_CLIENT_SECRET`, `OAUTH_AUTHORIZE_URL`, `OAUTH_TOKEN_URL`, `OAUTH_REDIRECT_URI`, `OAUTH_ISSUER`
- `REDIS_URL`
- `SESSION_IDLE_TIMEOUT_MS` (default 30min; 0 disables), `SESSION_SWEEP_INTERVAL_MS` (default 5min) — idle HTTP session eviction

## Architecture

```
src/
├── index.ts              # Entry point; transport selection
├── server.ts             # Transport-agnostic MCP server factory (createServer)
├── digital-samba-api.ts  # API client wrapper
├── oauth.ts              # OAuth 2.0 / PKCE / DCR implementation
├── session-store.ts      # Redis-backed session store (memory fallback)
├── auth.ts               # AsyncLocalStorage API-key context
├── session-registry.ts   # HTTP session tracking + idle sweep (clients rarely send DELETE)
├── cache.ts              # Simple memory cache
├── logger.ts             # Console logger (writes to stderr in stdio mode)
├── errors.ts             # Error type definitions
├── tool-annotations.ts   # readOnlyHint/destructiveHint annotations for all tools
├── transports/
│   ├── stdio.ts          # stdio transport
│   └── http.ts           # Streamable HTTP transport + OAuth endpoints
├── types/                # TypeScript type definitions
├── resources/            # Read-only MCP resources (37)
└── tools/                # MCP tools (144)
    ├── room-management/       # 11 tools
    ├── session-management/    # 11 tools
    ├── recording-tools-adapter.ts  # 10 tools (the live implementation)
    ├── analytics-tools/       # 8 tools
    ├── live-session-controls/ # 14 tools (transcription, phone, restreamer)
    ├── communication-management/ # 27 tools (chat/Q&A/transcripts/summaries)
    ├── poll-management/       # 8 tools
    ├── quiz-management/       # 10 tools
    ├── library-management/    # 26 tools
    ├── role-management/       # 6 tools
    ├── webhook-management/    # 6 tools
    └── export-tools/          # 7 tools
```

Implementation notes:
- `src/server.ts` uses the low-level SDK `Server` API with `setRequestHandler`; tools are plain JSON Schema definitions (no zod in tool schemas). Tool dispatch in the CallTool handler matches on tool-name substrings — ordering matters (see the export-tools check placed before recording checks).
- Recordings use `src/tools/recording-tools-adapter.ts` and `src/resources/recordings-adapter.ts` — these adapters ARE the live implementation.
- Each HTTP session gets its own `Server` instance via `createServer()`; the per-key API client cache lives at module level in `server.ts`.

## MCP Implementation

- 144 tools (actions) and 37 resources (read-only, `digitalsamba://` URIs)
- Because many MCP clients don't expose resources, most resources have "reader tool" equivalents (`list-rooms`, `get-recordings`, etc.) — keep both in sync when adding functionality
- All tools carry annotations (`readOnlyHint`, `destructiveHint`) via `src/tool-annotations.ts`

## Technical Stack

- Dependencies: `@modelcontextprotocol/sdk`, `express` (HTTP transport), `ioredis` (session store), `dotenv`, `zod`
- TypeScript, ES Modules, target ES2020 / NodeNext resolution
- Jest 30 + ts-jest (ESM preset); ESLint 10 flat config; Prettier
- Node.js >= 18 (deployment images use Node 20)

## CI/CD & Deployment

Deployment is **pull-based** (since 2026-07): CI builds and pushes images to the
private Monza registry but never touches the hosts. Each host pulls its tag on a
short timer (dev: `:latest`, ~2 min; prod: `:production`, ~5 min) and restarts
itself when the digest changes. The final workflow step waits for the host's
`/health` to report the expected git commit.

- `ci.yml` - build + tests (Node 18/20 matrix), lint + format check (all enforced)
- `deploy-dev.yml` - push to `develop` → image pushed → dev host self-deploys (mcp-dev.digitalsamba.com)
- `deploy-prod.yml` - tag `v*` → image pushed → prod host self-deploys (mcp.digitalsamba.com), then syncs develop/main
- `check-api-updates.yml` - weekly OpenAPI drift check (Mondays), opens issues labeled `api-update`
- `deployment/docker-compose.yml` is a **reference copy only** - the live compose
  and .env files are host-managed by ops; compose/env changes are an ops request,
  not a commit
- `:latest` is dev's tag exclusively; prod publishes `:production`, version, and sha tags

## Critical Constraints

- Maintain backward compatibility; no breaking changes to existing tool names/schemas
- Simple, maintainable code over complex patterns
- Keep npm package size reasonable (size-check script)

## AI Collaboration Guidelines
- No claude as co-author

## Important Account Settings

### Single Session per External ID
Digital Samba accounts can have "single session per external ID" enabled in the dashboard. When active, each `externalId` can only have one active session; joining with an in-use `externalId` disconnects the previous session. It can only be *changed* in the dashboard, but it **is** readable via the API — `get-default-room-settings` returns it as `single_session_by_external_id_enabled` (verified on dev 2026-08-13). Use unique `externalId` values when generating tokens, especially for moderators.

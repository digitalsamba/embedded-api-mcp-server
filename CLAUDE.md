# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with this repository.

## Project Overview

Digital Samba Embedded API MCP Server - A lightweight Model Context Protocol server for Digital Samba's Embedded API. Provides 102 tools and 38 resources covering 100+ API endpoints for complete control over video conferencing features.

## API Reference

- Official OpenAPI Specification: https://developer.digitalsamba.com/rest-api/openapi.yaml
- Note: Some endpoints documented locally may not exist in the official API

## Development Commands

### Build & Development
- `npm run build` - Build TypeScript to dist/
- `npm run build:clean` - Clean build (removes dist/)
- `npm start` - Run the built server
- `npm run dev` - Development mode using tsx
- `npm run dev -- --developer-key YOUR_KEY` - Run in development mode with key

### Testing  
- `npm test` - Run all tests with Jest
- `npm run test:coverage` - Tests with coverage report
- `npm run test:unit` - Run only unit tests
- `npm run test:integration` - Run integration tests
- `npm run test:ci` - CI-specific test configuration (unit tests only with coverage)

### Code Quality
- `npm run lint` - ESLint code linting
- `npm run format` - Prettier code formatting
- `npm run size-check` - Check build size (must be under 250KB)
- `npm run coverage:analyze` - Analyze test coverage
- `npm run release:check` - Pre-release checklist

### Running the Server
- `npx @digitalsamba/embedded-api-mcp-server --developer-key YOUR_KEY` - Run MCP server (stdio mode only)
- `npm run dev -- --developer-key YOUR_KEY` - Run in development mode
- Note: Server only supports stdio mode for MCP protocol communication

## Architecture

### Simplified Structure (Post-Refactor)
```
src/
├── index.ts              # Main MCP server entry point
├── digital-samba-api.ts  # Simple API client wrapper
├── logger.ts            # Console logger (46 lines)
├── auth.ts              # Environment-based auth
├── cache.ts             # Simple memory cache
├── errors.ts            # Error type definitions
├── types/               # TypeScript type definitions
├── resources/           # Read-only MCP resources
│   ├── rooms/          # Room listings
│   ├── sessions/       # Session data
│   ├── analytics/      # Analytics data
│   ├── recordings/     # Recording listings
│   ├── content/        # Content resources
│   └── exports/        # Export functionality
└── tools/              # MCP tools (actions)
    ├── room-management/      # Room CRUD operations
    ├── session-management/   # Session control
    ├── analytics-tools/      # Analytics queries
    ├── recording-management/ # Recording tools
    ├── live-session-controls/# Live session controls
    ├── communication-management/# Chat/Q&A/Transcripts
    ├── poll-management/      # Poll tools
    ├── library-management/   # Content library
    ├── webhook-management/   # Webhook tools
    ├── role-management/      # Role and permission management
    └── export-tools/        # Data export tools
```

### Key Design Principles
1. **Lightweight** - No unnecessary dependencies or complexity
2. **MCP-focused** - Built specifically for stdio-based MCP protocol
3. **Simple auth** - Uses environment variables for developer keys
4. **Direct API calls** - No complex abstractions over the API
5. **Modular structure** - Clear separation of resources and tools

### What Was Removed
- All enterprise patterns (circuit breakers, rate limiting, metrics)
- Complex API client layers (enhanced, resilient versions)
- HTTP transport (MCP uses stdio only)
- Winston logging (replaced with simple console logger)
- Connection management and pooling
- Token management complexity
- Resource optimization
- Graceful degradation patterns

## MCP Implementation

### Resources (Read-Only)
- `digitalsamba://rooms` - List all rooms
- `digitalsamba://rooms/{id}` - Room details
- `digitalsamba://sessions` - List sessions
- `digitalsamba://recordings` - List recordings
- `digitalsamba://analytics/team` - Team analytics
- `digitalsamba://analytics/rooms` - Room analytics
- `digitalsamba://analytics/sessions` - Session analytics
- `digitalsamba://content` - Content library
- `digitalsamba://exports/*` - Various exports

### Tools (Actions)
- Room management (create, update, delete, generate tokens)
- Session control (end session, get summary)
- Recording management (delete recordings)
- Live session controls (participants, chat, polls, transcripts)
- Analytics queries (team, room, session analytics)
- Content library management

## Technical Stack

### Core Dependencies (Only 3!)
- `@modelcontextprotocol/sdk` (^1.12.1) - MCP protocol implementation
- `dotenv` (^16.5.0) - Environment variable management  
- `zod` (^3.22.4) - Runtime type validation

### Development Stack
- **TypeScript** (^5.8.3) - Type safety and modern JavaScript
- **Jest** (^30.0.0) with ts-jest - Testing framework
- **ESLint** (^9.28.0) - Code linting
- **Prettier** (^3.2.5) - Code formatting
- **tsx** (^4.7.0) - TypeScript execution for development

### Requirements
- Node.js >=18.0.0
- ES Modules (`"type": "module"` in package.json)
- TypeScript target: ES2020 with NodeNext module resolution

## Import Guidelines
1. Node.js built-ins first
2. External dependencies second  
3. MCP SDK imports third
4. Local modules last
5. Use .js extensions for local imports

## Testing Strategy
- Unit tests for core functionality
- Integration tests for API interactions
- E2E tests for MCP protocol compliance
- Mock API responses for testing

### Running Specific Tests
- Run a single test file: `npm test -- path/to/test.test.ts`
- Run tests matching a pattern: `npm test -- --testNamePattern="should create room"`
- Run tests in watch mode: `npm test -- --watch`
- Debug tests: `node --inspect-brk node_modules/.bin/jest --runInBand`

## Deployment
- Beta versions deployed automatically from `develop` branch
- Stable versions deployed from `main` branch
- Package name: `@digitalsamba/embedded-api-mcp-server`

## Critical Constraints
- Keep package size minimal (under 250KB packed)
- Maintain backward compatibility
- No breaking changes to existing functionality
- Simple, maintainable code over complex patterns

## Known Issues & Design Considerations

### MCP Resources vs Tools in AI Assistants
**Issue**: AI assistants (like Claude) can only access MCP tools, not resources, even though the MCP protocol supports both.

**Context**: This MCP server correctly implements:
- 32 Resources (read-only operations like listing rooms, viewing analytics)
- 70+ Tools (actions that modify data like creating rooms, starting recordings)

**The Problem**: 
- The MCP protocol correctly separates read operations (resources) from write operations (tools)
- Our server implementation follows this pattern correctly
- However, AI assistants integrated with MCP (like Claude Desktop) only expose tools, not resources
- This means half of the server's functionality (all read-only resources) is inaccessible to AI assistants

**Current Workarounds**:
1. Use tools that provide similar functionality (e.g., `get-recordings` tool instead of `digitalsamba://recordings` resource)
2. Consider adding "reader tools" for commonly needed resources (though this creates redundancy)
3. Wait for AI assistant MCP integrations to support resource reading

**Ideal Solution**: The fix should be in AI assistant MCP client implementations (e.g., Claude Desktop) to expose a way to read resources, perhaps through a special tool or direct resource access.

**Note**: This is not a bug in our MCP server - it's a limitation in how current AI assistants consume MCP servers.

### Hybrid Approach Implementation

To work around this limitation, we're implementing a **hybrid approach**:

1. **Keep all existing resources** - For future compatibility when Claude Desktop adds resource selection
2. **Create tool equivalents for all resources** - For immediate functionality in AI assistants
3. **Clear naming convention** - Tools use verbs like `list-rooms`, `get-room-details` to distinguish from resources

This ensures the MCP server works with current AI assistants while remaining compatible with future MCP client improvements.

See `.ai_dev/mcp-resources-vs-tools-issue.md` for detailed analysis and `.ai_dev/resources-to-tools-conversion-plan.md` for implementation progress.

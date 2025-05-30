# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Build & Development
- `npm run build` - TypeScript build to dist/
- `npm run build:clean` - Clean build (removes dist/)
- `npm run dev` - Development mode with tsx
- `npm run dev:clean` - Restart development environment
- `npm run dev:watch` - Development with file watching

### Testing
- `npm test` - Run all Jest tests
- `npm run test:coverage` - Tests with coverage report
- `npm run test:server` - Test MCP server functionality
- `npm run test:claude-desktop-*` - Claude Desktop integration tests

### Running the Server
- `npx digital-samba-mcp-server --api-key YOUR_KEY` - Run as CLI server
- `scripts/debug-server.bat` - Debug server with detailed logging
- `scripts/test-resilient-api.bat` - Test resilient API features

### Script Organization
All build, debug, test, and utility scripts have been moved to the `scripts/` directory for better organization.

## Architecture Overview

### Core Structure
The project implements a Model Context Protocol (MCP) server for Digital Samba's video conferencing API with resilience patterns:

- **Main Entry**: `src/index.ts` - MCP server implementation using `@modelcontextprotocol/sdk`
- **API Clients**: Multiple layers of API clients with increasing resilience:
  - `digital-samba-api.ts` - Base API client
  - `digital-samba-api-circuit-breaker.ts` - Circuit breaker pattern
  - `digital-samba-api-resilient.ts` - Full resilience features
  - `digital-samba-api-enhanced.ts` - Enhanced with rate limiting/caching

### Key Patterns
- **Circuit Breaker**: Prevents cascading failures (CLOSED/OPEN/HALF-OPEN states)
- **Connection Pooling**: HTTP agent pooling in `connection-manager.ts`
- **Token Management**: Auto-refresh in `token-manager.ts`
- **Graceful Degradation**: Fallback strategies in `graceful-degradation.ts`
- **Rate Limiting**: Token bucket algorithm in `rate-limiter.ts`
- **Caching**: Memory cache with ETags in `cache.ts`

### Feature Modules
- `meetings.ts` - Meeting scheduling and management
- `recordings.ts` - Recording functionality
- `webhooks.ts` - Webhook service with Express/SSE
- `moderation.ts` - Participant moderation tools
- `breakout-rooms.ts` - Breakout room management
- `metrics.ts` - Prometheus metrics collection

## MCP Implementation

### Resources
- `digitalsamba://rooms` - Room listings
- `digitalsamba://rooms/{id}/participants` - Participants
- `digitalsamba://recordings` - Recording access
- `digitalsamba://meetings` - Scheduled meetings

### Tools
- Room CRUD operations
- Token generation
- Webhook management
- Recording control
- Moderation features
- Meeting scheduling

## Import Guidelines
When adding imports to TypeScript files:
1. Node.js built-ins first
2. External dependencies second
3. MCP SDK imports third
4. Local modules last
5. Alphabetize within sections

## Testing Strategy
- Unit tests in `tests/unit/`
- Integration tests in `tests/integration/`
- E2E tests in `tests/e2e/`
- Mock API server in `tests/mocks/mock-api-server.ts`

## Error Handling
Custom error types in `errors.ts`:
- `DigitalSambaError` - Base error class
- `AuthenticationError` - Auth failures
- `ResourceNotFoundError` - 404 errors
- Comprehensive logging with Winston

## Project Management

### Project Tracking
- Project management and stats located at: `/config/Documents/Obsidian Vault/01-Projects/Work/DigitalSamba/MCP-Server-Development/`
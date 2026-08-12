# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.1.0] - 2026-08-12

First production release since the July 2026 revival. Production had been
serving a January build; this brings it to the current tree.

Tool count: **144** (was 123). No tool names, schemas or resource URIs changed.

### Added

- **Q&A management (13 tools)**: `create-question`, `update-question`,
  `delete-question`, `answer-question`, `update-question-answer`,
  `delete-question-answer`, `upvote-question`, `remove-question-vote`,
  `dismiss-question`, `reopen-question`, `start-question-live-answer`,
  `stop-question-live-answer`, `cancel-question-live-answer`
- **Poll and quiz bulk import (4 tools)**: `get-poll-import-template`,
  `import-polls`, `get-quiz-import-template`, `import-quizzes`
- **Phone participant audio (2 tools)**: `mute-phone-participant`,
  `unmute-phone-participant`
- **Chat (1 tool)**: `send-chat-message`
- **Room management (1 tool)**: `delete-rooms-by-tag`
- `/health` reports `streamingSessions` and cumulative `sweptSessions`
- `SESSION_IDLE_TIMEOUT_MS` (default 30min, `0` disables) and
  `SESSION_SWEEP_INTERVAL_MS` (default 5min)
- `LOG_LEVEL` accepted alongside `DS_LOG_LEVEL`

### Fixed
- **HTTP session leak**: transport sessions were only removed on an explicit
  `DELETE /mcp` or `transport.close()`. Most MCP clients send neither, so every
  abandoned session stayed in memory along with its `Server` instance
  (449 leaked on dev, none ever released). Added `SessionRegistry` with
  last-seen tracking and a periodic idle sweep. Sessions holding an open SSE
  stream are never swept, and entries are removed before `close()` so a
  throwing close cannot re-leak them.
- **Unknown session IDs now return 404, not 400**: the MCP Streamable HTTP spec
  uses 404 as the client's cue to re-initialize. Returning 400 left clients
  wedged after any server restart, unable to recover on their own.
- **Expired OAuth sessions now return 401 instead of silently degrading**:
  `authMiddleware` used to fall through to the legacy developer-key branch and
  pass the dead session ID to the API as if it were a key, so the client saw
  the API's `Unauthenticated` rather than a 401. It never learned to
  re-authorise, and reconnecting did not help - the connector had to be removed
  and re-added. Now returns 401 with `WWW-Authenticate`. Legacy developer keys
  (UUIDs) are distinguished from session IDs (64 hex chars) and are unaffected.
- **Session expiry no longer forces daily re-authentication**: sessions expired
  after 24h even though the Digital Samba access token behind them is valid for
  365 days, so our own TTL was what logged users out. `TTL.SESSION` is now
  30 days and slides forward on each authenticated request, making it an
  inactivity window rather than a hard cap.

### Changed
- `@modelcontextprotocol/sdk` upgraded from ^1.25.1 to ^1.30.0
- All runtime dependency advisories resolved; `npm audit --omit=dev` reports
  no vulnerabilities
- Test suite grown from 431 to 556 tests; lint and format checks enforced in CI
- Deploys are pull-based via the internal registry; `/health` exposes the git
  commit so a deploy can be verified by exact commit

## [0.1.0] - 2025-06-13

### Added
- GitHub Actions CI/CD pipeline with automated testing and production release workflow
- Coverage badge integration with multiple options (static, Codecov, dynamic)
- CHANGELOG.md for version tracking
- Hybrid approach implementation: Added 32+ reader tools that mirror resources for AI assistant compatibility
  - Room reader tools: list-rooms, get-room-details, list-live-rooms, list-live-participants
  - Session reader tools: list-sessions, get-session-details, list-session-participants, list-room-sessions
  - Analytics reader tools: get-usage-analytics, get-live-analytics, get-live-room-analytics, get-session-analytics, get-participant-analytics
  - Content library reader tools: list-libraries, search-libraries, verify-library-id, get-library-details, get-library-hierarchy, list-library-folders, get-library-folder-details, list-library-files, get-library-file-details
  - Export reader tools: export-chat-messages, export-qa-data, export-session-transcripts, export-poll-results, export-recording-metadata, export-session-summary, export-session-metadata
- Unit tests for library management and export tools
- Documentation explaining the resources vs tools limitation in AI assistants
- Enhanced library search capabilities with dedicated search-libraries and verify-library-id tools

### Changed
- **BREAKING**: Environment variable renamed from DIGITAL_SAMBA_API_KEY to DIGITAL_SAMBA_DEVELOPER_KEY
- Updated Jest configuration to include json-summary coverage reporter
- Improved documentation structure - moved internal docs to .ai_dev directory
- Updated tool count to 102 tools and 38 resources (from 70 tools and 28 resources)
- Added note about hybrid approach for AI assistant compatibility
- Default log level changed from 'info' to 'warn' for cleaner operation
- Reorganized TypeScript types into domain-specific files for better maintainability
- Reduced package size through dependency cleanup and dead code removal

### Fixed
- Privacy field now correctly defaults to 'public' when creating rooms
- Default room settings tools (get-default-room-settings, update-default-room-settings) now work correctly
- Room name and topic parameters fixed - 'name' is now correctly used throughout
- Get all room sessions tool now properly filters by room ID
- Generate token tool uses correct roomId parameter
- Export tool routing conflicts resolved for export-qa-data and export-session-transcripts
- Critical bug fixed where recording tools were not passing API key to client
- Fixed camelCase to snake_case parameter conversion for API compatibility
- Session-specific chat and Q&A deletion endpoints now use correct API routes
- CI workflow now uses correct test:ci script and environment variable

### Removed
- Non-existent API features (meeting scheduling) that were documented but not in official API
- Unused dependencies: @types/express, express, esbuild
- Dead code: RedisCache, createCacheMiddleware, unused npm scripts
- Co-author attribution from future commits

## [0.1.0-beta.1] - 2025-06-01

### Added
- Complete MCP server implementation for Digital Samba Embedded API
- Support for 28 read-only resources via digitalsamba:// URIs
- Implementation of 70 tools covering all API functionality
- Comprehensive test suite with unit, integration, and E2E tests
- Simple memory-based caching system
- Environment-based authentication
- Lightweight architecture optimized for MCP protocol

### Features
- **Room Management**: Create, update, delete rooms and generate access tokens
- **Session Management**: Control active sessions, view summaries and statistics
- **Recording Management**: List, delete, archive recordings and get download links
- **Analytics**: Team, room, session, and participant analytics
- **Live Session Controls**: Transcription, phone participants, chat, Q&A
- **Content Library**: File and folder management with bulk operations
- **Poll Management**: Create and manage polls during sessions
- **Role & Permission System**: Custom roles with granular permissions
- **Webhook Management**: Event subscriptions and endpoint configuration

### Technical Details
- Built specifically for stdio-based MCP protocol
- No HTTP transport (MCP uses stdio only)
- Minimal dependencies for lightweight deployment
- TypeScript with full type definitions
- Modular architecture with clear separation of resources and tools

## [0.0.1-alpha] - 2025-05-25

### Added
- Initial project structure
- Basic API client implementation
- Core MCP server setup

---

[Unreleased]: https://github.com/digitalsamba/embedded-api-mcp-server/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/digitalsamba/embedded-api-mcp-server/compare/v0.1.0-beta.1...v0.1.0
[0.1.0-beta.1]: https://github.com/digitalsamba/embedded-api-mcp-server/compare/v0.0.1-alpha...v0.1.0-beta.1
[0.0.1-alpha]: https://github.com/digitalsamba/embedded-api-mcp-server/releases/tag/v0.0.1-alpha
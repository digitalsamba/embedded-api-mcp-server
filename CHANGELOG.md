# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0] - 2025-01-07

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

## [0.1.0-beta.1] - 2025-01-06

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

## [0.0.1-alpha] - 2024-12-01

### Added
- Initial project structure
- Basic API client implementation
- Core MCP server setup

---

[Unreleased]: https://github.com/digitalsamba/embedded-api-mcp-server/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/digitalsamba/embedded-api-mcp-server/compare/v0.1.0-beta.1...v0.1.0
[0.1.0-beta.1]: https://github.com/digitalsamba/embedded-api-mcp-server/compare/v0.0.1-alpha...v0.1.0-beta.1
[0.0.1-alpha]: https://github.com/digitalsamba/embedded-api-mcp-server/releases/tag/v0.0.1-alpha
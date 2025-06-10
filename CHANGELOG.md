# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- GitHub Actions CI/CD pipeline with automated testing
- Coverage badge integration with multiple options (static, Codecov, dynamic)
- CHANGELOG.md for version tracking

### Changed
- Updated Jest configuration to include json-summary coverage reporter
- Improved documentation structure - moved internal docs to .ai_dev directory

### Fixed
- Privacy field now correctly defaults to 'public' when creating rooms
- Default room settings tools (get-default-room-settings, update-default-room-settings) now work correctly
- Room name and topic parameters fixed - 'name' is now correctly used throughout
- Get all room sessions tool now properly filters by room ID
- Generate token tool uses correct roomId parameter

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

[Unreleased]: https://github.com/digitalsamba/embedded-api-mcp-server/compare/v0.1.0-beta.1...HEAD
[0.1.0-beta.1]: https://github.com/digitalsamba/embedded-api-mcp-server/compare/v0.0.1-alpha...v0.1.0-beta.1
[0.0.1-alpha]: https://github.com/digitalsamba/embedded-api-mcp-server/releases/tag/v0.0.1-alpha
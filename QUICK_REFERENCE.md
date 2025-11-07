# MCP Improvement Quick Reference

**Main Roadmap**: See [MCP_IMPROVEMENT_ROADMAP.md](./MCP_IMPROVEMENT_ROADMAP.md) for full details

## Quick Stats

**Current State**:
- 101 tools (too many)
- 38 resources (duplicating tools)
- ~25KB context usage
- Pattern-based routing (fragile)

**Target State**:
- 25 tools (75% reduction)
- 0-25 resources (decision pending)
- ~6KB context usage (75% reduction)
- Explicit routing (reliable)

## Tool Consolidation at a Glance

| Category | Current | Target | Savings |
|----------|---------|--------|---------|
| Library Management | 26 | 5 | 21 tools |
| Room Management | 10 | 3 | 7 tools |
| Session Management | 10 | 3 | 7 tools |
| Recording Management | 9 | 2 | 7 tools |
| Analytics | 8 | 2 | 6 tools |
| Communication | 8 | 2 | 6 tools |
| Poll Management | 6 | 2 | 4 tools |
| Role Management | 6 | 2 | 4 tools |
| Webhook Management | 6 | 2 | 4 tools |
| Export Tools | 7 | 1 | 6 tools |
| Live Session Controls | 4 | 2 | 2 tools |
| Server Info | 1 | 1 | 0 tools |
| **TOTAL** | **101** | **25** | **76 tools** |

## Phase Overview

### Phase 1: Foundation (1-2 days)
- ✅ Delete dead code
- ✅ Fix pattern-based routing
- ✅ Resolve TODOs
- ✅ Document API client behavior

### Phase 2: Consolidation (3-5 days)
Consolidate all tool categories using `manage-{domain}` pattern with operation parameters.

### Phase 3: Resources (1-2 days)
Decide: Keep resources or remove them entirely?

### Phase 4: Modernization (2-3 days)
- Add output schemas (June 2025 MCP spec)
- Implement human-in-the-loop for destructive ops
- Security enhancements

### Phase 5: Documentation (2-3 days)
- Update README, CLAUDE.md
- Create migration guide
- Update all tests
- API documentation

### Phase 6: Release (1 day)
- Beta testing
- Production release
- Announcement

## New Tool Naming Pattern

**Pattern**: `{action}-{domain}`

Examples:
- `manage-library` (operation: create|update|delete|get|list)
- `manage-library-content` (type: folder|file, operation: create|update|delete)
- `get-library-structure` (hierarchy view)
- `export-data` (type: chat|qa|transcripts|polls|...)

## Common Commands

```bash
# Run specific phase tests
npm test -- library-management
npm test -- room-management

# Check test coverage
npm run test:coverage
npm run coverage:analyze

# Development
npm run dev -- --developer-key YOUR_KEY

# Build and verify size
npm run build
npm run size-check

# Search for TODOs
grep -rn "TODO" src/

# Search for pattern routing
grep -n "includes(" src/index.ts
```

## Critical Files

| File | Purpose | Phase |
|------|---------|-------|
| `src/index.ts:255-417` | Tool routing (needs refactor) | Phase 1 |
| `src/tools/library-management/` | Library tools (26→5) | Phase 2 |
| `src/tools/room-management/` | Room tools (10→3) | Phase 2 |
| `src/tools/recording-management/index.ts` | DELETE (dead code) | Phase 1 |
| `README.md` | Update tool counts | Phase 5 |
| `CLAUDE.md` | Update architecture | Phase 5 |

## Decision Points

### Awaiting Decisions:
1. **Resources**: Keep or remove all 38 resources?
2. **Versioning**: v1.0.0 or v2.0.0?
3. **Backward Compatibility**: Support old tool names?
4. **Beta Timeline**: How long for beta testing?

## Progress Tracking

Track progress in [MCP_IMPROVEMENT_ROADMAP.md](./MCP_IMPROVEMENT_ROADMAP.md)

**Current Phase**: Planning
**Overall Progress**: 0/29 tasks complete

## Quick Start (For New Session)

```bash
# 1. Review roadmap
cat MCP_IMPROVEMENT_ROADMAP.md

# 2. Check current phase
grep "Status: In Progress" MCP_IMPROVEMENT_ROADMAP.md

# 3. Run tests before starting
npm test

# 4. Start work on current phase
# (See roadmap for specific tasks)
```

## Contact

**Questions?** See [MCP_IMPROVEMENT_ROADMAP.md](./MCP_IMPROVEMENT_ROADMAP.md) "Open Questions" section
**Issues?** Create GitHub issue with `[roadmap]` tag

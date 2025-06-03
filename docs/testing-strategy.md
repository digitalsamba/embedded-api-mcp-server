# Testing Strategy for Digital Samba MCP Server

## Current Testing Challenges

1. **Broken Tests**: Many tests reference removed features (rate limiting, webhooks module, etc.)
2. **MCP Protocol Testing**: Need to test MCP protocol compliance and client interactions
3. **Tool Discovery**: Claude and other MCP clients struggle to map user prompts to correct tools

## Testing Layers Required

### 1. Unit Tests
- API client methods
- Resource handlers
- Tool executors
- Error handling

### 2. Integration Tests  
- MCP protocol compliance
- Request/response flow
- Authentication handling
- Cache behavior

### 3. E2E Tests
- Full server startup
- Mock Digital Samba API responses
- Complete tool execution flows
- Resource retrieval scenarios

### 4. MCP Client Testing
- Mock MCP client scenarios
- Tool discovery testing
- Prompt-to-tool mapping validation

## Tool Discovery Problem

### Current Issues:
- No tool hints or aliases
- Similar tool names confuse clients (e.g., `get-recording` vs `get-recordings`)
- No semantic search or fuzzy matching
- Missing usage examples in tool descriptions

### Proposed Solutions:

#### 1. Enhanced Tool Descriptions
```typescript
{
  name: 'create-room',
  description: 'Create a new video conference room. Use this when: creating meeting spaces, setting up conference rooms, making new rooms. Keywords: new room, create meeting, setup conference',
  // Add examples in description
}
```

#### 2. Tool Aliases/Synonyms
```typescript
interface ToolDefinition {
  name: string;
  description: string;
  aliases?: string[]; // ['make-room', 'new-room', 'setup-room']
  keywords?: string[]; // ['meeting', 'conference', 'video', 'room']
  examples?: string[]; // ['Create a room for our team standup']
}
```

#### 3. Prompt Templates Documentation
Create a comprehensive guide showing:
- Common user prompts → Correct tool mapping
- Example conversations
- Best practices for prompting

#### 4. Tool Categories in Descriptions
Prefix descriptions with category:
- "[Room Management] Create a new room"
- "[Analytics] Get participant statistics"
- "[Recording] List all recordings"

## Testing Implementation Plan

### Phase 1: Fix Existing Tests (Day 1)
1. Remove tests for deleted features
2. Update test imports and mocks
3. Fix API client tests
4. Ensure tests compile

### Phase 2: Core Functionality Tests (Day 2)
1. Test each tool execution
2. Test each resource handler
3. Mock Digital Samba API responses
4. Test error scenarios

### Phase 3: MCP Protocol Tests (Day 3)
1. Test MCP server initialization
2. Test request/response handlers
3. Test transport layer
4. Test capability reporting

### Phase 4: Tool Discovery Enhancement (Day 4)
1. Implement enhanced descriptions
2. Add usage examples
3. Create prompt mapping tests
4. Document common patterns

## Test Data Requirements

### Mock API Responses
Need to create comprehensive mocks for:
- Room data
- Session data
- Recording data
- Analytics responses
- Error responses

### Test Scenarios
1. Happy path for each tool
2. Error handling (auth, not found, validation)
3. Edge cases (empty responses, large datasets)
4. Concurrent requests

## MCP Client Testing Strategy

### 1. Mock MCP Client
Create a test client that:
- Sends various prompt styles
- Tests tool discovery
- Validates responses
- Measures performance

### 2. Prompt Test Suite
```typescript
const promptTests = [
  {
    prompt: "Create a meeting room",
    expectedTool: "create-room",
    category: "room-management"
  },
  {
    prompt: "Show me yesterday's analytics",
    expectedTool: "get-team-analytics",
    parameters: { date_start: "yesterday", date_end: "yesterday" }
  }
];
```

### 3. Claude-Specific Testing
- Test with actual Claude Desktop (manual)
- Document successful prompt patterns
- Create prompt guide for users

## Coverage Goals

- Unit Tests: 90% coverage
- Integration Tests: 80% coverage
- E2E Tests: Core user journeys
- Tool Discovery: 100% of tools testable via prompts

## Environment Setup

```bash
# Test environment variables
DIGITAL_SAMBA_API_KEY=test-key
DIGITAL_SAMBA_API_URL=http://mock-api
NODE_ENV=test

# Mock server for Digital Samba API
npm run test:mock-server

# Run test suites
npm test -- --coverage
npm run test:integration
npm run test:e2e
```

## Next Session Priorities

1. **Immediate**: Fix broken tests so test suite runs
2. **High**: Implement tool discovery enhancements
3. **Medium**: Create comprehensive test coverage
4. **Low**: Document prompt patterns
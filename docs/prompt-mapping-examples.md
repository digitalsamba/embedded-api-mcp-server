# Prompt Mapping Examples for Digital Samba MCP Server

## Common User Prompts → Tool Mapping

### Room Management

| User Says | Maps To | Parameters |
|-----------|---------|------------|
| "Create a meeting room" | `create-room` | name required |
| "Set up a private conference" | `create-room` | privacy: 'private' |
| "Delete the old standup room" | `delete-room` | roomId required |
| "Generate a link for john@email.com" | `generate-token` | u: 'john@email.com' |
| "Show me all rooms" | `digitalsamba://rooms` | (resource) |

### Recording Management

| User Says | Maps To | Notes |
|-----------|---------|--------|
| "Start recording" | `start-recording` | Needs active room context |
| "Show me all recordings" | `get-recordings` | Tool, not resource |
| "List recordings" | `digitalsamba://recordings` | Resource, not tool |
| "Archive old recordings" | `archive-recording` | Needs recordingId |
| "Download recording ABC123" | `get-recording-download-link` | |

### Common Confusion Points

#### 1. List vs Get Pattern
- `get-recordings` (tool) - Returns filtered list with parameters
- `digitalsamba://recordings` (resource) - Returns all recordings
- `get-recording` (tool) - Gets single recording details

#### 2. Delete Variations
- "Delete chats" → Which scope?
  - `delete-session-chats` (single session)
  - `delete-room-chats` (all in room)
- "Remove polls" → Need clarification on scope

#### 3. Analytics Ambiguity
- "Show analytics" → Which type?
  - `get-team-analytics`
  - `get-room-analytics` 
  - `get-participant-statistics`
  - `digitalsamba://analytics/team` (resource)

## Proposed Tool Description Enhancements

### Before:
```json
{
  "name": "create-room",
  "description": "Create a new room"
}
```

### After:
```json
{
  "name": "create-room",
  "description": "[Room Management] Create a new video conference room. Use when: setting up meeting spaces, creating conference rooms, making virtual rooms. Example: 'Create a private room called Team Standup'. Required: name. Optional: privacy, max_participants, description"
}
```

## Prompt Pattern Guidelines

### 1. Action + Object Pattern
✅ Good: "Create a room", "Delete recording", "Export chat"
❌ Ambiguous: "Room", "Recording", "Chat"

### 2. Scope Specification
✅ Good: "Delete all room chats", "Delete session 123 chats"
❌ Ambiguous: "Delete chats"

### 3. Time-based Queries
✅ Good: "Show analytics for last week", "Get recordings from January"
❌ Ambiguous: "Show analytics", "Get recordings"

## Tool Discovery Helper Prompts

When uncertain, users could ask:
- "What tools are available for recordings?"
- "How do I manage rooms?"
- "List analytics capabilities"

The MCP server could recognize these patterns and return filtered tool lists.

## Implementation Ideas

### 1. Tool Metadata Enhancement
```typescript
interface EnhancedToolDefinition {
  name: string;
  category: 'room' | 'recording' | 'analytics' | 'session' | 'content';
  description: string;
  keywords: string[];
  examples: string[];
  commonPhrases: string[];
  requiredParams: string[];
  optionalParams: string[];
}
```

### 2. Fuzzy Matching Score
```typescript
function scoreToolMatch(userPrompt: string, tool: EnhancedToolDefinition): number {
  let score = 0;
  
  // Exact name match
  if (userPrompt.includes(tool.name)) score += 100;
  
  // Category match
  if (userPrompt.includes(tool.category)) score += 50;
  
  // Keyword matches
  tool.keywords.forEach(keyword => {
    if (userPrompt.toLowerCase().includes(keyword)) score += 20;
  });
  
  // Example similarity
  tool.examples.forEach(example => {
    const similarity = calculateSimilarity(userPrompt, example);
    score += similarity * 10;
  });
  
  return score;
}
```

### 3. Prompt Preprocessing
```typescript
function preprocessPrompt(prompt: string): {
  action: string;
  object: string;
  scope?: string;
  timeRange?: { start: Date; end: Date };
} {
  // Extract action verbs
  const actions = ['create', 'delete', 'list', 'get', 'show', 'export', 'start', 'stop'];
  
  // Extract objects
  const objects = ['room', 'recording', 'session', 'analytics', 'poll', 'chat'];
  
  // Extract scope modifiers
  const scopes = ['all', 'session', 'room', 'participant'];
  
  // Parse and return structured data
}
```

## Testing Strategy for Prompts

### 1. Prompt Test Dataset
Create comprehensive test cases:
```typescript
const promptTests = [
  // Unambiguous prompts
  { prompt: "create-room", expected: "create-room", confidence: 1.0 },
  
  // Natural language variations
  { prompt: "Make a new meeting room", expected: "create-room", confidence: 0.9 },
  { prompt: "Set up conference space", expected: "create-room", confidence: 0.8 },
  
  // Ambiguous prompts
  { prompt: "analytics", expected: ["get-team-analytics", "get-room-analytics"], confidence: 0.5 },
  
  // Context-dependent
  { prompt: "start recording", expected: "start-recording", requiresContext: "roomId" }
];
```

### 2. Success Metrics
- 90% accuracy on unambiguous prompts
- 70% accuracy on natural language variations
- Proper handling of ambiguous prompts (return options)
- Clear error messages for missing context
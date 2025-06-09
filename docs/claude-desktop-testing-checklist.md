# Claude Desktop Testing Checklist

## Setup Instructions

### 1. Install Latest Beta
Wait for the beta build to complete, then:
```bash
npm install -g @digitalsamba/mcp-server@beta
```

### 2. Update Claude Desktop Config
Edit your config file (`~/Library/Application Support/Claude/claude_desktop_config.json` on Mac):
```json
{
  "mcpServers": {
    "digital-samba": {
      "command": "npx",
      "args": ["@digitalsamba/mcp-server@beta", "--api-key", "YOUR_API_KEY"]
    }
  }
}
```

### 3. Restart Claude Desktop
Close and reopen Claude Desktop to load the new server.

---

## Natural Language Testing Scenarios

### Room Management Tests

| Test Scenario | Expected Tool/Resource | Notes |
|---------------|------------------------|-------|
| "Create a meeting room" | `create-room` | ✅ Should understand natural request |
| "Set up a private conference for 20 people" | `create-room` | ✅ Should infer privacy and max_participants |
| "Show me all rooms" | `digitalsamba://rooms` | ✅ Should use resource, not tool |
| "Generate a join link for john@email.com" | `generate-token` | ✅ Should understand token generation |
| "Delete the old standup room" | `delete-room` | ⚠️ May need clarification on which room |
| "Update room settings" | `update-room` | ⚠️ May need room ID clarification |

### Analytics & Reporting Tests

| Test Scenario | Expected Tool/Resource | Notes |
|---------------|------------------------|-------|
| "Show me analytics for yesterday" | `get-room-analytics` or analytics resource | ✅ Should understand time context |
| "What's our usage statistics?" | `get-usage-statistics` | ✅ Should map to usage tool |
| "Participant engagement metrics" | `get-participant-statistics` | ✅ Should understand participant focus |
| "Room performance data" | `digitalsamba://analytics/rooms` | ✅ Should use analytics resource |
| "Live session metrics" | `digitalsamba://analytics/live` | ✅ Should understand live context |

### Recording Management Tests

| Test Scenario | Expected Tool/Resource | Notes |
|---------------|------------------------|-------|
| "List all recordings" | `digitalsamba://recordings` | ✅ Should use resource for listing |
| "Show recordings with filters" | `get-recordings` | ✅ Should use tool for filtered results |
| "Download recording ABC123" | `get-recording-download-link` | ⚠️ Needs specific recording ID |
| "Delete old recordings" | `delete-recording` | ⚠️ May need clarification on which ones |
| "Archive recordings from last month" | `archive-recording` | ⚠️ May need batch operation guidance |

### Session Management Tests

| Test Scenario | Expected Tool/Resource | Notes |
|---------------|------------------------|-------|
| "End the current meeting" | `end-session` | ⚠️ Needs session context |
| "Show session summary" | `get-session-summary` | ⚠️ Needs session ID |
| "Delete chat messages" | `delete-session-chats` or `delete-room-chats` | ⚠️ Needs scope clarification |
| "List participants in session" | `digitalsamba://sessions/{id}/participants` | ✅ Should understand participant listing |

### Content Library Tests

| Test Scenario | Expected Tool/Resource | Notes |
|---------------|------------------------|-------|
| "Create a content library" | `create-library` | ✅ Should understand library creation |
| "Upload a presentation file" | `create-library-file` | ✅ Should understand file upload |
| "Show library contents" | `digitalsamba://libraries/{id}` | ✅ Should use resource for viewing |
| "Move files between folders" | `move-library-file` | ✅ Should understand file management |

---

## Advanced Testing Scenarios

### Ambiguous Prompts (Should Ask for Clarification)

| Test Scenario | Expected Behavior | Notes |
|---------------|-------------------|-------|
| "Delete chats" | Ask: session or room scope? | ✅ Should clarify scope |
| "Show analytics" | Ask: which type of analytics? | ✅ Should offer options |
| "Start recording" | Ask: which room? | ✅ Should ask for room context |
| "Export data" | Ask: what type of data? | ✅ Should clarify export type |

### Context-Dependent Tests

| Test Scenario | Expected Behavior | Notes |
|---------------|-------------------|-------|
| "Create room → Generate token for that room" | Should remember room ID | ✅ Context retention |
| "Show sessions → Get details for first session" | Should use session from previous result | ✅ Reference handling |
| "List recordings → Delete the old one" | Should clarify which recording | ⚠️ Ambiguous reference |

### Error Handling Tests

| Test Scenario | Expected Behavior | Notes |
|---------------|-------------------|-------|
| "Delete non-existent room" | Clear error message | ✅ Should handle gracefully |
| Invalid API key | Authentication error | ✅ Should explain auth issue |
| Rate limiting | Retry or clear message | ✅ Should handle API limits |

---

## Quality Checklist

### ✅ Success Criteria

- [ ] **Natural Language Understanding**: Claude understands 90%+ of natural requests
- [ ] **Tool vs Resource Selection**: Correctly chooses between tools (actions) and resources (data)
- [ ] **Parameter Inference**: Can infer obvious parameters from context
- [ ] **Clarification Requests**: Asks good questions for ambiguous requests
- [ ] **Error Handling**: Provides clear, helpful error messages
- [ ] **Context Retention**: Remembers IDs and data from previous operations
- [ ] **Category Understanding**: Groups related operations logically

### ⚠️ Areas to Monitor

- [ ] **Over-clarification**: Too many unnecessary questions
- [ ] **Wrong Tool Selection**: Choosing tools when resources would be better
- [ ] **Parameter Confusion**: Mixing up required vs optional parameters
- [ ] **API Limitations**: How well it handles unsupported operations

### 🐛 Issues to Report

- [ ] **Misunderstood Prompts**: Natural language that maps to wrong tools
- [ ] **Missing Context**: When it should remember but doesn't
- [ ] **Confusing Responses**: Unclear error messages or responses
- [ ] **Performance Issues**: Slow responses or timeouts

---

## Testing Notes Template

```
## Testing Session: [Date]
**Beta Version**: [version number]
**API Key Status**: [working/not working]
**Claude Desktop Version**: [version]

### Natural Language Tests
- [✅/❌] "Create a meeting room" → Expected: create-room, Got: ___
- [✅/❌] "Show analytics" → Expected: clarification, Got: ___
- [✅/❌] "List recordings" → Expected: recordings resource, Got: ___

### Issues Found
1. **Issue**: [Description]
   **Expected**: [What should happen]
   **Actual**: [What actually happened]
   **Severity**: [High/Medium/Low]

### Observations
- [General notes about UX, speed, accuracy]
- [Suggestions for improvement]

### Overall Score
**Natural Language Understanding**: [1-10]
**Tool Selection Accuracy**: [1-10]
**Error Handling Quality**: [1-10]
**Overall UX**: [1-10]
```

---

## Next Steps After Testing

1. **Document Issues**: Use the template above to report findings
2. **Prioritize Fixes**: Critical issues vs nice-to-have improvements  
3. **Update Descriptions**: Refine based on actual usage patterns
4. **Production Readiness**: Determine if ready for 1.0 release
# Debugging Claude's Tool Selection

When Claude is calling the wrong tool (e.g., getting recordings instead of rooms), here's how to debug:

## 1. Check Claude Desktop Logs

Look for these patterns in the logs:
- `Message from client: {"method":"tools/call","params":{"name":"...` - Shows which tool Claude is calling
- `Message from server: {"jsonrpc":"2.0","id":...,"result":...` - Shows the response

## 2. Enable Verbose Logging

Add more logging to see what's happening:

```bash
# Set environment variables for more logging
export LOG_LEVEL=debug
export DEBUG_TOOLS=true

# Run with verbose logging
npx digital-samba-mcp-server@beta --api-key YOUR_KEY --log-level debug
```

## 3. Check Tool Names

The tools available are:
- `create-room` - Create a new room
- `update-room` - Update room settings
- `delete-room` - Delete a room
- `generate-token` - Generate access token
- `get-recordings` - List recordings (THIS is what Claude might be calling)
- `start-recording` - Start recording
- `stop-recording` - Stop recording
- `create-meeting` - Schedule a meeting

## 4. Common Issues and Solutions

### Issue: Claude calls get-recordings when you ask for rooms
**Cause**: Claude might be confused about which tool to use
**Solution**: Be more specific in your prompt:
- Instead of: "Show me the rooms"
- Try: "List all Digital Samba rooms" or "Show me the meeting rooms"

### Issue: Resources vs Tools confusion
**Note**: Resources and tools are different in MCP:
- Resources: `digitalsamba://rooms` (accessed via resource URIs)
- Tools: `get-recordings`, `create-room`, etc. (called as functions)

Claude might not have access to resources if they're not properly exposed.

## 5. Test Commands

Try these specific prompts with Claude to test:

1. **For Rooms**:
   - "List all Digital Samba rooms using the rooms resource"
   - "Show me available meeting rooms"
   - "Create a new Digital Samba room called 'Test Room'"

2. **For Recordings**:
   - "List all Digital Samba recordings"
   - "Show me recordings using get-recordings tool"

## 6. Add Debug Logging to Your Server

Edit `src/create-stdio-server.ts` and add logging:

```typescript
// In setupTools function, add logging to each tool:
server.tool(
  'get-recordings',
  {
    limit: z.number().optional(),
    page: z.number().optional(),
    room_id: z.string().optional()
  },
  async (params) => {
    console.error('[DEBUG] get-recordings called with params:', params);
    // ... rest of the handler
  }
);
```

## 7. Check Resource Registration

Resources might not be visible to Claude. Check if they appear in:
```
Message from client: {"method":"resources/list","params":{},"jsonrpc":"2.0","id":3}
Message from server: {"jsonrpc":"2.0","id":3,"result":{"resources":[...]}}
```

If resources are empty, that's why Claude falls back to tools.

## 8. Temporary Workaround

If resources aren't working, create a specific tool for listing rooms:

```typescript
// Add this to setupTools in create-stdio-server.ts
server.tool(
  'list-rooms',
  {},
  async () => {
    const client = new DigitalSambaApiClient(apiKey, apiUrl, cache);
    try {
      const response = await client.listRooms();
      const rooms = response.data || [];
      
      return {
        content: [{
          type: 'text',
          text: `Found ${rooms.length} rooms:\n\n${JSON.stringify(rooms, null, 2)}`
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `Error listing rooms: ${error instanceof Error ? error.message : String(error)}`
        }],
        isError: true
      };
    }
  }
);
```

Then ask Claude to "list rooms using the list-rooms tool".
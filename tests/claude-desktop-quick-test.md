# Digital Samba MCP - Quick Sanity Test

**Purpose**: Fast verification that core functionality works (~5 minutes)
**Server**: https://mcp-dev.digitalsamba.com

## Quick Test Prompt

Copy this into Claude Desktop with the Digital Samba connector:

```
Run a quick sanity test of the Digital Samba MCP server:

1. **List rooms** (list-rooms limit=3) - verify API connection works
2. **Create a test room** (create-room topic="Quick Test - DELETE ME")
3. **Get room details** for the created room
4. **Generate a token** for the room (user_name="Tester", role="moderator")
5. **Get usage statistics** (get-usage-statistics)
6. **List webhooks** (list-webhooks)
7. **Get permissions** (get-permissions)
8. **Delete the test room** (delete-room)

Report PASS/FAIL for each step and any error messages.
```

## Expected Results

| Step | Tool | Expected |
|------|------|----------|
| 1 | list-rooms | Returns rooms array |
| 2 | create-room | Returns room with ID |
| 3 | get-room-details | Returns room object |
| 4 | generate-token | Returns token + URL |
| 5 | get-usage-statistics | Returns usage data |
| 6 | list-webhooks | Returns array (may be empty) |
| 7 | get-permissions | Returns permissions list |
| 8 | delete-room | Success confirmation |

## Pass Criteria

- **8/8 PASS**: All core functionality working
- **7/8 PASS**: Minor issue, investigate failure
- **<7 PASS**: Significant issue, run full test suite

## Quick Cleanup Check

After testing, run:
```
list-rooms with search "DELETE ME"
```
Should return empty (no leftover test rooms).

# MCP Testing with Claude Code

## Overview
This document outlines a plan to use Claude Code to systematically test the Digital Samba MCP server by adding it as an available MCP server to Claude Code's tools.

## Testing Approach
1. Add the Digital Samba MCP server to Claude Code's available MCP servers
2. Run through a comprehensive testing checklist
3. Document all bugs and issues found
4. Create a prioritized list of fixes

## Testing Checklist

### 1. Resource Access Testing
- [ ] Test listing all rooms via `digitalsamba://rooms`
- [ ] Test getting specific room details via `digitalsamba://rooms/{id}`
- [ ] Test listing sessions via `digitalsamba://sessions`
- [ ] Test listing recordings via `digitalsamba://recordings`
- [ ] Test analytics resources:
  - [ ] Team analytics via `digitalsamba://analytics/team`
  - [ ] Room analytics via `digitalsamba://analytics/rooms`
  - [ ] Session analytics via `digitalsamba://analytics/sessions`
- [ ] Test content library via `digitalsamba://content`
- [ ] Test export resources

### 2. Tool Operations Testing
- [ ] Create a test room using `create-room`
- [ ] Update the test room using `update-room`
- [ ] Generate access token using `generate-token`
- [ ] Delete the test room using `delete-room`
- [ ] Test session management tools
- [ ] Test recording management tools
- [ ] Test live session controls
- [ ] Test communication tools (chat, Q&A, transcripts)
- [ ] Test poll management
- [ ] Test library management
- [ ] Test role management
- [ ] Test webhook management

### 3. Error Handling Testing
- [ ] Test with invalid room IDs
- [ ] Test with missing required parameters
- [ ] Test with invalid API responses
- [ ] Test rate limiting behavior
- [ ] Test network error handling

### 4. Version and Configuration Testing
- [ ] Test `get-server-version` tool
- [ ] Verify version resource `digitalsamba://version`
- [ ] Test with different log levels
- [ ] Test with custom API URLs

## Bug Documentation Template
For each bug found, document:
1. **Bug Title**: Clear, concise description
2. **Steps to Reproduce**: Exact steps to trigger the bug
3. **Expected Behavior**: What should happen
4. **Actual Behavior**: What actually happens
5. **Error Messages**: Any error messages or logs
6. **Environment**: Version, configuration used
7. **Priority**: High/Medium/Low
8. **Potential Root Cause**: Initial analysis

## Known Issues to Investigate
1. Claude is sometimes using `get-recordings` when asked to list rooms - need to verify resource routing
2. Version display shows source version (`0.1.0-beta.1`) not npm package version
3. The `{ metadata: undefined }` entries in Claude Desktop logs

## Setup Instructions for Next Session
1. Ensure latest version of Digital Samba MCP server is configured in Claude Desktop
2. Have a valid developer key ready
3. Restart Claude Code to pick up the new MCP server
4. Reference this document to begin systematic testing

## Expected Outcomes
- Comprehensive list of bugs and issues
- Prioritized fix list
- Improved user experience
- Better error messages and handling
- Complete API coverage verification
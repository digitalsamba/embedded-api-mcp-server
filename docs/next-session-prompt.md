# Prompt for Next Testing Session

Please use this prompt to start the next session:

---

I need you to perform comprehensive testing of the Digital Samba MCP server that's already connected to this Claude Code instance. 

Please read the handover document at `/docs/session-handover-2025-06-10-final-testing.md` which contains:
- List of bug fixes to verify
- Complete checklist of all MCP functionality to test
- Instructions for creating a detailed testing report

Additionally, please:
1. Compare the actual functionality against what's documented in the README.md
2. Compare our testing approach here in Claude Code versus the guidelines in `/docs/claude-desktop-testing-checklist.md`
3. Create a comprehensive testing report at `/docs/mcp-final-testing-report.md`

The testing should be systematic and thorough, covering:
- All resources listed in README
- All tools listed in README  
- Bug fix verification
- Error handling
- Edge cases

Please start by reading the handover document and then begin systematic testing.

---

## Quick Reference Commands

To check MCP server status:
```
mcp__digital-samba__get-server-version
```

Previous bugs that were fixed:
1. Privacy field in create-room now defaults to 'public'
2. Default room settings tools now work
3. Room name vs topic field behavior

Please be thorough and document everything, even features that work correctly.
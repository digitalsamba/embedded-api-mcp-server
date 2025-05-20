# Meeting Scheduling with Digital Samba MCP Server

This guide explains how to use the meeting scheduling functionality in the Digital Samba MCP Server with Claude.

## Overview

The Digital Samba MCP Server provides a comprehensive set of resources and tools to schedule, manage, and access meetings through the Digital Samba platform. Meeting scheduling allows you to:

- Create and manage scheduled meetings
- Add and remove participants
- Send invitations and reminders
- Find available time slots
- Generate meeting join links
- Cancel or delete meetings

## Resources

The following resources are available for working with scheduled meetings:

| Resource | URI | Description |
|---------|-----|-------------|
| Scheduled Meetings | `digitalsamba://meetings` | List all scheduled meetings |
| Scheduled Meeting | `digitalsamba://meetings/{meetingId}` | Get details for a specific meeting |
| Meeting Participants | `digitalsamba://meetings/{meetingId}/participants` | List participants for a meeting |
| Upcoming Meetings | `digitalsamba://meetings/upcoming` | List upcoming meetings |
| Room Meetings | `digitalsamba://rooms/{roomId}/meetings` | List meetings for a specific room |

## Tools

The following tools are available for working with scheduled meetings:

| Tool | Description |
|------|-------------|
| `create-scheduled-meeting` | Create a new scheduled meeting |
| `update-scheduled-meeting` | Update an existing meeting |
| `cancel-scheduled-meeting` | Cancel a scheduled meeting |
| `delete-scheduled-meeting` | Permanently delete a meeting |
| `add-meeting-participants` | Add participants to a meeting |
| `remove-meeting-participants` | Remove participants from a meeting |
| `send-meeting-reminders` | Send reminders to meeting participants |
| `find-available-meeting-times` | Find available time slots based on participant availability |
| `generate-meeting-join-link` | Generate a join link for a specific participant |

## Example: Creating a Meeting

```typescript
// Create a scheduled meeting
const createMeetingResult = await client.callTool({
  name: 'create-scheduled-meeting',
  arguments: {
    title: 'Team Meeting',
    description: 'Weekly team sync-up',
    room_id: 'your-room-id',  // Optional, can create a new room automatically
    start_time: '2025-05-21T14:00:00Z',  // ISO 8601 format
    end_time: '2025-05-21T15:00:00Z',    // ISO 8601 format
    timezone: 'UTC',
    host_name: 'Team Lead',
    host_email: 'lead@example.com',
    participants: [
      {
        name: 'Team Member 1',
        email: 'member1@example.com',
        role: 'attendee'
      },
      {
        name: 'Team Member 2',
        email: 'member2@example.com',
        role: 'attendee'
      }
    ],
    recurring: false,
    send_invitations: true
  }
});
```

## Example: Updating a Meeting

```typescript
// Update a scheduled meeting
const updateMeetingResult = await client.callTool({
  name: 'update-scheduled-meeting',
  arguments: {
    meeting_id: 'your-meeting-id',
    title: 'Updated Team Meeting',
    description: 'Updated description',
    start_time: '2025-05-21T14:30:00Z',  // Updated start time
    send_updates: true  // Send notifications to participants
  }
});
```

## Example: Finding Available Meeting Times

```typescript
// Find available meeting times
const findTimesResult = await client.callTool({
  name: 'find-available-meeting-times',
  arguments: {
    participants: [
      'participant1@example.com',
      'participant2@example.com',
      'participant3@example.com'
    ],
    duration_minutes: 60,
    start_date: '2025-05-20',
    end_date: '2025-05-25',
    timezone: 'UTC',
    working_hours_start: 9,
    working_hours_end: 17,
    min_options: 3
  }
});
```

## Example: Generating a Join Link

```typescript
// Generate a join link for a specific participant
const joinLinkResult = await client.callTool({
  name: 'generate-meeting-join-link',
  arguments: {
    meeting_id: 'your-meeting-id',
    participant_name: 'Guest User',
    participant_email: 'guest@example.com',
    role: 'guest'  // Optional
  }
});
```

## Using with Claude

To use meeting scheduling functionality with Claude:

1. Enable the Digital Samba MCP Server in Claude's settings
2. Ask Claude to schedule a meeting with specific details:

```
Can you schedule a team meeting for next Monday at 2 PM for 1 hour? 
Title it "Project Kickoff" and invite john@example.com and sarah@example.com.
```

Claude can also help you find available meeting times, reschedule meetings, or cancel them:

```
Can you find 3 available time slots next week for a 1-hour meeting with the following team members?
- alice@example.com
- bob@example.com
- charlie@example.com
```

## Testing

You can test the meeting scheduling functionality with the included test script:

```bash
# Set your API key
set DIGITAL_SAMBA_API_KEY=your_api_key

# Run the test script
npm run test:meetings

# Alternatively, use the batch file
test-meeting-scheduling.bat
```

## Troubleshooting

Common issues:

1. **Error creating meeting**: Ensure the room ID exists or allow the API to create a new room by setting `room_settings` instead of `room_id`.

2. **Participant email format**: All participant emails must be valid email addresses.

3. **Date format**: All dates must be in ISO 8601 format (e.g., `2025-05-21T14:00:00Z`).

4. **Timezone**: Ensure the timezone specified is valid (e.g., 'UTC', 'America/New_York', 'Europe/London').

# Digital Samba MCP Server - Moderation Features

The Digital Samba MCP Server now includes comprehensive moderation tools and resources to help manage meeting rooms and participants. This document outlines the available moderation features and how to use them.

## Moderation Resources

### Room Moderation Settings
- Resource URI: `digitalsamba://rooms/{roomId}/moderation`
- Description: Gets the current moderation settings for a room, including lock status and media feature enablement

### Banned Participants
- Resource URI: `digitalsamba://rooms/{roomId}/banned-participants`
- Description: Gets a list of participants that have been banned from a room

## Moderation Tools

### Room Control Tools

#### `set-room-lock`
- Arguments:
  - `roomId` (string, required): The ID of the room to lock/unlock
  - `lock` (boolean, required): Whether to lock (true) or unlock (false) the room
- Description: Controls whether the room is locked. When a room is locked, new participants cannot join.

#### `update-room-media-settings`
- Arguments:
  - `roomId` (string, required): The ID of the room to update
  - `chat_enabled` (boolean, optional): Enable/disable chat
  - `private_chat_enabled` (boolean, optional): Enable/disable private chat
  - `screenshare_enabled` (boolean, optional): Enable/disable screen sharing
  - `recordings_enabled` (boolean, optional): Enable/disable recording
  - `audio_on_join_enabled` (boolean, optional): Enable/disable microphone on join
  - `video_on_join_enabled` (boolean, optional): Enable/disable camera on join
  - `participants_list_enabled` (boolean, optional): Enable/disable participants list
- Description: Updates various media settings for a room. Each setting is optional, so you can update just the settings you want to change.

### Participant Control Tools

#### `remove-participant`
- Arguments:
  - `roomId` (string, required): The ID of the room
  - `participantId` (string, required): The ID of the participant to remove
- Description: Removes a participant from a room

#### `set-participant-mute`
- Arguments:
  - `roomId` (string, required): The ID of the room
  - `participantId` (string, required): The ID of the participant
  - `mute` (boolean, required): Whether to mute (true) or unmute (false) the participant
  - `type` (string, optional): The type of mute to apply - 'audio', 'video', or 'all' (default)
- Description: Controls the mute status of a participant's audio and/or video

#### `set-participant-role`
- Arguments:
  - `roomId` (string, required): The ID of the room
  - `participantId` (string, required): The ID of the participant
  - `role` (string, required): The role to assign to the participant
- Description: Sets the role for a participant, which determines their permissions in the room

#### `ban-participant`
- Arguments:
  - `roomId` (string, required): The ID of the room
  - `participantId` (string, required): The ID of the participant to ban
- Description: Bans a participant from the room, preventing them from rejoining

#### `unban-participant`
- Arguments:
  - `roomId` (string, required): The ID of the room
  - `participantId` (string, required): The ID of the banned participant to unban
- Description: Removes a ban for a participant, allowing them to rejoin the room

#### `list-banned-participants`
- Arguments:
  - `roomId` (string, required): The ID of the room
- Description: Lists all participants that have been banned from a room

## Usage Examples

### Locking a Room

```javascript
const result = await mcpClient.callTool({
  name: 'set-room-lock',
  arguments: {
    roomId: '1234-5678-9abc',
    lock: true
  }
});

console.log(result.content[0].text);
// Output: Room 1234-5678-9abc has been locked successfully.
```

### Muting a Participant

```javascript
const result = await mcpClient.callTool({
  name: 'set-participant-mute',
  arguments: {
    roomId: '1234-5678-9abc',
    participantId: 'participant-id-123',
    mute: true,
    type: 'audio'
  }
});

console.log(result.content[0].text);
// Output: Participant participant-id-123 has been muted (audio) in room 1234-5678-9abc successfully.
```

### Updating Room Media Settings

```javascript
const result = await mcpClient.callTool({
  name: 'update-room-media-settings',
  arguments: {
    roomId: '1234-5678-9abc',
    chat_enabled: false,
    private_chat_enabled: false,
    screenshare_enabled: true
  }
});

console.log(result.content[0].text);
// Output: Room 1234-5678-9abc settings updated successfully:
// - chat enabled: Disabled
// - private chat enabled: Disabled
// - screenshare enabled: Enabled
```

### Getting Room Moderation Settings

```javascript
const result = await mcpClient.readResource({
  uri: 'digitalsamba://rooms/1234-5678-9abc/moderation'
});

console.log(JSON.parse(result.contents[0].text));
// Output: {
//   "is_locked": true,
//   "chat_enabled": false,
//   "private_chat_enabled": false,
//   "recordings_enabled": true,
//   "screenshare_enabled": true,
//   "audio_on_join_enabled": true,
//   "video_on_join_enabled": true,
//   "participants_list_enabled": true
// }
```

## Testing Moderation Features

You can test the moderation features using the provided test script:

```bash
npm run test:moderation
```

Or run the batch file:

```bash
test-moderation.bat
```

These tests will create a temporary room, test various moderation features, and then delete the room.

## Best Practices

1. **Incremental Moderation**: Start with the least restrictive moderation settings and increase as needed based on participant behavior.

2. **Communicate Changes**: When changing moderation settings, inform participants of the changes to avoid confusion.

3. **Role-Based Moderation**: Assign appropriate roles to participants to automatically set their permissions rather than managing individual permissions.

4. **Test Before Events**: Test moderation features before important meetings to ensure they work as expected.

5. **Maintain a List**: Keep track of banned participants to review periodically.

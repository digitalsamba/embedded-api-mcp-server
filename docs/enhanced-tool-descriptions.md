# Enhanced Tool Descriptions for Digital Samba MCP Server

This document provides a comprehensive overview of all enhanced tool descriptions in the Digital Samba MCP Server. The enhancements are designed to improve Claude Desktop's ability to understand user prompts and select the appropriate tools.

## Enhancement Pattern

Each tool description follows this pattern:
1. **[Category]** prefix for easy categorization
2. **Brief description** of what the tool does
3. **"Use when users say:"** section with common phrases and variations
4. **Requirements** clearly stated (which parameters are required)
5. **Return value** summary
6. **Important notes** when applicable (e.g., "cannot be undone")

## Tools by Category

### [Room Management] - 6 tools

1. **create-room**
   - Original: "Create a new room with specified settings"
   - Enhanced: "[Room Management] Create a new room with specified settings. Use when users say: \"create a room\", \"set up a meeting space\", \"make a new video room\", \"create a conference room\", \"set up a virtual meeting room\". Returns the created room object with ID, join URL, and all settings."

2. **update-room**
   - Original: "Update an existing room"
   - Enhanced: "[Room Management] Update an existing room's settings. Use when users say: \"change room settings\", \"update the room\", \"modify room configuration\", \"edit room details\", \"change max participants\", \"rename the room\". Requires roomId. Returns the updated room object."

3. **delete-room**
   - Original: "Delete a room"
   - Enhanced: "[Room Management] Permanently delete a room. Use when users say: \"delete the room\", \"remove this room\", \"delete meeting room\", \"remove conference room\", \"permanently delete room\". Requires roomId. This action cannot be undone."

4. **generate-token**
   - Original: "Generate an access token for a room"
   - Enhanced: "[Room Management] Generate an access token for users to join a room. Use when users say: \"create a join link\", \"generate access token\", \"create invite link\", \"get room access\", \"invite someone to room\", \"create moderator link\". Requires roomId. Returns a token with join URL."

5. **get-default-room-settings**
   - Original: "Get the default settings applied to all new rooms"
   - Enhanced: "[Room Management] Get the default settings that are automatically applied to all new rooms. Use when users say: \"show default room settings\", \"what are the default settings\", \"get room defaults\", \"show room template settings\". Returns all default configuration options."

6. **update-default-room-settings**
   - Original: "Update the default settings for new rooms"
   - Enhanced: "[Room Management] Update the default settings template for all future rooms. Use when users say: \"change default room settings\", \"update room defaults\", \"modify default configuration\", \"set default language\", \"change default room template\". Requires settings object. Affects only new rooms created after this change."

### [Session Management] - 6 tools

1. **get-all-room-sessions**
   - Original: "Get all sessions for a specific room with optional filters"
   - Enhanced: "[Session Management] Get all sessions (past and live) for a specific room. Use when users say: \"list sessions for room\", \"show room sessions\", \"get meeting history\", \"show past meetings\", \"list all sessions\", \"show live sessions\". Requires roomId. Returns paginated session list with details."

2. **hard-delete-session-resources**
   - Original: "Permanently delete all stored resource data for a session"
   - Enhanced: "[Session Management] Permanently delete ALL stored data for a session including recordings, chats, Q&A. Use when users say: \"permanently delete session data\", \"remove all session resources\", \"hard delete session\", \"wipe session data\", \"delete everything from session\". Requires sessionId. This action cannot be undone!"

3. **bulk-delete-session-data**
   - Original: "Delete multiple types of session data in a single operation"
   - Enhanced: "[Session Management] Delete specific types of session data (chat, Q&A, transcripts, etc). Use when users say: \"delete session chat and transcripts\", \"remove multiple session data types\", \"bulk delete session content\", \"clean up session data\". Requires sessionId and dataTypes array. More selective than hard-delete."

4. **get-session-summary**
   - Original: "Get a comprehensive summary of a session"
   - Enhanced: "[Session Management] Get a comprehensive summary of a session including participants, duration, and activities. Use when users say: \"show session summary\", \"get meeting summary\", \"session details\", \"what happened in the session\", \"meeting report\". Requires sessionId. Returns detailed session information."

5. **end-session**
   - Original: "End a live session"
   - Enhanced: "[Session Management] Force end a currently live/active session. Use when users say: \"end the session\", \"stop the meeting\", \"close the session\", \"terminate the call\", \"end live session now\". Requires sessionId. Only works on active sessions. Disconnects all participants."

6. **get-session-statistics**
   - Original: "Get detailed statistics for a session"
   - Enhanced: "[Session Management] Get detailed usage statistics and metrics for a session. Use when users say: \"show session statistics\", \"get meeting metrics\", \"session analytics\", \"participant statistics\", \"session usage data\". Requires sessionId. Returns participant count, duration, activity metrics."

### [Analytics] - 3 tools

1. **get-participant-statistics**
   - Original: "Get detailed participant statistics with optional filters"
   - Enhanced: "[Analytics] Get detailed participant statistics and behavior analytics. Use when users say: \"show participant stats\", \"participant analytics\", \"user activity report\", \"attendee statistics\", \"who attended meetings\", \"participant engagement metrics\". Optional filters for date range, room, or specific participant. Returns attendance, duration, and activity data."

2. **get-room-analytics**
   - Original: "Get comprehensive room analytics with optional filters"
   - Enhanced: "[Analytics] Get comprehensive room usage analytics and performance metrics. Use when users say: \"room analytics\", \"room usage statistics\", \"meeting room performance\", \"room activity report\", \"how is the room being used\", \"room metrics\". Optional room_id for specific room or all rooms. Returns usage patterns, participant counts, session data."

3. **get-usage-statistics**
   - Original: "Get usage statistics and growth metrics"
   - Enhanced: "[Analytics] Get overall platform usage statistics and growth trends. Use when users say: \"show usage stats\", \"platform analytics\", \"growth metrics\", \"overall statistics\", \"usage trends\", \"total meeting minutes\", \"platform activity\". Optional date filters and period grouping. Returns total sessions, participants, minutes, and growth rates."

### [Recording Management] - 9 tools

1. **start-recording**
   - Original: "Start recording a room"
   - Enhanced: "[Recording Management] Start recording an active room session. Use when users say: \"start recording\", \"begin recording\", \"record this meeting\", \"start recording the room\", \"record session\". Requires room_id. Room must have an active session."

2. **stop-recording**
   - Original: "Stop recording a room"
   - Enhanced: "[Recording Management] Stop an ongoing room recording. Use when users say: \"stop recording\", \"end recording\", \"finish recording\", \"stop recording the room\", \"halt recording\". Requires room_id. Only works if recording is currently active."

3. **get-recordings**
   - Original: "Get a list of recordings"
   - Enhanced: "[Recording Management] Get a list of all recordings with optional filters. Use when users say: \"list recordings\", \"show recordings\", \"get all recordings\", \"show videos\", \"list meeting recordings\", \"recordings for room\". Returns paginated list with recording details, status, and duration."

4. **delete-recording**
   - Original: "Delete a recording"
   - Enhanced: "[Recording Management] Permanently delete a recording. Use when users say: \"delete recording\", \"remove recording\", \"delete video\", \"remove video recording\", \"delete meeting recording\". Requires recordingId. This action cannot be undone."

5. **get-recording**
   - Original: "Get specific recording details"
   - Enhanced: "[Recording Management] Get detailed information about a specific recording. Use when users say: \"show recording details\", \"get recording info\", \"recording information\", \"details about recording\", \"show video details\". Requires recordingId. Returns full recording metadata including status, duration, and URLs."

6. **get-recording-download-link**
   - Original: "Generate download links"
   - Enhanced: "[Recording Management] Generate a temporary download link for a recording. Use when users say: \"download recording\", \"get download link\", \"export recording\", \"download video\", \"get recording URL\". Requires recordingId. Returns a time-limited download URL. Recording must be in READY status."

7. **archive-recording**
   - Original: "Archive a recording"
   - Enhanced: "[Recording Management] Move a recording to archived status for long-term storage. Use when users say: \"archive recording\", \"archive video\", \"move to archive\", \"store recording\", \"archive old recording\". Requires recordingId. Archived recordings can be unarchived later."

8. **unarchive-recording**
   - Original: "Unarchive a recording"
   - Enhanced: "[Recording Management] Restore an archived recording back to active status. Use when users say: \"unarchive recording\", \"restore recording\", \"unarchive video\", \"bring back from archive\", \"restore archived recording\". Requires recordingId. Only works on archived recordings."

9. **update-recording**
   - Original: "Update recording metadata"
   - Enhanced: "[Recording Management] Update recording metadata like name or description. Use when users say: \"rename recording\", \"update recording name\", \"change recording title\", \"edit recording details\". Requires recordingId. Currently limited to name updates."

### [Live Session Controls] - 4 tools

1. **start-transcription**
   - Original: "Start transcription for a live session in a room"
   - Enhanced: "[Live Session Controls] Start real-time transcription for an active room session. Use when users say: \"start transcription\", \"enable transcription\", \"transcribe the meeting\", \"turn on transcription\", \"start live captions\". Requires roomId with an active session. Transcripts can be exported later."

2. **stop-transcription**
   - Original: "Stop transcription for a live session in a room"
   - Enhanced: "[Live Session Controls] Stop ongoing transcription in a room. Use when users say: \"stop transcription\", \"disable transcription\", \"turn off transcription\", \"stop live captions\", \"end transcription\". Requires roomId. Only works if transcription is currently active."

3. **phone-participants-joined**
   - Original: "Register phone participants joining a room"
   - Enhanced: "[Live Session Controls] Register phone/dial-in participants joining a room. Use when users say: \"add phone participant\", \"someone dialed in\", \"phone user joined\", \"register dial-in participant\". Requires roomId and participant details including call_id. Used for tracking phone-based attendees."

4. **phone-participants-left**
   - Original: "Register phone participants leaving a room"
   - Enhanced: "[Live Session Controls] Register phone/dial-in participants leaving a room. Use when users say: \"phone participant left\", \"dial-in user disconnected\", \"remove phone participant\", \"phone user hung up\". Requires roomId and callIds array. Updates participant tracking."

### [Communication Management] - 8 tools

1. **delete-session-chats**
   - Original: "Delete all chat messages for a specific session"
   - Enhanced: "[Communication Management] Delete all chat messages from a specific session. Use when users say: \"delete session chat\", \"remove chat messages\", \"clear session chat history\", \"delete chat from session\", \"wipe chat messages\". Requires sessionId. This permanently removes all chat data."

2. **delete-room-chats**
   - Original: "Delete all chat messages for all sessions in a room"
   - Enhanced: "[Communication Management] Delete all chat messages from ALL sessions in a room. Use when users say: \"delete all room chats\", \"clear room chat history\", \"remove all chat messages from room\", \"wipe room chats\". Requires roomId. Affects all past and current sessions."

3. **delete-session-qa**
   - Original: "Delete all questions and answers for a specific session"
   - Enhanced: "[Communication Management] Delete all Q&A (questions and answers) from a session. Use when users say: \"delete session Q&A\", \"remove questions and answers\", \"clear Q&A history\", \"delete session questions\", \"wipe Q&A data\". Requires sessionId. Removes all Q&A interactions."

4. **delete-room-qa**
   - Original: "Delete all questions and answers for all sessions in a room"
   - Enhanced: "[Communication Management] Delete all Q&A from ALL sessions in a room. Use when users say: \"delete all room Q&A\", \"clear room questions\", \"remove all Q&A from room\", \"wipe room Q&A history\". Requires roomId. Affects all sessions' Q&A data."

5. **delete-session-transcripts**
   - Original: "Delete all transcripts for a specific session"
   - Enhanced: "[Communication Management] Delete all transcription data from a session. Use when users say: \"delete session transcript\", \"remove transcription\", \"clear transcript\", \"delete meeting transcript\", \"wipe transcription data\". Requires sessionId. Permanently removes transcript records."

6. **delete-room-transcripts**
   - Original: "Delete all transcripts for all sessions in a room"
   - Enhanced: "[Communication Management] Delete all transcripts from ALL sessions in a room. Use when users say: \"delete all room transcripts\", \"clear room transcription history\", \"remove all transcripts from room\", \"wipe room transcripts\". Requires roomId. Affects all sessions' transcripts."

7. **delete-session-summaries**
   - Original: "Delete all AI-generated summaries for a specific session"
   - Enhanced: "[Communication Management] Delete AI-generated summaries from a session. Use when users say: \"delete session summary\", \"remove AI summary\", \"clear meeting summary\", \"delete session notes\", \"wipe summary data\". Requires sessionId. Removes all AI-generated session summaries."

8. **delete-room-summaries**
   - Original: "Delete all AI-generated summaries for all sessions in a room"
   - Enhanced: "[Communication Management] Delete all AI summaries from ALL sessions in a room. Use when users say: \"delete all room summaries\", \"clear room AI summaries\", \"remove all summaries from room\", \"wipe room summary history\". Requires roomId. Affects all sessions' AI summaries."

### [Poll Management] - 6 tools

1. **create-poll**
   - Original: "Create a new poll in a room"
   - Enhanced: "[Poll Management] Create a new poll/survey in a room. Use when users say: \"create a poll\", \"add a survey\", \"make a poll\", \"create voting question\", \"add multiple choice question\". Requires roomId, question, and at least 2 options. Returns poll ID for tracking."

2. **update-poll**
   - Original: "Update an existing poll"
   - Enhanced: "[Poll Management] Update an existing poll's question, options, or settings. Use when users say: \"change poll question\", \"update poll\", \"edit poll options\", \"modify survey\", \"change poll settings\". Requires roomId and pollId. Can update question, options, type, or visibility settings."

3. **delete-poll**
   - Original: "Delete a specific poll"
   - Enhanced: "[Poll Management] Delete a specific poll from a room. Use when users say: \"delete poll\", \"remove poll\", \"delete survey\", \"remove voting question\", \"cancel poll\". Requires roomId and pollId. This action cannot be undone."

4. **delete-session-polls**
   - Original: "Delete all polls for a specific session"
   - Enhanced: "[Poll Management] Delete ALL polls from a specific session. Use when users say: \"delete all session polls\", \"remove all polls from session\", \"clear session polls\", \"delete all surveys from meeting\". Requires sessionId. Removes all poll data from that session."

5. **delete-room-polls**
   - Original: "Delete all polls for all sessions in a room"
   - Enhanced: "[Poll Management] Delete ALL polls from ALL sessions in a room. Use when users say: \"delete all room polls\", \"remove all polls from room\", \"clear room poll history\", \"wipe all room surveys\". Requires roomId. Affects all past and current session polls."

6. **publish-poll-results**
   - Original: "Publish poll results to participants"
   - Enhanced: "[Poll Management] Publish/share poll results with participants. Use when users say: \"show poll results\", \"publish poll results\", \"share voting results\", \"display poll outcome\", \"reveal survey results\". Requires roomId, pollId, and sessionId. Makes results visible to all participants."

### [Content Library] - 17 tools

1. **create-library**
   - Original: "Create a new content library"
   - Enhanced: "[Content Library] Create a new content library for storing files and documents. Use when users say: \"create library\", \"make content library\", \"new file storage\", \"create document library\", \"set up content repository\". Requires externalId. Returns library ID for file uploads."

2. **update-library**
   - Original: "Update library details"
   - Enhanced: "[Content Library] Update library name or external ID. Use when users say: \"rename library\", \"update library\", \"change library name\", \"modify library details\", \"edit library settings\". Requires libraryId. Can update name and external identifier."

3. **delete-library**
   - Original: "Delete a content library"
   - Enhanced: "[Content Library] Permanently delete a content library and all its contents. Use when users say: \"delete library\", \"remove content library\", \"delete file storage\", \"remove library\". Requires libraryId. This deletes ALL files and folders within!"

4. **create-library-folder**
   - Original: "Create a new folder in a library"
   - Enhanced: "[Content Library] Create a folder for organizing files. Use when users say: \"create folder\", \"make directory\", \"add folder\", \"create subfolder\", \"organize files in folders\". Requires libraryId. Optional parentId for nested folders. Returns folder ID."

5. **update-library-folder**
   - Original: "Update folder details"
   - Enhanced: "[Content Library] Update folder name or move to different parent. Use when users say: \"rename folder\", \"update folder\", \"change folder name\", \"move folder\", \"reorganize folders\". Requires libraryId and folderId. Can change name or parent folder."

6. **delete-library-folder**
   - Original: "Delete a folder from a library"
   - Enhanced: "[Content Library] Delete a folder and optionally its contents. Use when users say: \"delete folder\", \"remove directory\", \"delete folder and files\", \"remove subfolder\". Requires libraryId and folderId. May delete contained files depending on settings."

7. **create-library-file**
   - Original: "Create a new file entry and get upload URL"
   - Enhanced: "[Content Library] Create file entry and get upload URL. Use when users say: \"upload file\", \"add document\", \"upload to library\", \"add file\", \"store document\". Requires libraryId and name. Returns upload URL for actual file transfer. Optional folderId."

8. **update-library-file**
   - Original: "Update file details"
   - Enhanced: "[Content Library] Update file name or move to different folder. Use when users say: \"rename file\", \"update file\", \"change file name\", \"move file to folder\", \"reorganize files\". Requires libraryId and fileId. Can change name or folder location."

9. **delete-library-file**
   - Original: "Delete a file from a library"
   - Enhanced: "[Content Library] Permanently delete a file from library. Use when users say: \"delete file\", \"remove document\", \"delete upload\", \"remove file from library\". Requires libraryId and fileId. This action cannot be undone."

10. **get-file-links**
    - Original: "Get viewing and thumbnail links for a file"
    - Enhanced: "[Content Library] Get viewing and thumbnail URLs for a file. Use when users say: \"get file link\", \"share file\", \"view file\", \"get download link\", \"access file URL\". Requires libraryId and fileId. Returns URLs for viewing and thumbnails."

11. **create-webapp**
    - Original: "Create a new webapp in a library"
    - Enhanced: "[Content Library] Create a webapp/web application entry in library. Use when users say: \"create webapp\", \"add web app\", \"create web application\", \"add webapp to library\". Requires libraryId and name. Optional folderId. For embedding web content."

12. **create-whiteboard**
    - Original: "Create a new whiteboard in a library"
    - Enhanced: "[Content Library] Create a collaborative whiteboard in library. Use when users say: \"create whiteboard\", \"add whiteboard\", \"create drawing board\", \"make collaborative board\". Requires libraryId and name. Optional folderId. For visual collaboration."

13. **move-library-file**
    - Original: "Move a file to a different folder within the same library"
    - Enhanced: "[Content Library] Move a file to a different folder. Use when users say: \"move file\", \"relocate file\", \"move to folder\", \"reorganize file\", \"change file location\". Requires libraryId and fileId. Moves file within same library only."

14. **move-library-folder**
    - Original: "Move a folder to a different parent folder"
    - Enhanced: "[Content Library] Move a folder to a different parent location. Use when users say: \"move folder\", \"relocate directory\", \"reorganize folders\", \"change folder parent\", \"nest folder\". Requires libraryId and folderId. Moves entire folder tree."

15. **bulk-delete-library-files**
    - Original: "Delete multiple files at once"
    - Enhanced: "[Content Library] Delete multiple files in one operation. Use when users say: \"delete multiple files\", \"bulk delete\", \"remove several files\", \"mass delete files\", \"delete file batch\". Requires libraryId and fileIds array. Efficient for cleanup tasks."

16. **bulk-upload-library-files**
    - Original: "Get upload URLs for multiple files at once"
    - Enhanced: "[Content Library] Get upload URLs for multiple files in batch. Use when users say: \"upload multiple files\", \"bulk upload\", \"batch upload\", \"upload many files\", \"mass file upload\". Requires libraryId and files array with names, sizes, and MIME types."

17. **copy-library-content**
    - Original: "Copy files or folders within or between libraries"
    - Enhanced: "[Content Library] Copy files or folders within/between libraries. Use when users say: \"copy file\", \"duplicate folder\", \"copy to another library\", \"clone content\", \"duplicate files\". Requires source/target library IDs, content type and ID. Can rename during copy."

### [Role Management] - 6 tools

1. **create-role**
   - Original: "Create a new role with specified permissions"
   - Enhanced: "[Role Management] Create a custom role with specific permissions. Use when users say: \"create role\", \"add custom role\", \"make new role\", \"define permissions\", \"create user role\". Requires name, display_name, and permissions object. Role names must use letters, numbers, dashes, underscores only."

2. **update-role**
   - Original: "Update an existing role"
   - Enhanced: "[Role Management] Update role settings, name, or permissions. Use when users say: \"update role\", \"change permissions\", \"modify role\", \"edit role settings\", \"update role permissions\". Requires roleId. Can update display name, description, or permission settings."

3. **delete-role**
   - Original: "Delete a role"
   - Enhanced: "[Role Management] Permanently delete a custom role. Use when users say: \"delete role\", \"remove role\", \"delete custom role\", \"remove permissions role\". Requires roleId. Cannot delete system roles. Users with this role will lose it."

4. **get-roles**
   - Original: "List all available roles"
   - Enhanced: "[Role Management] List all available roles in the system. Use when users say: \"list roles\", \"show all roles\", \"get roles\", \"what roles exist\", \"show permissions roles\". Returns both system and custom roles with their permissions. Supports pagination."

5. **get-role**
   - Original: "Get details of a specific role"
   - Enhanced: "[Role Management] Get detailed information about a specific role. Use when users say: \"show role details\", \"get role info\", \"what permissions does role have\", \"describe role\", \"role information\". Requires roleId. Returns full permission details."

6. **get-permissions**
   - Original: "List all available permissions that can be assigned to roles"
   - Enhanced: "[Role Management] List all available permissions in the system. Use when users say: \"list permissions\", \"show all permissions\", \"what permissions are available\", \"get permission list\", \"available role permissions\". Returns complete permission catalog with descriptions."

### [Webhook Management] - 6 tools

1. **list-webhook-events**
   - Original: "List all available webhook events that can be subscribed to"
   - Enhanced: "[Webhook Management] List all available webhook event types. Use when users say: \"list webhook events\", \"show available events\", \"what events can I subscribe to\", \"webhook event types\", \"available webhooks\". Returns complete catalog of subscribable events like room.created, session.ended, etc."

2. **list-webhooks**
   - Original: "List all configured webhooks"
   - Enhanced: "[Webhook Management] List all configured webhooks in your account. Use when users say: \"list webhooks\", \"show webhooks\", \"get all webhooks\", \"show webhook configurations\", \"active webhooks\". Returns webhook endpoints, subscribed events, and status. Supports pagination."

3. **create-webhook**
   - Original: "Create a new webhook"
   - Enhanced: "[Webhook Management] Create a new webhook endpoint subscription. Use when users say: \"create webhook\", \"add webhook\", \"subscribe to events\", \"set up webhook\", \"configure webhook notifications\". Requires endpoint URL and events array. Optional auth header for security."

4. **get-webhook**
   - Original: "Get details of a specific webhook"
   - Enhanced: "[Webhook Management] Get detailed information about a specific webhook. Use when users say: \"show webhook details\", \"get webhook info\", \"webhook configuration\", \"describe webhook\", \"webhook settings\". Requires webhookId. Returns endpoint, events, and configuration."

5. **update-webhook**
   - Original: "Update webhook configuration"
   - Enhanced: "[Webhook Management] Update webhook endpoint, events, or settings. Use when users say: \"update webhook\", \"change webhook URL\", \"modify webhook events\", \"edit webhook\", \"change webhook configuration\". Requires webhookId. Can update endpoint, name, events, or auth."

6. **delete-webhook**
   - Original: "Delete a webhook"
   - Enhanced: "[Webhook Management] Permanently delete a webhook subscription. Use when users say: \"delete webhook\", \"remove webhook\", \"unsubscribe webhook\", \"cancel webhook\", \"disable webhook\". Requires webhookId. Stops all future event deliveries to this endpoint."

## Best Practices for Future Tool Descriptions

When adding new tools, follow these guidelines:

1. **Start with category**: Always prefix with [Category Name] for grouping
2. **Include trigger phrases**: Add at least 5 common ways users might request the tool
3. **Be specific about requirements**: Clearly state which parameters are required vs optional
4. **Describe the outcome**: What does the tool return or accomplish?
5. **Add warnings**: For destructive operations, always note "cannot be undone"
6. **Differentiate similar tools**: When tools have similar functions, clearly explain the differences
7. **Use natural language**: Write descriptions as if explaining to a human, not a machine

## Implementation Notes

- All tool descriptions have been enhanced in their respective source files
- The enhancements maintain backward compatibility
- No changes to tool functionality, only descriptions
- Descriptions are designed to work with Claude Desktop's natural language understanding

## Testing Recommendations

To test the enhanced descriptions:

1. Try various phrasings for each tool category
2. Test ambiguous requests to see if the correct tool is selected
3. Verify that required parameters are properly identified
4. Check that destructive operations show appropriate warnings
5. Test similar tools to ensure proper differentiation

This enhancement should significantly improve the user experience when interacting with the Digital Samba MCP Server through Claude Desktop.
# Digital Samba API Documentation

This document contains the API documentation for Digital Samba's Embedded video conferencing platform.

## Base URL

```
https://api.digitalsamba.com
```

## Authentication

Authenticate requests by sending an Authorization header in the form `"Bearer {DEVELOPER_KEY}"`.
The value of `{DEVELOPER_KEY}` should be your team Developer key which you can find in the Team section of the dashboard.
Alternatively, you can use HTTP Basic authentication with username being your team ID and password being your developer key.

## Table of Contents

- [Default Room Settings](#default-room-settings)
- [Rooms](#rooms)
- [Live Sessions](#live-sessions)
- [Recordings](#recordings)
- [Webhooks](#webhooks)
- [Roles](#roles)
- [Permissions](#permissions)
- [Libraries](#libraries)
- [Participants](#participants)
- [Phone Participants](#phone-participants)
- [Polls](#polls)
- [Sessions](#sessions)
- [Statistics](#statistics)
- [Transcripts](#transcripts)

## Iframe Integration

Room URL has the following structure:
- **Public rooms**: `https://{team.domain}.digitalsamba.com/{room.friendly_url}`
- **Private rooms**: `https://{team.domain}.digitalsamba.com/{room.friendly_url}?token={jwtToken}`

**Note**: `{room.friendly_url}` can also be replaced by `{room.id}`.

To create `{jwtToken}` you need to generate a JWT token with HS256 algorithm, signed with `{team.developer_key}` as secret and a payload described below:

### Token Payload Structure

| Field | Type | Description |
|-------|------|-------------|
| `td` | string | The UUID of the team. |
| `rd` | string | The UUID of the room. |
| `ud` | string | (optional) External user identifier. |
| `u` | string | (optional) User name. If not provided the user will see a screen to input their name. |
| `role` | string | (optional) Role id or name. If not provided the default role will be used. |
| `avatar` | string | (optional) The URL of the user's avatar image. Will be used as image for user's tile when their video is disabled. |
| `iat` | timestamp | (optional) Token issued at timestamp. |
| `exp` | timestamp | (optional) Token expiration timestamp. |
| `nbf` | timestamp | (optional) Token not valid before timestamp. |

To embed the room on your page, you need to put an iframe with the following attributes:
```html
<iframe allow="camera; microphone; display-capture; autoplay;" src="{room_url}" allowfullscreen="true"></iframe>
```

## Default Room Settings

### Get Default Room Settings

```
GET /api/v1
```

Returns the default room settings for the team.

#### Response Example

```json
{
  "id": "fc16892a-556b-4c2d-a522-82e6b3e884cc",
  "owner_id": "57670ebd-0de2-4f92-8bce-661bec142dde",
  "domain": "local",
  "is_locked": false,
  "topbar_enabled": true,
  "toolbar_enabled": true,
  "toolbar_position": "bottom",
  "toolbar_color": "#000000",
  "primary_color": "#3771E0",
  "background_color": "#000000",
  "palette_mode": "light",
  "language": "en",
  "language_selection_enabled": true,
  // Additional properties omitted for brevity
}
```

### Update Default Room Settings

```
PATCH /api/v1
```

Updates the default room settings.

#### Request Body Parameters

The request body can include any of the room settings properties you want to update.

## Rooms

### Get All Team Rooms

```
GET /api/v1/rooms
```

Returns all rooms for the team.

#### Query Parameters

| Parameter | Description |
|-----------|-------------|
| `limit` | Limit the number of returned records. Used for pagination. Maximum and default is 100. |
| `offset` | The offset of the first item returned in the records collection. Used for pagination. |
| `order` | Order of returned records. Default is desc. |
| `after` | The UUID of the room or room friendly URL after which records will be returned. |

### Create a New Room

```
POST /api/v1/rooms
```

Creates a new room.

#### Request Body Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `description` | string | Room description. |
| `friendly_url` | string | Must be unique. Must be at least 3 characters. Must not be greater than 32 characters. |
| `privacy` | string | `public` or `private`. Public rooms can be joined using a room link. Private rooms require the room link to include a valid token. |
| `external_id` | string | Assign the room with an ID for integration on your side. |
| `default_role` | string | Role ID or name to be assigned to participants who join without a token. |
| `roles` | array | Array of role IDs or names for this room. |
| ... | ... | Many additional parameters for room configuration. |

### Get the Specified Room

```
GET /api/v1/rooms/{room}
```

Returns details about a specific room.

### Update Room

```
PATCH /api/v1/rooms/{room}
```

Updates a specific room.

### Delete Room

```
DELETE /api/v1/rooms/{room}
```

Deletes a specific room.

### Create Room Token

```
POST /api/v1/rooms/{room}/token
```

Generates a token for joining a room.

#### Request Body Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `ud` | string | External user identifier. |
| `u` | string | User name. |
| `initials` | string | Custom initials for user tiles. |
| `role` | string | Role ID or name. |
| `avatar` | string | The URL of the user's avatar image. |
| `nbf` | string | Not before - date time. |
| `exp` | string | Token expiration in minutes. |

## Live Sessions

### Get Rooms with Live Participants Count

```
GET /api/v1/rooms/live
```

Returns rooms that currently have active participants.

### Get Rooms with Live Participants Data

```
GET /api/v1/rooms/live/participants
```

Returns rooms with detailed information about current participants.

### Get Single Room with Live Participants Count

```
GET /api/v1/rooms/{room}/live
```

Returns participant count for a specific room.

### Get Single Room with Live Participants' Data

```
GET /api/v1/rooms/{room}/live/participants
```

Returns detailed information about participants in a specific room.

## Recordings

### Get All Team Recordings

```
GET /api/v1/recordings
```

Returns all recordings for the team.

#### Query Parameters

| Parameter | Description |
|-----------|-------------|
| `room_id` | Filter by room ID. |
| `session_id` | Filter by session ID. |
| `status` | Filter by recording status (IN_PROGRESS, PENDING_CONVERSION, READY). |
| `limit`, `offset`, `order`, `after` | Pagination parameters. |

### Get Archived Team Recordings

```
GET /api/v1/recordings/archived
```

Returns archived recordings.

### Get the Specified Recording

```
GET /api/v1/recordings/{recording}
```

Returns details about a specific recording.

### Delete Recording

```
DELETE /api/v1/recordings/{recording}
```

Deletes a specific recording.

### Download the Specified Recording

```
GET /api/v1/recordings/{recording}/download
```

Returns a download link for a recording.

### Archive/Unarchive Recording

```
POST /api/v1/recordings/{recording}/archive
POST /api/v1/recordings/{recording}/unarchive
```

Archives or unarchives a recording.

### Start/Stop Recording

```
POST /api/v1/rooms/{room}/recordings/start
POST /api/v1/rooms/{room}/recordings/stop
```

Starts or stops recording for a room.

## Webhooks

### Get Available Events Used for Triggering Webhooks

```
GET /api/v1/events
```

Returns all available event types that can trigger webhooks.

### Get Webhooks for the Team

```
GET /api/v1/webhooks
```

Returns all webhooks for the team.

### Create a New Webhook

```
POST /api/v1/webhooks
```

Creates a new webhook.

#### Request Body Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `endpoint` | string | The webhook URL endpoint. |
| `name` | string | Name for the webhook. |
| `authorization_header` | string | Authorization header to be sent with webhook requests. |
| `events` | array | Event names for which the webhook will be triggered. |

### Get/Update/Delete the Specified Webhook

```
GET/PATCH/DELETE /api/v1/webhooks/{webhook}
```

Gets, updates, or deletes a specific webhook.

## Roles

### Get Available Roles for the Team

```
GET /api/v1/roles
```

Returns all available roles for the team.

### Create a New Role

```
POST /api/v1/roles
```

Creates a new role.

#### Request Body Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `name` | string | Role name. Must contain only letters, numbers, dashes and underscores. |
| `display_name` | string | Display name for the role. |
| `description` | string | (optional) Role description. |
| `permissions` | object | Object containing permission settings. |

### Get/Update/Delete the Specified Role

```
GET/PATCH/DELETE /api/v1/roles/{role}
```

Gets, updates, or deletes a specific role.

## Permissions

### Get Available Permissions for Roles

```
GET /api/v1/permissions
```

Returns all available permissions that can be assigned to roles.

## Libraries

### Get Available Libraries for the Team

```
GET /api/v1/libraries
```

Returns all content libraries for the team.

### Create a New Library

```
POST /api/v1/libraries
```

Creates a new content library.

### Get/Update/Delete the Specified Library

```
GET/PATCH/DELETE /api/v1/libraries/{library}
```

Gets, updates, or deletes a specific library.

### Get the Specified Library Hierarchy

```
GET /api/v1/libraries/{library}/hierarchy
```

Returns the folder hierarchy for a library.

### Folders and Files

```
GET/POST /api/v1/libraries/{library}/folders
GET/PATCH/DELETE /api/v1/libraries/{library}/folders/{folder}
GET/POST /api/v1/libraries/{library}/files
GET/PATCH/DELETE /api/v1/libraries/{library}/files/{file}
GET /api/v1/libraries/{library}/files/{file}/links
```

Endpoints for managing library folders and files.

## Participants

### Get All Participants

```
GET /api/v1/participants
```

Returns all participants across all rooms.

### Get Participant Statistics

```
GET /api/v1/participants/{participant}
```

Returns statistics for a specific participant.

### Get All Room Participants

```
GET /api/v1/rooms/{room}/participants
```

Returns all participants for a specific room.

### Get All Session Participants

```
GET /api/v1/sessions/{session}/participants
```

Returns all participants for a specific session.

## Phone Participants

### Phone Participants Joined/Left

```
POST /api/v1/rooms/{room}/phone-participants/joined
POST /api/v1/rooms/{room}/phone-participants/left
```

Notifies about phone participants joining or leaving a room.

## Polls

### Get Available Polls for the Room

```
GET /api/v1/rooms/{room}/polls
```

Returns polls for a room.

### Create a New Poll

```
POST /api/v1/rooms/{room}/polls
```

Creates a new poll in a room.

### Get/Update/Delete the Specified Poll

```
GET/PATCH/DELETE /api/v1/rooms/{room}/polls/{poll}
```

Gets, updates, or deletes a specific poll.

### Poll Results

```
GET /api/v1/rooms/{room}/polls/{poll}/results
```

Returns results for a specific poll.

### Export Polls

```
GET /api/v1/rooms/{room}/polls/export
```

Exports all polls for a room.

## Sessions

### Get All Sessions

```
GET /api/v1/sessions
```

Returns all sessions.

### Get All Room Sessions

```
GET /api/v1/rooms/{room}/sessions
```

Returns all sessions for a specific room.

### Get Session Statistics

```
GET /api/v1/sessions/{session}
```

Returns statistics for a specific session.

### End the Specified Live Session

```
POST /api/v1/sessions/{session}/end
```

Ends a currently live session.

### Get Session Summary

```
GET /api/v1/sessions/{session}/summary
```

Returns a summary of a session.

### Get/Export Session Transcripts

```
GET /api/v1/sessions/{session}/transcripts
GET /api/v1/sessions/{session}/transcripts/export
```

Returns or exports transcripts for a session.

### Delete Session Data

```
DELETE /api/v1/sessions/{session}/chat
DELETE /api/v1/sessions/{session}/questions
DELETE /api/v1/sessions/{session}/summaries
DELETE /api/v1/sessions/{session}/transcripts
DELETE /api/v1/sessions/{session}/polls
DELETE /api/v1/sessions/{session}/recordings
DELETE /api/v1/sessions/{session}/resources
```

Deletes various types of session data.

## Statistics

### Get Team Global Statistics by Period

```
GET /api/v1/statistics
```

Returns team statistics for a specified period.

#### Query Parameters

| Parameter | Description |
|-----------|-------------|
| `date_start` | Period start date in Y-m-d format. |
| `date_end` | Period end date in Y-m-d format. |
| `metrics` | Comma-separated list of metrics to include. |

### Get Team Global Statistics by Current Period

```
GET /api/v1/statistics/team/current
```

Returns team statistics for the current period.

### Get Team Statistics for Current Period

```
GET /api/v1/statistics/current
```

Returns simplified team statistics for the current period.

### Get Room Statistics

```
GET /api/v1/rooms/{room}/statistics
GET /api/v1/rooms/{room}/statistics/current
```

Returns statistics for a specific room, either for a specified period or the current period.

## Transcripts

### Start/Stop Transcription

```
POST /api/v1/rooms/{room}/transcription/start
POST /api/v1/rooms/{room}/transcription/stop
```

Starts or stops transcription for a room.

## Chat and Q&A

```
GET /api/v1/rooms/{room}/chat
GET /api/v1/rooms/{room}/chat/export
DELETE /api/v1/rooms/{room}/chat
GET /api/v1/rooms/{room}/questions
GET /api/v1/rooms/{room}/questions/export
DELETE /api/v1/rooms/{room}/questions
```

Endpoints for managing chat messages and Q&A.

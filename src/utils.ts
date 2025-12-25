/**
 * Utility functions for the Digital Samba MCP Server
 *
 * @module utils
 */

/**
 * Normalize a value to a boolean.
 *
 * AI assistants (like Claude) sometimes send 0/1 or "true"/"false" strings
 * instead of proper boolean values. This function normalizes these to
 * native JavaScript booleans for the API.
 *
 * @param value - The value to normalize (boolean, number, or string)
 * @returns The normalized boolean value, or undefined if not a boolean-like value
 */
export function normalizeBoolean(value: unknown): boolean | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  // Already a boolean
  if (typeof value === "boolean") {
    return value;
  }

  // Numeric 0/1
  if (typeof value === "number") {
    if (value === 0) return false;
    if (value === 1) return true;
    return undefined;
  }

  // String representations
  if (typeof value === "string") {
    const lower = value.toLowerCase().trim();
    if (lower === "true" || lower === "1" || lower === "yes") return true;
    if (lower === "false" || lower === "0" || lower === "no") return false;
    return undefined;
  }

  return undefined;
}

/**
 * List of known boolean field names in the Digital Samba API.
 * These fields should have their values normalized before sending to the API.
 */
export const BOOLEAN_FIELDS = new Set([
  // Room settings
  "is_locked",
  "isLocked",
  "topbar_enabled",
  "topbarEnabled",
  "toolbar_enabled",
  "toolbarEnabled",
  "language_selection_enabled",
  "languageSelectionEnabled",
  "audio_on_join_enabled",
  "audioOnJoinEnabled",
  "video_on_join_enabled",
  "videoOnJoinEnabled",
  "screenshare_enabled",
  "screenshareEnabled",
  "participants_list_enabled",
  "participantsListEnabled",
  "chat_enabled",
  "chatEnabled",
  "private_chat_enabled",
  "privateChatEnabled",
  "recordings_enabled",
  "recordingsEnabled",
  "recording_autostart_enabled",
  "recordingAutostartEnabled",
  "polls_enabled",
  "pollsEnabled",
  "qa_enabled",
  "qaEnabled",
  "transcription_enabled",
  "transcriptionEnabled",
  "captions_enabled",
  "captionsEnabled",
  "captions_in_recording_enabled",
  "captionsInRecordingEnabled",
  "breakout_rooms_enabled",
  "breakoutRoomsEnabled",
  "raise_hand_enabled",
  "raiseHandEnabled",
  "e2ee_enabled",
  "e2eeEnabled",
  "consent_message_enabled",
  "consentMessageEnabled",
  "files_panel_enabled",
  "filesPanelEnabled",
  "virtual_backgrounds_enabled",
  "virtualBackgroundsEnabled",
  "minimize_own_tile_enabled",
  "minimizeOwnTileEnabled",
  "pip_enabled",
  "pipEnabled",
  "hide_tiles_enabled",
  "hideTilesEnabled",
  "simple_notifications_enabled",
  "simpleNotificationsEnabled",
  "sounds_enabled",
  "soundsEnabled",
  // Breakout room settings
  "auto_assign",
  "autoAssign",
  // Poll settings
  "multiple_answers",
  "multipleAnswers",
  // Other settings that may have boolean values
  "live",
]);

/**
 * Normalize boolean values in an object.
 *
 * Iterates through the object and normalizes any known boolean fields
 * from 0/1 or string representations to proper booleans.
 *
 * @param obj - The object containing parameters to normalize
 * @returns A new object with normalized boolean values
 */
export function normalizeBooleans<T extends Record<string, unknown>>(
  obj: T
): T {
  const result = { ...obj } as Record<string, unknown>;

  for (const [key, value] of Object.entries(result)) {
    // Check if this is a known boolean field
    if (BOOLEAN_FIELDS.has(key)) {
      const normalized = normalizeBoolean(value);
      if (normalized !== undefined) {
        result[key] = normalized;
      }
    }
    // Also normalize nested objects (like settings)
    else if (value && typeof value === "object" && !Array.isArray(value)) {
      result[key] = normalizeBooleans(value as Record<string, unknown>);
    }
  }

  return result as T;
}

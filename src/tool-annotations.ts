/**
 * Tool Annotations Utility
 *
 * Generates MCP tool annotations based on tool name patterns.
 * Annotations help AI assistants understand tool behavior and safety characteristics.
 *
 * @module tool-annotations
 */

/**
 * Tool annotation hints as defined by MCP specification
 */
export interface ToolAnnotations {
  /** Human-readable title for the tool */
  title?: string;
  /** Tool does not modify any state (safe to call without side effects) */
  readOnlyHint?: boolean;
  /** Tool performs potentially destructive/irreversible operations */
  destructiveHint?: boolean;
  /** Tool can be safely called multiple times with the same result */
  idempotentHint?: boolean;
  /** Tool interacts with external systems outside the server's control */
  openWorldHint?: boolean;
}

/**
 * Generate annotations for a tool based on its name pattern
 *
 * Annotation rules:
 * - list-*, get-*: readOnly, idempotent (read operations)
 * - create-*: not readOnly, not idempotent (creates new resources)
 * - update-*: not readOnly, idempotent (updates are repeatable)
 * - delete-*, hard-delete-*, bulk-delete-*: destructive (irreversible)
 * - All tools: openWorld (interact with Digital Samba API)
 *
 * @param toolName - The name of the tool
 * @param title - Optional human-readable title
 * @returns Tool annotations object
 */
export function getToolAnnotations(toolName: string, title?: string): ToolAnnotations {
  const annotations: ToolAnnotations = {
    openWorldHint: true, // All tools interact with external Digital Samba API
  };

  if (title) {
    annotations.title = title;
  }

  // Read-only operations (list, get, export)
  if (
    toolName.startsWith("list-") ||
    toolName.startsWith("get-") ||
    toolName.startsWith("export-")
  ) {
    annotations.readOnlyHint = true;
    annotations.destructiveHint = false;
    annotations.idempotentHint = true;
    return annotations;
  }

  // Destructive operations (delete, hard-delete, bulk-delete)
  if (
    toolName.startsWith("delete-") ||
    toolName.startsWith("hard-delete-") ||
    toolName.startsWith("bulk-delete-")
  ) {
    annotations.readOnlyHint = false;
    annotations.destructiveHint = true;
    annotations.idempotentHint = false;
    return annotations;
  }

  // Create operations
  if (toolName.startsWith("create-")) {
    annotations.readOnlyHint = false;
    annotations.destructiveHint = false;
    annotations.idempotentHint = false;
    return annotations;
  }

  // Update operations (idempotent - same input produces same result)
  if (toolName.startsWith("update-")) {
    annotations.readOnlyHint = false;
    annotations.destructiveHint = false;
    annotations.idempotentHint = true;
    return annotations;
  }

  // Start/stop operations (state changes, not idempotent)
  if (toolName.startsWith("start-") || toolName.startsWith("stop-")) {
    annotations.readOnlyHint = false;
    annotations.destructiveHint = false;
    annotations.idempotentHint = false;
    return annotations;
  }

  // Generate token (creates new resource each time)
  if (toolName === "generate-token") {
    annotations.readOnlyHint = false;
    annotations.destructiveHint = false;
    annotations.idempotentHint = false;
    return annotations;
  }

  // Archive/unarchive operations (reversible state changes)
  if (toolName.startsWith("archive-") || toolName.startsWith("unarchive-")) {
    annotations.readOnlyHint = false;
    annotations.destructiveHint = false;
    annotations.idempotentHint = true;
    return annotations;
  }

  // End session (destructive - ends live session)
  if (toolName === "end-session") {
    annotations.readOnlyHint = false;
    annotations.destructiveHint = true;
    annotations.idempotentHint = false;
    return annotations;
  }

  // Phone participant operations (state changes)
  if (toolName.startsWith("phone-participants-")) {
    annotations.readOnlyHint = false;
    annotations.destructiveHint = false;
    annotations.idempotentHint = false;
    return annotations;
  }

  // Default: assume write operation, not destructive, not idempotent
  annotations.readOnlyHint = false;
  annotations.destructiveHint = false;
  annotations.idempotentHint = false;

  return annotations;
}

/**
 * Helper to add annotations to a tool definition object
 *
 * @param tool - Tool definition object with name property
 * @returns Tool definition with annotations added
 */
export function withAnnotations<T extends { name: string }>(tool: T): T & { annotations: ToolAnnotations } {
  return {
    ...tool,
    annotations: getToolAnnotations(tool.name),
  };
}

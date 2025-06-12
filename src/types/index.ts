/**
 * Digital Samba API Type Definitions
 * 
 * This module exports all type definitions used throughout the Digital Samba MCP Server.
 * Types are organized by functional area for better maintainability.
 *
 * @module types
 */

// Common/Base types
export * from './common.js';

// Domain-specific types
export * from './room.js';
export * from './session.js';
export * from './participant.js';
export * from './recording.js';
export * from './communication.js';
export * from './content.js';
export * from './webhook.js';
export * from './role.js';

// Analytics types (already exist)
export * from './analytics.js';

// Re-export analytics resource class for compatibility
export { AnalyticsResource } from './analytics-resource.js';
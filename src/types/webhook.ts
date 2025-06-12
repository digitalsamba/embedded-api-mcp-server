/**
 * Webhook-related types and interfaces for the Digital Samba API
 *
 * @module types/webhook
 */

// Webhook related interfaces
export interface Webhook {
  id: string;
  endpoint: string;
  authorization_header?: string;
  name?: string;
  events?: string[];
  created_at: string;
  updated_at: string;
}

export interface WebhookCreateSettings {
  endpoint: string;
  name?: string;
  authorization_header?: string;
  events: string[];
}
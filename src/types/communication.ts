/**
 * Communication-related types and interfaces for the Digital Samba API
 * Includes polls, chat, Q&A, and other interactive features
 *
 * @module types/communication
 */

// Poll related interfaces
export interface Poll {
  id: string;
  question: string;
  status: string;
  multiple: boolean;
  anonymous: boolean;
  options: PollOption[];
  created_at: string;
}

export interface PollOption {
  id: string;
  text: string;
}

export interface PollCreateSettings {
  question: string;
  multiple?: boolean;
  anonymous?: boolean;
  options: { text: string }[];
}
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

// Quiz related interfaces
export interface QuizChoice {
  id?: string;
  text: string;
  correct: boolean;
}

export interface QuizQuestion {
  id?: string;
  question: string;
  choices: QuizChoice[];
}

export interface Quiz {
  id: string;
  title: string;
  time_limit_minutes?: number;
  questions: QuizQuestion[];
  created_at: string;
}

export interface QuizCreateSettings {
  title: string;
  time_limit_minutes?: number;
  questions: QuizQuestion[];
}

export interface QuizResult {
  id: string;
  session_id: string;
  quiz_id: string;
  participant_id: string;
  participant_name: string;
  score: number;
  total_questions: number;
  answers: {
    question_id: string;
    choice_id: string;
    correct: boolean;
  }[];
  completed_at: string;
}

// Restreamer related interfaces
export interface RestreamerOptions {
  type?: "youtube" | "vimeo" | "cloudflare";
  server_url?: string;
  stream_key: string;
}
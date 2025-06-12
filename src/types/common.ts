/**
 * Common types and interfaces used throughout the Digital Samba API
 *
 * @module types/common
 */

// Base interfaces
export interface PaginationParams {
  limit?: number;
  offset?: number;
  order?: "asc" | "desc";
  after?: string;
}

export interface DateRangeParams {
  date_start?: string; // Format: 'YYYY-MM-DD'
  date_end?: string; // Format: 'YYYY-MM-DD'
}

export interface ApiResponse<T> {
  data: T[];
  total_count: string | number;
  // Add these properties for compatibility
  length: number;
  map: <U>(callback: (value: T, index: number, array: T[]) => U) => U[];
}
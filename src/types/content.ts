/**
 * Content library types and interfaces for the Digital Samba API
 *
 * @module types/content
 */

// Library related interfaces
export interface Library {
  id: string;
  external_id?: string;
  name: string;
  created_at: string;
}

export interface LibraryFolder {
  id: string;
  name?: string;
  parent_id?: string;
  external_id?: string;
  description?: string;
  created_at: string;
}

export interface LibraryFile {
  id: string;
  folder_id?: string;
  name: string;
  type: string;
  size: number;
  created_at: string;
  /** Present on webapp entries (type `youtube`, `custom`, …); absent on stored files. */
  url?: string;
}

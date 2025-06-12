/**
 * Role and permission types for the Digital Samba API
 *
 * @module types/role
 */

// Role and permission interfaces
export interface Role {
  id: string;
  name: string;
  display_name: string;
  description?: string;
  default: boolean;
  created_at: string;
  updated_at: string;
  permissions?: Record<string, any>;
}

export interface RoleCreateSettings {
  name: string;
  display_name: string;
  description?: string;
  permissions: Record<string, any>;
}
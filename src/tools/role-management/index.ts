/**
 * Digital Samba MCP Server - Role & Permission Management Tools
 * 
 * This module implements tools for managing roles and permissions in Digital Samba.
 * It provides MCP tools for creating, updating, deleting roles and managing permissions.
 * 
 * Tools provided:
 * - create-role: Create a new role with permissions
 * - update-role: Update an existing role
 * - delete-role: Delete a role
 * - get-roles: List all available roles
 * - get-role: Get specific role details
 * - get-permissions: List all available permissions
 * 
 * @module tools/role-management
 * @author Digital Samba Team
 * @version 1.0.0
 */

// External dependencies
import { z } from 'zod';

// MCP SDK imports
import { 
  ErrorCode, 
  McpError
} from '@modelcontextprotocol/sdk/types.js';

// Local modules
import { DigitalSambaApiClient } from '../../digital-samba-api.js';
import logger from '../../logger.js';

/**
 * Tool definition interface
 */
interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: any;
}

/**
 * Register role management tools
 * 
 * @returns {ToolDefinition[]} Array of tool definitions
 */
export function registerRoleTools(): ToolDefinition[] {
  return [
    {
      name: 'create-role',
      description: '[Role Management] Create a custom role with specific permissions. Use when users say: "create role", "add custom role", "make new role", "define permissions", "create user role". Requires name, display_name, and permissions object. Role names must use letters, numbers, dashes, underscores only.',
      inputSchema: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'Role name (must contain only letters, numbers, dashes and underscores)'
          },
          display_name: {
            type: 'string',
            description: 'Display name for the role'
          },
          description: {
            type: 'string',
            description: 'Optional description of the role'
          },
          permissions: {
            type: 'object',
            description: 'Object containing permission settings',
            additionalProperties: {
              type: 'boolean'
            }
          }
        },
        required: ['name', 'display_name', 'permissions']
      }
    },
    {
      name: 'update-role',
      description: '[Role Management] Update role settings, name, or permissions. Use when users say: "update role", "change permissions", "modify role", "edit role settings", "update role permissions". Requires roleId. Can update display name, description, or permission settings.',
      inputSchema: {
        type: 'object',
        properties: {
          roleId: {
            type: 'string',
            description: 'The ID or name of the role to update'
          },
          display_name: {
            type: 'string',
            description: 'New display name for the role'
          },
          description: {
            type: 'string',
            description: 'New description for the role'
          },
          permissions: {
            type: 'object',
            description: 'Updated permission settings',
            additionalProperties: {
              type: 'boolean'
            }
          }
        },
        required: ['roleId']
      }
    },
    {
      name: 'delete-role',
      description: '[Role Management] Permanently delete a custom role. Use when users say: "delete role", "remove role", "delete custom role", "remove permissions role". Requires roleId. Cannot delete system roles. Users with this role will lose it.',
      inputSchema: {
        type: 'object',
        properties: {
          roleId: {
            type: 'string',
            description: 'The ID or name of the role to delete'
          }
        },
        required: ['roleId']
      }
    },
    {
      name: 'get-roles',
      description: '[Role Management] List all available roles in the system. Use when users say: "list roles", "show all roles", "get roles", "what roles exist", "show permissions roles". Returns both system and custom roles with their permissions. Supports pagination.',
      inputSchema: {
        type: 'object',
        properties: {
          limit: {
            type: 'number',
            description: 'Maximum number of roles to return'
          },
          offset: {
            type: 'number',
            description: 'Number of roles to skip'
          }
        }
      }
    },
    {
      name: 'get-role',
      description: '[Role Management] Get detailed information about a specific role. Use when users say: "show role details", "get role info", "what permissions does role have", "describe role", "role information". Requires roleId. Returns full permission details.',
      inputSchema: {
        type: 'object',
        properties: {
          roleId: {
            type: 'string',
            description: 'The ID or name of the role'
          }
        },
        required: ['roleId']
      }
    },
    {
      name: 'get-permissions',
      description: '[Role Management] List all available permissions in the system. Use when users say: "list permissions", "show all permissions", "what permissions are available", "get permission list", "available role permissions". Returns complete permission catalog with descriptions.',
      inputSchema: {
        type: 'object',
        properties: {}
      }
    }
  ];
}

/**
 * Execute a role management tool
 * 
 * @param {string} toolName - Name of the tool to execute
 * @param {any} params - Tool parameters
 * @param {DigitalSambaApiClient} apiClient - API client instance
 * @returns {Promise<any>} Tool execution result
 */
export async function executeRoleTool(
  toolName: string,
  params: any,
  apiClient: DigitalSambaApiClient
): Promise<any> {
  switch (toolName) {
    case 'create-role':
      return handleCreateRole(params, apiClient);
    case 'update-role':
      return handleUpdateRole(params, apiClient);
    case 'delete-role':
      return handleDeleteRole(params, apiClient);
    case 'get-roles':
      return handleGetRoles(params, apiClient);
    case 'get-role':
      return handleGetRole(params, apiClient);
    case 'get-permissions':
      return handleGetPermissions(params, apiClient);
    default:
      throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${toolName}`);
  }
}

/**
 * Handle create role tool
 */
async function handleCreateRole(
  params: {
    name: string;
    display_name: string;
    description?: string;
    permissions: Record<string, boolean>;
  },
  apiClient: DigitalSambaApiClient
): Promise<any> {
  const { name, display_name, description, permissions } = params;
  
  if (!name || !display_name || !permissions) {
    return {
      content: [{ 
        type: 'text', 
        text: 'Name, display name, and permissions are required to create a role.'
      }],
      isError: true,
    };
  }
  
  logger.info('Creating new role', { name });
  
  try {
    const role = await apiClient.createRole({
      name,
      display_name,
      description,
      permissions
    });
    
    return {
      content: [{ 
        type: 'text', 
        text: `Successfully created role "${display_name}" with ID: ${role.id}`
      }],
    };
  } catch (error) {
    logger.error('Error creating role', { 
      name, 
      error: error instanceof Error ? error.message : String(error) 
    });
    
    const errorMessage = error instanceof Error ? error.message : String(error);
    let displayMessage = `Error creating role: ${errorMessage}`;
    
    if (errorMessage.includes('already exists')) {
      displayMessage = `A role with the name "${name}" already exists`;
    } else if (errorMessage.includes('Invalid permissions')) {
      displayMessage = 'One or more permissions are invalid. Use get-permissions to see available permissions.';
    }
    
    return {
      content: [{ 
        type: 'text', 
        text: displayMessage
      }],
      isError: true,
    };
  }
}

/**
 * Handle update role tool
 */
async function handleUpdateRole(
  params: {
    roleId: string;
    display_name?: string;
    description?: string;
    permissions?: Record<string, boolean>;
  },
  apiClient: DigitalSambaApiClient
): Promise<any> {
  const { roleId, ...updates } = params;
  
  if (!roleId) {
    return {
      content: [{ 
        type: 'text', 
        text: 'Role ID is required to update a role.'
      }],
      isError: true,
    };
  }
  
  if (Object.keys(updates).length === 0) {
    return {
      content: [{ 
        type: 'text', 
        text: 'No updates provided. Specify display_name, description, or permissions to update.'
      }],
      isError: true,
    };
  }
  
  logger.info('Updating role', { roleId, updates });
  
  try {
    const role = await apiClient.updateRole(roleId, updates);
    
    const updatedFields = Object.keys(updates).join(', ');
    
    return {
      content: [{ 
        type: 'text', 
        text: `Successfully updated role "${role.display_name}". Updated fields: ${updatedFields}`
      }],
    };
  } catch (error) {
    logger.error('Error updating role', { 
      roleId, 
      error: error instanceof Error ? error.message : String(error) 
    });
    
    const errorMessage = error instanceof Error ? error.message : String(error);
    let displayMessage = `Error updating role: ${errorMessage}`;
    
    if (errorMessage.includes('not found') || errorMessage.includes('404')) {
      displayMessage = `Role with ID "${roleId}" not found`;
    }
    
    return {
      content: [{ 
        type: 'text', 
        text: displayMessage
      }],
      isError: true,
    };
  }
}

/**
 * Handle delete role tool
 */
async function handleDeleteRole(
  params: { roleId: string },
  apiClient: DigitalSambaApiClient
): Promise<any> {
  const { roleId } = params;
  
  if (!roleId) {
    return {
      content: [{ 
        type: 'text', 
        text: 'Role ID is required to delete a role.'
      }],
      isError: true,
    };
  }
  
  logger.info('Deleting role', { roleId });
  
  try {
    await apiClient.deleteRole(roleId);
    
    return {
      content: [{ 
        type: 'text', 
        text: `Successfully deleted role with ID: ${roleId}`
      }],
    };
  } catch (error) {
    logger.error('Error deleting role', { 
      roleId, 
      error: error instanceof Error ? error.message : String(error) 
    });
    
    const errorMessage = error instanceof Error ? error.message : String(error);
    let displayMessage = `Error deleting role: ${errorMessage}`;
    
    if (errorMessage.includes('not found') || errorMessage.includes('404')) {
      displayMessage = `Role with ID "${roleId}" not found`;
    } else if (errorMessage.includes('in use')) {
      displayMessage = `Cannot delete role "${roleId}" because it is currently in use`;
    }
    
    return {
      content: [{ 
        type: 'text', 
        text: displayMessage
      }],
      isError: true,
    };
  }
}

/**
 * Handle get roles tool
 */
async function handleGetRoles(
  params: { limit?: number; offset?: number },
  apiClient: DigitalSambaApiClient
): Promise<any> {
  logger.info('Fetching roles', params);
  
  try {
    const roles = await apiClient.listRoles(params);
    
    const rolesList = roles.data.map(role => 
      `- ${role.display_name} (${role.name}): ${role.description || 'No description'}`
    ).join('\n');
    
    return {
      content: [{ 
        type: 'text', 
        text: `Found ${roles.total_count} roles:\n\n${rolesList}`
      }],
    };
  } catch (error) {
    logger.error('Error fetching roles', { 
      error: error instanceof Error ? error.message : String(error) 
    });
    
    return {
      content: [{ 
        type: 'text', 
        text: `Error fetching roles: ${error instanceof Error ? error.message : String(error)}`
      }],
      isError: true,
    };
  }
}

/**
 * Handle get role tool
 */
async function handleGetRole(
  params: { roleId: string },
  apiClient: DigitalSambaApiClient
): Promise<any> {
  const { roleId } = params;
  
  if (!roleId) {
    return {
      content: [{ 
        type: 'text', 
        text: 'Role ID is required to get role details.'
      }],
      isError: true,
    };
  }
  
  logger.info('Fetching role details', { roleId });
  
  try {
    const role = await apiClient.getRole(roleId);
    
    const permissionsList = Object.entries(role.permissions || {})
      .filter(([_, enabled]) => enabled)
      .map(([permission]) => `  - ${permission}`)
      .join('\n');
    
    return {
      content: [{ 
        type: 'text', 
        text: `Role Details:
Name: ${role.name}
Display Name: ${role.display_name}
Description: ${role.description || 'No description'}
ID: ${role.id}

Enabled Permissions:
${permissionsList || '  No permissions enabled'}`
      }],
    };
  } catch (error) {
    logger.error('Error fetching role', { 
      roleId, 
      error: error instanceof Error ? error.message : String(error) 
    });
    
    const errorMessage = error instanceof Error ? error.message : String(error);
    let displayMessage = `Error fetching role: ${errorMessage}`;
    
    if (errorMessage.includes('not found') || errorMessage.includes('404')) {
      displayMessage = `Role with ID "${roleId}" not found`;
    }
    
    return {
      content: [{ 
        type: 'text', 
        text: displayMessage
      }],
      isError: true,
    };
  }
}

/**
 * Handle get permissions tool
 */
async function handleGetPermissions(
  _params: {},
  apiClient: DigitalSambaApiClient
): Promise<any> {
  logger.info('Fetching available permissions');
  
  try {
    const permissions = await apiClient.listPermissions();
    
    const permissionsList = permissions.map(permission => {
      return `- ${permission}`;
    }).join('\n');
    
    return {
      content: [{ 
        type: 'text', 
        text: `Available Permissions:\n\n${permissionsList}`
      }],
    };
  } catch (error) {
    logger.error('Error fetching permissions', { 
      error: error instanceof Error ? error.message : String(error) 
    });
    
    return {
      content: [{ 
        type: 'text', 
        text: `Error fetching permissions: ${error instanceof Error ? error.message : String(error)}`
      }],
      isError: true,
    };
  }
}
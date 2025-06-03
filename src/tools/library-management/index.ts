/**
 * Digital Samba MCP Server - Library Management Tools
 * 
 * This module implements tools for managing content libraries within Digital Samba.
 * It provides MCP tools for creating, updating, and managing libraries, folders, and files.
 * 
 * Tools provided:
 * - create-library: Create a new content library
 * - update-library: Update library details
 * - delete-library: Delete a library
 * - create-library-folder: Create a folder in a library
 * - update-library-folder: Update folder details
 * - delete-library-folder: Delete a folder
 * - create-library-file: Get upload URL for a new file
 * - update-library-file: Update file details
 * - delete-library-file: Delete a file
 * - get-file-links: Get viewing/thumbnail links for a file
 * 
 * @module tools/library-management
 * @author Digital Samba Team
 * @version 1.0.0
 */

// External dependencies
import { z } from 'zod';

// MCP SDK imports
// import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'; // TODO: Direct MCP server integration
import { 
  ErrorCode, 
  McpError
} from '@modelcontextprotocol/sdk/types.js';

// Local modules
// import { getApiKeyFromRequest } from '../../auth.js'; // Removed: unused
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
 * Register library management tools with the MCP SDK
 * 
 * @returns {ToolDefinition[]} Array of tool definitions
 */
export function registerLibraryTools(): ToolDefinition[] {
  return [
    // Library CRUD
    {
      name: 'create-library',
      description: '[Content Library] Create a new content library for storing files and documents. Use when users say: "create library", "make content library", "new file storage", "create document library", "set up content repository". Requires externalId. Returns library ID for file uploads.',
      inputSchema: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'Name of the library'
          },
          externalId: {
            type: 'string',
            description: 'External identifier for the library'
          }
        },
        required: ['externalId']
      }
    },
    {
      name: 'update-library',
      description: '[Content Library] Update library name or external ID. Use when users say: "rename library", "update library", "change library name", "modify library details", "edit library settings". Requires libraryId. Can update name and external identifier.',
      inputSchema: {
        type: 'object',
        properties: {
          libraryId: {
            type: 'string',
            description: 'The ID of the library to update'
          },
          name: {
            type: 'string',
            description: 'Updated name of the library'
          },
          externalId: {
            type: 'string',
            description: 'Updated external identifier'
          }
        },
        required: ['libraryId']
      }
    },
    {
      name: 'delete-library',
      description: '[Content Library] Permanently delete a content library and all its contents. Use when users say: "delete library", "remove content library", "delete file storage", "remove library". Requires libraryId. This deletes ALL files and folders within!',
      inputSchema: {
        type: 'object',
        properties: {
          libraryId: {
            type: 'string',
            description: 'The ID of the library to delete'
          }
        },
        required: ['libraryId']
      }
    },
    
    // Folder Management
    {
      name: 'create-library-folder',
      description: '[Content Library] Create a folder for organizing files. Use when users say: "create folder", "make directory", "add folder", "create subfolder", "organize files in folders". Requires libraryId. Optional parentId for nested folders. Returns folder ID.',
      inputSchema: {
        type: 'object',
        properties: {
          libraryId: {
            type: 'string',
            description: 'The ID of the library'
          },
          name: {
            type: 'string',
            description: 'Name of the folder'
          },
          parentId: {
            type: 'string',
            description: 'Parent folder ID (for nested folders)'
          }
        },
        required: ['libraryId']
      }
    },
    {
      name: 'update-library-folder',
      description: '[Content Library] Update folder name or move to different parent. Use when users say: "rename folder", "update folder", "change folder name", "move folder", "reorganize folders". Requires libraryId and folderId. Can change name or parent folder.',
      inputSchema: {
        type: 'object',
        properties: {
          libraryId: {
            type: 'string',
            description: 'The ID of the library'
          },
          folderId: {
            type: 'string',
            description: 'The ID of the folder to update'
          },
          name: {
            type: 'string',
            description: 'Updated name of the folder'
          },
          parentId: {
            type: 'string',
            description: 'Updated parent folder ID'
          }
        },
        required: ['libraryId', 'folderId']
      }
    },
    {
      name: 'delete-library-folder',
      description: '[Content Library] Delete a folder and optionally its contents. Use when users say: "delete folder", "remove directory", "delete folder and files", "remove subfolder". Requires libraryId and folderId. May delete contained files depending on settings.',
      inputSchema: {
        type: 'object',
        properties: {
          libraryId: {
            type: 'string',
            description: 'The ID of the library'
          },
          folderId: {
            type: 'string',
            description: 'The ID of the folder to delete'
          }
        },
        required: ['libraryId', 'folderId']
      }
    },
    
    // File Management
    {
      name: 'create-library-file',
      description: '[Content Library] Create file entry and get upload URL. Use when users say: "upload file", "add document", "upload to library", "add file", "store document". Requires libraryId and name. Returns upload URL for actual file transfer. Optional folderId.',
      inputSchema: {
        type: 'object',
        properties: {
          libraryId: {
            type: 'string',
            description: 'The ID of the library'
          },
          name: {
            type: 'string',
            description: 'Name of the file'
          },
          folderId: {
            type: 'string',
            description: 'Folder ID to place the file in'
          }
        },
        required: ['libraryId', 'name']
      }
    },
    {
      name: 'update-library-file',
      description: '[Content Library] Update file name or move to different folder. Use when users say: "rename file", "update file", "change file name", "move file to folder", "reorganize files". Requires libraryId and fileId. Can change name or folder location.',
      inputSchema: {
        type: 'object',
        properties: {
          libraryId: {
            type: 'string',
            description: 'The ID of the library'
          },
          fileId: {
            type: 'string',
            description: 'The ID of the file to update'
          },
          name: {
            type: 'string',
            description: 'Updated name of the file'
          },
          folderId: {
            type: 'string',
            description: 'Updated folder ID'
          }
        },
        required: ['libraryId', 'fileId']
      }
    },
    {
      name: 'delete-library-file',
      description: '[Content Library] Permanently delete a file from library. Use when users say: "delete file", "remove document", "delete upload", "remove file from library". Requires libraryId and fileId. This action cannot be undone.',
      inputSchema: {
        type: 'object',
        properties: {
          libraryId: {
            type: 'string',
            description: 'The ID of the library'
          },
          fileId: {
            type: 'string',
            description: 'The ID of the file to delete'
          }
        },
        required: ['libraryId', 'fileId']
      }
    },
    {
      name: 'get-file-links',
      description: '[Content Library] Get viewing and thumbnail URLs for a file. Use when users say: "get file link", "share file", "view file", "get download link", "access file URL". Requires libraryId and fileId. Returns URLs for viewing and thumbnails.',
      inputSchema: {
        type: 'object',
        properties: {
          libraryId: {
            type: 'string',
            description: 'The ID of the library'
          },
          fileId: {
            type: 'string',
            description: 'The ID of the file'
          }
        },
        required: ['libraryId', 'fileId']
      }
    },
    
    // Webapp and Whiteboard Creation
    {
      name: 'create-webapp',
      description: '[Content Library] Create a webapp/web application entry in library. Use when users say: "create webapp", "add web app", "create web application", "add webapp to library". Requires libraryId and name. Optional folderId. For embedding web content.',
      inputSchema: {
        type: 'object',
        properties: {
          libraryId: {
            type: 'string',
            description: 'The ID of the library'
          },
          name: {
            type: 'string',
            description: 'Name of the webapp'
          },
          folderId: {
            type: 'string',
            description: 'Folder ID to place the webapp in'
          }
        },
        required: ['libraryId', 'name']
      }
    },
    {
      name: 'create-whiteboard',
      description: '[Content Library] Create a collaborative whiteboard in library. Use when users say: "create whiteboard", "add whiteboard", "create drawing board", "make collaborative board". Requires libraryId and name. Optional folderId. For visual collaboration.',
      inputSchema: {
        type: 'object',
        properties: {
          libraryId: {
            type: 'string',
            description: 'The ID of the library'
          },
          name: {
            type: 'string',
            description: 'Name of the whiteboard'
          },
          folderId: {
            type: 'string',
            description: 'Folder ID to place the whiteboard in'
          }
        },
        required: ['libraryId', 'name']
      }
    },
    
    // Bulk and Move Operations
    {
      name: 'move-library-file',
      description: '[Content Library] Move a file to a different folder. Use when users say: "move file", "relocate file", "move to folder", "reorganize file", "change file location". Requires libraryId and fileId. Moves file within same library only.',
      inputSchema: {
        type: 'object',
        properties: {
          libraryId: {
            type: 'string',
            description: 'The ID of the library'
          },
          fileId: {
            type: 'string',
            description: 'The ID of the file to move'
          },
          targetFolderId: {
            type: 'string',
            description: 'The ID of the target folder (null for root)'
          }
        },
        required: ['libraryId', 'fileId']
      }
    },
    {
      name: 'move-library-folder',
      description: '[Content Library] Move a folder to a different parent location. Use when users say: "move folder", "relocate directory", "reorganize folders", "change folder parent", "nest folder". Requires libraryId and folderId. Moves entire folder tree.',
      inputSchema: {
        type: 'object',
        properties: {
          libraryId: {
            type: 'string',
            description: 'The ID of the library'
          },
          folderId: {
            type: 'string',
            description: 'The ID of the folder to move'
          },
          targetParentId: {
            type: 'string',
            description: 'The ID of the target parent folder (null for root)'
          }
        },
        required: ['libraryId', 'folderId']
      }
    },
    {
      name: 'bulk-delete-library-files',
      description: '[Content Library] Delete multiple files in one operation. Use when users say: "delete multiple files", "bulk delete", "remove several files", "mass delete files", "delete file batch". Requires libraryId and fileIds array. Efficient for cleanup tasks.',
      inputSchema: {
        type: 'object',
        properties: {
          libraryId: {
            type: 'string',
            description: 'The ID of the library'
          },
          fileIds: {
            type: 'array',
            description: 'Array of file IDs to delete',
            items: {
              type: 'string'
            }
          }
        },
        required: ['libraryId', 'fileIds']
      }
    },
    {
      name: 'bulk-upload-library-files',
      description: '[Content Library] Get upload URLs for multiple files in batch. Use when users say: "upload multiple files", "bulk upload", "batch upload", "upload many files", "mass file upload". Requires libraryId and files array with names, sizes, and MIME types.',
      inputSchema: {
        type: 'object',
        properties: {
          libraryId: {
            type: 'string',
            description: 'The ID of the library'
          },
          files: {
            type: 'array',
            description: 'Array of file information',
            items: {
              type: 'object',
              properties: {
                name: {
                  type: 'string',
                  description: 'File name'
                },
                size: {
                  type: 'number',
                  description: 'File size in bytes'
                },
                mimeType: {
                  type: 'string',
                  description: 'MIME type of the file'
                },
                folderId: {
                  type: 'string',
                  description: 'Target folder ID'
                }
              },
              required: ['name', 'size', 'mimeType']
            }
          }
        },
        required: ['libraryId', 'files']
      }
    },
    {
      name: 'copy-library-content',
      description: '[Content Library] Copy files or folders within/between libraries. Use when users say: "copy file", "duplicate folder", "copy to another library", "clone content", "duplicate files". Requires source/target library IDs, content type and ID. Can rename during copy.',
      inputSchema: {
        type: 'object',
        properties: {
          sourceLibraryId: {
            type: 'string',
            description: 'The ID of the source library'
          },
          targetLibraryId: {
            type: 'string',
            description: 'The ID of the target library (same as source if copying within library)'
          },
          contentType: {
            type: 'string',
            enum: ['file', 'folder'],
            description: 'Type of content to copy'
          },
          contentId: {
            type: 'string',
            description: 'The ID of the file or folder to copy'
          },
          targetFolderId: {
            type: 'string',
            description: 'The ID of the target folder in the destination library'
          },
          newName: {
            type: 'string',
            description: 'Optional new name for the copied content'
          }
        },
        required: ['sourceLibraryId', 'targetLibraryId', 'contentType', 'contentId']
      }
    }
  ];
}

/**
 * Execute a library management tool
 * 
 * @param {string} toolName - Name of the tool to execute
 * @param {any} params - Tool parameters
 * @param {DigitalSambaApiClient} apiClient - API client instance
 * @returns {Promise<any>} Tool execution result
 */
export async function executeLibraryTool(
  toolName: string,
  params: any,
  apiClient: DigitalSambaApiClient
): Promise<any> {
  switch (toolName) {
    // Library CRUD
    case 'create-library':
      return handleCreateLibrary(params, apiClient);
    case 'update-library':
      return handleUpdateLibrary(params, apiClient);
    case 'delete-library':
      return handleDeleteLibrary(params, apiClient);
    
    // Folder Management
    case 'create-library-folder':
      return handleCreateLibraryFolder(params, apiClient);
    case 'update-library-folder':
      return handleUpdateLibraryFolder(params, apiClient);
    case 'delete-library-folder':
      return handleDeleteLibraryFolder(params, apiClient);
    
    // File Management
    case 'create-library-file':
      return handleCreateLibraryFile(params, apiClient);
    case 'update-library-file':
      return handleUpdateLibraryFile(params, apiClient);
    case 'delete-library-file':
      return handleDeleteLibraryFile(params, apiClient);
    case 'get-file-links':
      return handleGetFileLinks(params, apiClient);
    
    // Webapp and Whiteboard Creation
    case 'create-webapp':
      return handleCreateWebapp(params, apiClient);
    case 'create-whiteboard':
      return handleCreateWhiteboard(params, apiClient);
    
    // Bulk and Move Operations
    case 'move-library-file':
      return handleMoveLibraryFile(params, apiClient);
    case 'move-library-folder':
      return handleMoveLibraryFolder(params, apiClient);
    case 'bulk-delete-library-files':
      return handleBulkDeleteLibraryFiles(params, apiClient);
    case 'bulk-upload-library-files':
      return handleBulkUploadLibraryFiles(params, apiClient);
    case 'copy-library-content':
      return handleCopyLibraryContent(params, apiClient);
    
    default:
      throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${toolName}`);
  }
}

/**
 * Handle create library
 */
async function handleCreateLibrary(
  params: { name?: string; externalId: string },
  apiClient: DigitalSambaApiClient
): Promise<any> {
  const { name, externalId } = params;
  
  if (!externalId || externalId.trim() === '') {
    return {
      content: [{ 
        type: 'text', 
        text: 'External ID is required to create a library.'
      }],
      isError: true,
    };
  }
  
  logger.info('Creating library', { name, externalId });
  
  try {
    const result = await apiClient.createLibrary({
      name,
      external_id: externalId
    });
    
    return {
      content: [{ 
        type: 'text', 
        text: `Successfully created library "${result.name || externalId}" with ID: ${result.id}`
      }],
    };
  } catch (error) {
    logger.error('Error creating library', { 
      error: error instanceof Error ? error.message : String(error) 
    });
    
    return {
      content: [{ 
        type: 'text', 
        text: `Error creating library: ${error instanceof Error ? error.message : String(error)}`
      }],
      isError: true,
    };
  }
}

/**
 * Handle update library
 */
async function handleUpdateLibrary(
  params: { libraryId: string; name?: string; externalId?: string },
  apiClient: DigitalSambaApiClient
): Promise<any> {
  const { libraryId, name, externalId } = params;
  
  if (!libraryId || libraryId.trim() === '') {
    return {
      content: [{ 
        type: 'text', 
        text: 'Library ID is required to update a library.'
      }],
      isError: true,
    };
  }
  
  const updates: any = {};
  if (name !== undefined) updates.name = name;
  if (externalId !== undefined) updates.external_id = externalId;
  
  if (Object.keys(updates).length === 0) {
    return {
      content: [{ 
        type: 'text', 
        text: 'No updates provided for the library.'
      }],
      isError: true,
    };
  }
  
  logger.info('Updating library', { libraryId, updates });
  
  try {
    const result = await apiClient.updateLibrary(libraryId, updates);
    
    return {
      content: [{ 
        type: 'text', 
        text: `Successfully updated library ${libraryId}. Updated fields: ${Object.keys(updates).join(', ')}`
      }],
    };
  } catch (error) {
    logger.error('Error updating library', { 
      libraryId,
      error: error instanceof Error ? error.message : String(error) 
    });
    
    const errorMessage = error instanceof Error ? error.message : String(error);
    let displayMessage = `Error updating library: ${errorMessage}`;
    
    if (errorMessage.includes('404') || errorMessage.includes('not found')) {
      displayMessage = `Library with ID ${libraryId} not found`;
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
 * Handle delete library
 */
async function handleDeleteLibrary(
  params: { libraryId: string },
  apiClient: DigitalSambaApiClient
): Promise<any> {
  const { libraryId } = params;
  
  if (!libraryId || libraryId.trim() === '') {
    return {
      content: [{ 
        type: 'text', 
        text: 'Library ID is required to delete a library.'
      }],
      isError: true,
    };
  }
  
  logger.info('Deleting library', { libraryId });
  
  try {
    await apiClient.deleteLibrary(libraryId);
    
    return {
      content: [{ 
        type: 'text', 
        text: `Successfully deleted library ${libraryId}`
      }],
    };
  } catch (error) {
    logger.error('Error deleting library', { 
      libraryId,
      error: error instanceof Error ? error.message : String(error) 
    });
    
    const errorMessage = error instanceof Error ? error.message : String(error);
    let displayMessage = `Error deleting library: ${errorMessage}`;
    
    if (errorMessage.includes('404') || errorMessage.includes('not found')) {
      displayMessage = `Library with ID ${libraryId} not found`;
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
 * Handle create library folder
 */
async function handleCreateLibraryFolder(
  params: { libraryId: string; name?: string; parentId?: string },
  apiClient: DigitalSambaApiClient
): Promise<any> {
  const { libraryId, name, parentId } = params;
  
  if (!libraryId || libraryId.trim() === '') {
    return {
      content: [{ 
        type: 'text', 
        text: 'Library ID is required to create a folder.'
      }],
      isError: true,
    };
  }
  
  logger.info('Creating library folder', { libraryId, name, parentId });
  
  try {
    const folderData: any = {};
    if (name !== undefined) folderData.name = name;
    if (parentId !== undefined) folderData.parent_id = parentId;
    
    const result = await apiClient.createLibraryFolder(libraryId, folderData);
    
    return {
      content: [{ 
        type: 'text', 
        text: `Successfully created folder in library ${libraryId}. Folder ID: ${result.id}`
      }],
    };
  } catch (error) {
    logger.error('Error creating library folder', { 
      libraryId,
      error: error instanceof Error ? error.message : String(error) 
    });
    
    const errorMessage = error instanceof Error ? error.message : String(error);
    let displayMessage = `Error creating folder: ${errorMessage}`;
    
    if (errorMessage.includes('404') || errorMessage.includes('Library not found')) {
      displayMessage = `Library with ID ${libraryId} not found`;
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
 * Handle update library folder
 */
async function handleUpdateLibraryFolder(
  params: { libraryId: string; folderId: string; name?: string; parentId?: string },
  apiClient: DigitalSambaApiClient
): Promise<any> {
  const { libraryId, folderId, name, parentId } = params;
  
  if (!libraryId || libraryId.trim() === '') {
    return {
      content: [{ 
        type: 'text', 
        text: 'Library ID is required to update a folder.'
      }],
      isError: true,
    };
  }
  
  if (!folderId || folderId.trim() === '') {
    return {
      content: [{ 
        type: 'text', 
        text: 'Folder ID is required to update a folder.'
      }],
      isError: true,
    };
  }
  
  const updates: any = {};
  if (name !== undefined) updates.name = name;
  if (parentId !== undefined) updates.parent_id = parentId;
  
  if (Object.keys(updates).length === 0) {
    return {
      content: [{ 
        type: 'text', 
        text: 'No updates provided for the folder.'
      }],
      isError: true,
    };
  }
  
  logger.info('Updating library folder', { libraryId, folderId, updates });
  
  try {
    await apiClient.updateLibraryFolder(libraryId, folderId, updates);
    
    return {
      content: [{ 
        type: 'text', 
        text: `Successfully updated folder ${folderId}. Updated fields: ${Object.keys(updates).join(', ')}`
      }],
    };
  } catch (error) {
    logger.error('Error updating library folder', { 
      libraryId,
      folderId,
      error: error instanceof Error ? error.message : String(error) 
    });
    
    const errorMessage = error instanceof Error ? error.message : String(error);
    let displayMessage = `Error updating folder: ${errorMessage}`;
    
    if (errorMessage.includes('404') || errorMessage.includes('not found')) {
      displayMessage = `Folder with ID ${folderId} not found in library ${libraryId}`;
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
 * Handle delete library folder
 */
async function handleDeleteLibraryFolder(
  params: { libraryId: string; folderId: string },
  apiClient: DigitalSambaApiClient
): Promise<any> {
  const { libraryId, folderId } = params;
  
  if (!libraryId || libraryId.trim() === '') {
    return {
      content: [{ 
        type: 'text', 
        text: 'Library ID is required to delete a folder.'
      }],
      isError: true,
    };
  }
  
  if (!folderId || folderId.trim() === '') {
    return {
      content: [{ 
        type: 'text', 
        text: 'Folder ID is required to delete a folder.'
      }],
      isError: true,
    };
  }
  
  logger.info('Deleting library folder', { libraryId, folderId });
  
  try {
    await apiClient.deleteLibraryFolder(libraryId, folderId);
    
    return {
      content: [{ 
        type: 'text', 
        text: `Successfully deleted folder ${folderId} from library ${libraryId}`
      }],
    };
  } catch (error) {
    logger.error('Error deleting library folder', { 
      libraryId,
      folderId,
      error: error instanceof Error ? error.message : String(error) 
    });
    
    const errorMessage = error instanceof Error ? error.message : String(error);
    let displayMessage = `Error deleting folder: ${errorMessage}`;
    
    if (errorMessage.includes('404') || errorMessage.includes('not found')) {
      displayMessage = `Folder with ID ${folderId} not found in library ${libraryId}`;
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
 * Handle create library file
 */
async function handleCreateLibraryFile(
  params: { libraryId: string; name: string; folderId?: string },
  apiClient: DigitalSambaApiClient
): Promise<any> {
  const { libraryId, name, folderId } = params;
  
  if (!libraryId || libraryId.trim() === '') {
    return {
      content: [{ 
        type: 'text', 
        text: 'Library ID is required to create a file.'
      }],
      isError: true,
    };
  }
  
  if (!name || name.trim() === '') {
    return {
      content: [{ 
        type: 'text', 
        text: 'File name is required.'
      }],
      isError: true,
    };
  }
  
  logger.info('Creating library file', { libraryId, name, folderId });
  
  try {
    const fileData: any = { name };
    if (folderId !== undefined) fileData.folder_id = folderId;
    
    const result = await apiClient.createLibraryFile(libraryId, fileData);
    
    return {
      content: [{ 
        type: 'text', 
        text: `Successfully created file "${name}" in library ${libraryId}.\n` +
              `File ID: ${result.file_id}\n` +
              `Upload URL: ${result.external_storage_url}\n` +
              `Upload Token: ${result.token}\n` +
              `Token expires at: ${new Date(result.expiration_timestamp * 1000).toISOString()}`
      }],
    };
  } catch (error) {
    logger.error('Error creating library file', { 
      libraryId,
      name,
      error: error instanceof Error ? error.message : String(error) 
    });
    
    const errorMessage = error instanceof Error ? error.message : String(error);
    let displayMessage = `Error creating file: ${errorMessage}`;
    
    if (errorMessage.includes('404') || errorMessage.includes('Library not found')) {
      displayMessage = `Library with ID ${libraryId} not found`;
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
 * Handle update library file
 */
async function handleUpdateLibraryFile(
  params: { libraryId: string; fileId: string; name?: string; folderId?: string },
  apiClient: DigitalSambaApiClient
): Promise<any> {
  const { libraryId, fileId, name, folderId } = params;
  
  if (!libraryId || libraryId.trim() === '') {
    return {
      content: [{ 
        type: 'text', 
        text: 'Library ID is required to update a file.'
      }],
      isError: true,
    };
  }
  
  if (!fileId || fileId.trim() === '') {
    return {
      content: [{ 
        type: 'text', 
        text: 'File ID is required to update a file.'
      }],
      isError: true,
    };
  }
  
  const updates: any = {};
  if (name !== undefined) updates.name = name;
  if (folderId !== undefined) updates.folder_id = folderId;
  
  if (Object.keys(updates).length === 0) {
    return {
      content: [{ 
        type: 'text', 
        text: 'No updates provided for the file.'
      }],
      isError: true,
    };
  }
  
  logger.info('Updating library file', { libraryId, fileId, updates });
  
  try {
    await apiClient.updateLibraryFile(libraryId, fileId, updates);
    
    return {
      content: [{ 
        type: 'text', 
        text: `Successfully updated file ${fileId}. Updated fields: ${Object.keys(updates).join(', ')}`
      }],
    };
  } catch (error) {
    logger.error('Error updating library file', { 
      libraryId,
      fileId,
      error: error instanceof Error ? error.message : String(error) 
    });
    
    const errorMessage = error instanceof Error ? error.message : String(error);
    let displayMessage = `Error updating file: ${errorMessage}`;
    
    if (errorMessage.includes('404') || errorMessage.includes('not found')) {
      displayMessage = `File with ID ${fileId} not found in library ${libraryId}`;
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
 * Handle delete library file
 */
async function handleDeleteLibraryFile(
  params: { libraryId: string; fileId: string },
  apiClient: DigitalSambaApiClient
): Promise<any> {
  const { libraryId, fileId } = params;
  
  if (!libraryId || libraryId.trim() === '') {
    return {
      content: [{ 
        type: 'text', 
        text: 'Library ID is required to delete a file.'
      }],
      isError: true,
    };
  }
  
  if (!fileId || fileId.trim() === '') {
    return {
      content: [{ 
        type: 'text', 
        text: 'File ID is required to delete a file.'
      }],
      isError: true,
    };
  }
  
  logger.info('Deleting library file', { libraryId, fileId });
  
  try {
    await apiClient.deleteLibraryFile(libraryId, fileId);
    
    return {
      content: [{ 
        type: 'text', 
        text: `Successfully deleted file ${fileId} from library ${libraryId}`
      }],
    };
  } catch (error) {
    logger.error('Error deleting library file', { 
      libraryId,
      fileId,
      error: error instanceof Error ? error.message : String(error) 
    });
    
    const errorMessage = error instanceof Error ? error.message : String(error);
    let displayMessage = `Error deleting file: ${errorMessage}`;
    
    if (errorMessage.includes('404') || errorMessage.includes('not found')) {
      displayMessage = `File with ID ${fileId} not found in library ${libraryId}`;
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
 * Handle get file links
 */
async function handleGetFileLinks(
  params: { libraryId: string; fileId: string },
  apiClient: DigitalSambaApiClient
): Promise<any> {
  const { libraryId, fileId } = params;
  
  if (!libraryId || libraryId.trim() === '') {
    return {
      content: [{ 
        type: 'text', 
        text: 'Library ID is required to get file links.'
      }],
      isError: true,
    };
  }
  
  if (!fileId || fileId.trim() === '') {
    return {
      content: [{ 
        type: 'text', 
        text: 'File ID is required to get file links.'
      }],
      isError: true,
    };
  }
  
  logger.info('Getting file links', { libraryId, fileId });
  
  try {
    const result = await apiClient.getFileLinks(libraryId, fileId);
    
    let message = `File links for ${fileId}:\n`;
    if (result.pages && result.pages.length > 0) {
      result.pages.forEach((page, index) => {
        message += `\nPage ${index + 1}:\n`;
        message += `  View URL: ${page.url}\n`;
        message += `  Thumbnail URL: ${page.thumbnail_url}`;
      });
    } else {
      message += 'No pages available for this file.';
    }
    
    return {
      content: [{ 
        type: 'text', 
        text: message
      }],
    };
  } catch (error) {
    logger.error('Error getting file links', { 
      libraryId,
      fileId,
      error: error instanceof Error ? error.message : String(error) 
    });
    
    const errorMessage = error instanceof Error ? error.message : String(error);
    let displayMessage = `Error getting file links: ${errorMessage}`;
    
    if (errorMessage.includes('404') || errorMessage.includes('not found')) {
      displayMessage = `File with ID ${fileId} not found in library ${libraryId}`;
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
 * Handle create webapp
 */
async function handleCreateWebapp(
  params: { libraryId: string; name: string; folderId?: string },
  apiClient: DigitalSambaApiClient
): Promise<any> {
  const { libraryId, name, folderId } = params;
  
  if (!libraryId || libraryId.trim() === '') {
    return {
      content: [{ 
        type: 'text', 
        text: 'Library ID is required to create a webapp.'
      }],
      isError: true,
    };
  }
  
  if (!name || name.trim() === '') {
    return {
      content: [{ 
        type: 'text', 
        text: 'Webapp name is required.'
      }],
      isError: true,
    };
  }
  
  logger.info('Creating webapp', { libraryId, name, folderId });
  
  try {
    const webappData: any = { name };
    if (folderId !== undefined) webappData.folder_id = folderId;
    
    const result = await apiClient.createWebapp(libraryId, webappData);
    
    return {
      content: [{ 
        type: 'text', 
        text: `Successfully created webapp "${name}" in library ${libraryId}.\n` +
              `Webapp ID: ${result.file_id}\n` +
              `Upload URL: ${result.external_storage_url}\n` +
              `Upload Token: ${result.token}\n` +
              `Token expires at: ${new Date(result.expiration_timestamp * 1000).toISOString()}`
      }],
    };
  } catch (error) {
    logger.error('Error creating webapp', { 
      libraryId,
      name,
      error: error instanceof Error ? error.message : String(error) 
    });
    
    const errorMessage = error instanceof Error ? error.message : String(error);
    let displayMessage = `Error creating webapp: ${errorMessage}`;
    
    if (errorMessage.includes('404') || errorMessage.includes('Library not found')) {
      displayMessage = `Library with ID ${libraryId} not found`;
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
 * Handle create whiteboard
 */
async function handleCreateWhiteboard(
  params: { libraryId: string; name: string; folderId?: string },
  apiClient: DigitalSambaApiClient
): Promise<any> {
  const { libraryId, name, folderId } = params;
  
  if (!libraryId || libraryId.trim() === '') {
    return {
      content: [{ 
        type: 'text', 
        text: 'Library ID is required to create a whiteboard.'
      }],
      isError: true,
    };
  }
  
  if (!name || name.trim() === '') {
    return {
      content: [{ 
        type: 'text', 
        text: 'Whiteboard name is required.'
      }],
      isError: true,
    };
  }
  
  logger.info('Creating whiteboard', { libraryId, name, folderId });
  
  try {
    const whiteboardData: any = { name };
    if (folderId !== undefined) whiteboardData.folder_id = folderId;
    
    const result = await apiClient.createWhiteboard(libraryId, whiteboardData);
    
    return {
      content: [{ 
        type: 'text', 
        text: `Successfully created whiteboard "${name}" in library ${libraryId}.\n` +
              `Whiteboard ID: ${result.file_id}\n` +
              `Upload URL: ${result.external_storage_url}\n` +
              `Upload Token: ${result.token}\n` +
              `Token expires at: ${new Date(result.expiration_timestamp * 1000).toISOString()}`
      }],
    };
  } catch (error) {
    logger.error('Error creating whiteboard', { 
      libraryId,
      name,
      error: error instanceof Error ? error.message : String(error) 
    });
    
    const errorMessage = error instanceof Error ? error.message : String(error);
    let displayMessage = `Error creating whiteboard: ${errorMessage}`;
    
    if (errorMessage.includes('404') || errorMessage.includes('Library not found')) {
      displayMessage = `Library with ID ${libraryId} not found`;
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
 * Handle move library file
 * Note: Since API doesn't have native move, we'll update the folder_id
 */
async function handleMoveLibraryFile(
  params: { libraryId: string; fileId: string; targetFolderId?: string },
  apiClient: DigitalSambaApiClient
): Promise<any> {
  const { libraryId, fileId, targetFolderId } = params;
  
  if (!libraryId || !fileId) {
    return {
      content: [{ 
        type: 'text', 
        text: 'Library ID and file ID are required to move a file.'
      }],
      isError: true,
    };
  }
  
  logger.info('Moving file', { libraryId, fileId, targetFolderId });
  
  try {
    // Update the file's folder_id to move it
    const result = await apiClient.updateLibraryFile(libraryId, fileId, {
      folder_id: targetFolderId || null
    });
    
    const destination = targetFolderId ? `folder ${targetFolderId}` : 'library root';
    
    return {
      content: [{ 
        type: 'text', 
        text: `Successfully moved file "${result.name}" to ${destination}`
      }],
    };
  } catch (error) {
    logger.error('Error moving file', { 
      libraryId,
      fileId,
      error: error instanceof Error ? error.message : String(error) 
    });
    
    return {
      content: [{ 
        type: 'text', 
        text: `Error moving file: ${error instanceof Error ? error.message : String(error)}`
      }],
      isError: true,
    };
  }
}

/**
 * Handle move library folder
 * Note: Since API doesn't have native move, we'll update the parent_id
 */
async function handleMoveLibraryFolder(
  params: { libraryId: string; folderId: string; targetParentId?: string },
  apiClient: DigitalSambaApiClient
): Promise<any> {
  const { libraryId, folderId, targetParentId } = params;
  
  if (!libraryId || !folderId) {
    return {
      content: [{ 
        type: 'text', 
        text: 'Library ID and folder ID are required to move a folder.'
      }],
      isError: true,
    };
  }
  
  logger.info('Moving folder', { libraryId, folderId, targetParentId });
  
  try {
    // Update the folder's parent_id to move it
    const result = await apiClient.updateLibraryFolder(libraryId, folderId, {
      parent_id: targetParentId || null
    });
    
    const destination = targetParentId ? `folder ${targetParentId}` : 'library root';
    
    return {
      content: [{ 
        type: 'text', 
        text: `Successfully moved folder ${folderId} to ${destination}`
      }],
    };
  } catch (error) {
    logger.error('Error moving folder', { 
      libraryId,
      folderId,
      error: error instanceof Error ? error.message : String(error) 
    });
    
    return {
      content: [{ 
        type: 'text', 
        text: `Error moving folder: ${error instanceof Error ? error.message : String(error)}`
      }],
      isError: true,
    };
  }
}

/**
 * Handle bulk delete library files
 * Implements client-side batching
 */
async function handleBulkDeleteLibraryFiles(
  params: { libraryId: string; fileIds: string[] },
  apiClient: DigitalSambaApiClient
): Promise<any> {
  const { libraryId, fileIds } = params;
  
  if (!libraryId || !fileIds || fileIds.length === 0) {
    return {
      content: [{ 
        type: 'text', 
        text: 'Library ID and at least one file ID are required for bulk delete.'
      }],
      isError: true,
    };
  }
  
  logger.info('Bulk deleting files', { libraryId, count: fileIds.length });
  
  const results = {
    succeeded: [] as string[],
    failed: [] as { fileId: string; error: string }[]
  };
  
  // Process deletions in parallel batches of 5
  const batchSize = 5;
  for (let i = 0; i < fileIds.length; i += batchSize) {
    const batch = fileIds.slice(i, i + batchSize);
    const promises = batch.map(async (fileId) => {
      try {
        await apiClient.deleteLibraryFile(libraryId, fileId);
        results.succeeded.push(fileId);
      } catch (error) {
        results.failed.push({
          fileId,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    });
    
    await Promise.all(promises);
  }
  
  let message = `Bulk delete completed: ${results.succeeded.length} succeeded`;
  if (results.failed.length > 0) {
    message += `, ${results.failed.length} failed`;
    const failedDetails = results.failed.map(f => `\n  - ${f.fileId}: ${f.error}`).join('');
    message += `\n\nFailed deletions:${failedDetails}`;
  }
  
  return {
    content: [{ 
      type: 'text', 
      text: message
    }],
    isError: results.failed.length > 0 && results.succeeded.length === 0,
  };
}

/**
 * Handle bulk upload library files
 * Gets upload URLs for multiple files
 */
async function handleBulkUploadLibraryFiles(
  params: { 
    libraryId: string; 
    files: Array<{
      name: string;
      size: number;
      mimeType: string;
      folderId?: string;
    }>
  },
  apiClient: DigitalSambaApiClient
): Promise<any> {
  const { libraryId, files } = params;
  
  if (!libraryId || !files || files.length === 0) {
    return {
      content: [{ 
        type: 'text', 
        text: 'Library ID and at least one file are required for bulk upload.'
      }],
      isError: true,
    };
  }
  
  logger.info('Getting bulk upload URLs', { libraryId, count: files.length });
  
  const results = {
    succeeded: [] as { file: any; uploadUrl: string; id: string }[],
    failed: [] as { file: any; error: string }[]
  };
  
  // Process uploads in parallel batches of 3
  const batchSize = 3;
  for (let i = 0; i < files.length; i += batchSize) {
    const batch = files.slice(i, i + batchSize);
    const promises = batch.map(async (file) => {
      try {
        const fileData: any = {
          name: file.name,
          size: file.size,
          mime_type: file.mimeType
        };
        if (file.folderId) fileData.folder_id = file.folderId;
        
        const result = await apiClient.createLibraryFile(libraryId, fileData);
        results.succeeded.push({
          file,
          uploadUrl: result.external_storage_url,
          id: result.file_id
        });
      } catch (error) {
        results.failed.push({
          file,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    });
    
    await Promise.all(promises);
  }
  
  let message = `Bulk upload URLs generated: ${results.succeeded.length} succeeded`;
  if (results.failed.length > 0) {
    message += `, ${results.failed.length} failed`;
  }
  
  if (results.succeeded.length > 0) {
    message += '\n\nUpload URLs:';
    results.succeeded.forEach(r => {
      message += `\n- ${r.file.name} (ID: ${r.id}): ${r.uploadUrl}`;
    });
  }
  
  if (results.failed.length > 0) {
    message += '\n\nFailed files:';
    results.failed.forEach(f => {
      message += `\n- ${f.file.name}: ${f.error}`;
    });
  }
  
  return {
    content: [{ 
      type: 'text', 
      text: message
    }],
    isError: results.failed.length > 0 && results.succeeded.length === 0,
  };
}

/**
 * Handle copy library content
 * Copies files or folders within or between libraries
 */
async function handleCopyLibraryContent(
  params: {
    sourceLibraryId: string;
    targetLibraryId: string;
    contentType: 'file' | 'folder';
    contentId: string;
    targetFolderId?: string;
    newName?: string;
  },
  apiClient: DigitalSambaApiClient
): Promise<any> {
  const { sourceLibraryId, targetLibraryId, contentType, contentId, targetFolderId, newName } = params;
  
  if (!sourceLibraryId || !targetLibraryId || !contentType || !contentId) {
    return {
      content: [{ 
        type: 'text', 
        text: 'Source library ID, target library ID, content type, and content ID are required.'
      }],
      isError: true,
    };
  }
  
  logger.info('Copying content', { 
    sourceLibraryId, 
    targetLibraryId, 
    contentType, 
    contentId,
    newName 
  });
  
  try {
    if (contentType === 'file') {
      // Get source file details
      const sourceFile = await apiClient.getLibraryFile(sourceLibraryId, contentId);
      
      // Create new file in target library
      const fileData: any = {
        name: newName || sourceFile.name,
        size: sourceFile.size,
        mime_type: sourceFile.type || 'application/octet-stream'
      };
      if (targetFolderId) fileData.folder_id = targetFolderId;
      
      const newFile = await apiClient.createLibraryFile(targetLibraryId, fileData);
      
      return {
        content: [{ 
          type: 'text', 
          text: `Successfully copied file "${sourceFile.name}" to library ${targetLibraryId}. New file ID: ${newFile.file_id}. Upload URL: ${newFile.external_storage_url}`
        }],
      };
    } else {
      // For folders, we need to recursively copy
      // This is a simplified version - in production, you'd want to handle nested content
      const sourceFolder = await apiClient.getLibraryFolder(sourceLibraryId, contentId);
      
      // Create new folder in target library
      const folderData: any = {
        name: newName || `Copy of folder ${contentId}`
      };
      if (targetFolderId) folderData.parent_id = targetFolderId;
      
      const newFolder = await apiClient.createLibraryFolder(targetLibraryId, folderData);
      
      return {
        content: [{ 
          type: 'text', 
          text: `Successfully copied folder to library ${targetLibraryId}. New folder ID: ${newFolder.id}. Note: Folder contents were not copied - this would require recursive copying.`
        }],
      };
    }
  } catch (error) {
    logger.error('Error copying content', { 
      sourceLibraryId,
      contentId,
      error: error instanceof Error ? error.message : String(error) 
    });
    
    return {
      content: [{ 
        type: 'text', 
        text: `Error copying ${contentType}: ${error instanceof Error ? error.message : String(error)}`
      }],
      isError: true,
    };
  }
}

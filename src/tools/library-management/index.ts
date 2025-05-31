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
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { 
  ErrorCode, 
  McpError
} from '@modelcontextprotocol/sdk/types.js';

// Local modules
import { getApiKeyFromRequest } from '../../auth.js';
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
      description: 'Create a new content library',
      inputSchema: {
        name: z.string().optional().describe('Name of the library'),
        externalId: z.string().describe('External identifier for the library'),
      }
    },
    {
      name: 'update-library',
      description: 'Update library details',
      inputSchema: {
        libraryId: z.string().describe('The ID of the library to update'),
        name: z.string().optional().describe('Updated name of the library'),
        externalId: z.string().optional().describe('Updated external identifier'),
      }
    },
    {
      name: 'delete-library',
      description: 'Delete a content library',
      inputSchema: {
        libraryId: z.string().describe('The ID of the library to delete'),
      }
    },
    
    // Folder Management
    {
      name: 'create-library-folder',
      description: 'Create a new folder in a library',
      inputSchema: {
        libraryId: z.string().describe('The ID of the library'),
        name: z.string().optional().describe('Name of the folder'),
        parentId: z.string().optional().describe('Parent folder ID (for nested folders)'),
      }
    },
    {
      name: 'update-library-folder',
      description: 'Update folder details',
      inputSchema: {
        libraryId: z.string().describe('The ID of the library'),
        folderId: z.string().describe('The ID of the folder to update'),
        name: z.string().optional().describe('Updated name of the folder'),
        parentId: z.string().optional().describe('Updated parent folder ID'),
      }
    },
    {
      name: 'delete-library-folder',
      description: 'Delete a folder from a library',
      inputSchema: {
        libraryId: z.string().describe('The ID of the library'),
        folderId: z.string().describe('The ID of the folder to delete'),
      }
    },
    
    // File Management
    {
      name: 'create-library-file',
      description: 'Create a new file entry and get upload URL',
      inputSchema: {
        libraryId: z.string().describe('The ID of the library'),
        name: z.string().describe('Name of the file'),
        folderId: z.string().optional().describe('Folder ID to place the file in'),
      }
    },
    {
      name: 'update-library-file',
      description: 'Update file details',
      inputSchema: {
        libraryId: z.string().describe('The ID of the library'),
        fileId: z.string().describe('The ID of the file to update'),
        name: z.string().optional().describe('Updated name of the file'),
        folderId: z.string().optional().describe('Updated folder ID'),
      }
    },
    {
      name: 'delete-library-file',
      description: 'Delete a file from a library',
      inputSchema: {
        libraryId: z.string().describe('The ID of the library'),
        fileId: z.string().describe('The ID of the file to delete'),
      }
    },
    {
      name: 'get-file-links',
      description: 'Get viewing and thumbnail links for a file',
      inputSchema: {
        libraryId: z.string().describe('The ID of the library'),
        fileId: z.string().describe('The ID of the file'),
      }
    },
    
    // Webapp and Whiteboard Creation
    {
      name: 'create-webapp',
      description: 'Create a new webapp in a library',
      inputSchema: {
        libraryId: z.string().describe('The ID of the library'),
        name: z.string().describe('Name of the webapp'),
        folderId: z.string().optional().describe('Folder ID to place the webapp in'),
      }
    },
    {
      name: 'create-whiteboard',
      description: 'Create a new whiteboard in a library',
      inputSchema: {
        libraryId: z.string().describe('The ID of the library'),
        name: z.string().describe('Name of the whiteboard'),
        folderId: z.string().optional().describe('Folder ID to place the whiteboard in'),
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
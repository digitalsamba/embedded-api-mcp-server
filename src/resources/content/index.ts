/**
 * Digital Samba MCP Server - Content Resources
 * 
 * This module implements read-only resources for accessing content libraries,
 * folders, files, and hierarchies within Digital Samba.
 * 
 * Resources provided:
 * - libraries: List all content libraries
 * - library: Get details of a specific library
 * - library-hierarchy: Get complete hierarchy of a library
 * - library-folders: List folders in a library
 * - library-folder: Get details of a specific folder
 * - library-files: List files in a library
 * - library-file: Get details of a specific file
 * 
 * @module resources/content
 * @author Digital Samba Team
 * @version 1.0.0
 */

// External dependencies
// import { z } from 'zod'; // Removed: unused

// MCP SDK imports
// import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'; // TODO: Direct MCP server integration
import { 
  ErrorCode, 
  McpError,
  Resource 
} from '@modelcontextprotocol/sdk/types.js';

// Local modules
import { 
  DigitalSambaApiClient, 
} from '../../digital-samba-api.js';
import logger from '../../logger.js';

/**
 * Register content resources
 * 
 * @returns Array of MCP Resource definitions
 */
export function registerContentResources(): Resource[] {
  return [
    {
      uri: 'digitalsamba://libraries',
      name: 'libraries',
      description: '[Content Data] List all content libraries in your account. Use to access: "show libraries", "content libraries", "file storage", "document libraries", "content repositories". Returns array of library objects with names, IDs, and file counts. Browse available content storage spaces.',
      mimeType: 'application/json'
    },
    {
      uri: 'digitalsamba://libraries/{id}',
      name: 'library',
      description: '[Content Data] Get detailed information about a specific library. Use to access: "library details", "library info", "content library settings", "library configuration", "library metadata". Requires library ID. Returns complete library information and statistics.',
      mimeType: 'application/json'
    },
    {
      uri: 'digitalsamba://libraries/{id}/hierarchy',
      name: 'library-hierarchy',
      description: '[Content Data] Get complete folder and file hierarchy of a library. Use to access: "library structure", "folder tree", "content organization", "library hierarchy", "folder structure". Requires library ID. Returns nested structure showing all folders and their relationships.',
      mimeType: 'application/json'
    },
    {
      uri: 'digitalsamba://libraries/{id}/folders',
      name: 'library-folders',
      description: '[Content Data] List all folders in a library. Use to access: "library folders", "content folders", "folder list", "library directories", "folder directory". Requires library ID. Returns flat list of all folders with names, IDs, and parent relationships.',
      mimeType: 'application/json'
    },
    {
      uri: 'digitalsamba://libraries/{id}/folders/{folderId}',
      name: 'library-folder',
      description: '[Content Data] Get details of a specific folder in a library. Use to access: "folder details", "folder info", "folder contents", "folder metadata", "specific folder data". Requires library ID and folder ID. Returns folder information and contained files.',
      mimeType: 'application/json'
    },
    {
      uri: 'digitalsamba://libraries/{id}/files',
      name: 'library-files',
      description: '[Content Data] List all files in a library. Use to access: "library files", "content files", "file list", "uploaded files", "document list". Requires library ID. Returns array of file objects with names, sizes, types, and folder locations.',
      mimeType: 'application/json'
    },
    {
      uri: 'digitalsamba://libraries/{id}/files/{fileId}',
      name: 'library-file',
      description: '[Content Data] Get detailed information about a specific file. Use to access: "file details", "file info", "file metadata", "document info", "file properties". Requires library ID and file ID. Returns complete file information including size, type, upload date, and access URLs.',
      mimeType: 'application/json'
    }
  ];
}

/**
 * Handle content resource requests
 * 
 * @param {string} uri - The resource URI
 * @param {DigitalSambaApiClient} apiClient - The Digital Samba API client
 * @returns {Promise<any>} The resource content
 */
export async function handleContentResource(uri: string, apiClient: DigitalSambaApiClient): Promise<any> {
  const parts = uri.split('/');
  
  // Parse library ID from URI like digitalsamba://libraries/{id}
  const getLibraryId = () => {
    const libraryIndex = parts.indexOf('libraries');
    return libraryIndex !== -1 && parts[libraryIndex + 1] ? parts[libraryIndex + 1] : null;
  };

  // Parse folder ID from URI like digitalsamba://libraries/{id}/folders/{folderId}
  const getFolderId = () => {
    const folderIndex = parts.indexOf('folders');
    return folderIndex !== -1 && parts[folderIndex + 1] ? parts[folderIndex + 1] : null;
  };

  // Parse file ID from URI like digitalsamba://libraries/{id}/files/{fileId}
  const getFileId = () => {
    const fileIndex = parts.indexOf('files');
    return fileIndex !== -1 && parts[fileIndex + 1] ? parts[fileIndex + 1] : null;
  };

  try {
    // List all libraries
    if (uri === 'digitalsamba://libraries') {
      logger.info('Listing all libraries');
      const response = await apiClient.listLibraries({ limit: 100 });
      
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            libraries: response.data,
            total_count: response.total_count,
            summary: `Found ${response.data.length} libraries`
          }, null, 2)
        }]
      };
    }

    const libraryId = getLibraryId();
    
    if (!libraryId) {
      throw new McpError(ErrorCode.InvalidRequest, 'Invalid resource URI format');
    }

    // Get library hierarchy
    if (uri.includes('/hierarchy')) {
      logger.info('Getting library hierarchy', { libraryId });
      const hierarchy = await apiClient.getLibraryHierarchy(libraryId);
      
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            library_id: libraryId,
            hierarchy: hierarchy,
            summary: 'Complete library hierarchy retrieved'
          }, null, 2)
        }]
      };
    }

    // Get specific folder
    const folderId = getFolderId();
    if (folderId) {
      logger.info('Getting folder details', { libraryId, folderId });
      const folder = await apiClient.getLibraryFolder(libraryId, folderId);
      
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            library_id: libraryId,
            folder: folder,
            summary: `Folder details for ID: ${folderId}`
          }, null, 2)
        }]
      };
    }

    // List library folders
    if (uri.includes('/folders')) {
      logger.info('Listing library folders', { libraryId });
      const response = await apiClient.listLibraryFolders(libraryId, { limit: 100 });
      
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            library_id: libraryId,
            folders: response.data,
            total_count: response.total_count,
            summary: `Found ${response.data.length} folders in library`
          }, null, 2)
        }]
      };
    }

    // Get specific file
    const fileId = getFileId();
    if (fileId) {
      logger.info('Getting file details', { libraryId, fileId });
      const file = await apiClient.getLibraryFile(libraryId, fileId);
      
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            library_id: libraryId,
            file: file,
            summary: `File details for ID: ${fileId}`
          }, null, 2)
        }]
      };
    }

    // List library files
    if (uri.includes('/files')) {
      logger.info('Listing library files', { libraryId });
      const files = await apiClient.listLibraryFiles(libraryId, { limit: 100 });
      
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            library_id: libraryId,
            files: files,
            total_count: files.length,
            summary: `Found ${files.length} files in library`
          }, null, 2)
        }]
      };
    }

    // Get specific library
    logger.info('Getting library details', { libraryId });
    const library = await apiClient.getLibrary(libraryId);
    
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          library: library,
          summary: `Library details for ID: ${libraryId}`
        }, null, 2)
      }]
    };

  } catch (error) {
    logger.error('Error handling content resource', { 
      uri, 
      error: error instanceof Error ? error.message : String(error) 
    });
    
    const errorMessage = error instanceof Error ? error.message : String(error);
    let displayMessage = `Error accessing content resource: ${errorMessage}`;
    
    if (errorMessage.includes('404') || errorMessage.includes('not found')) {
      displayMessage = `Resource not found: ${uri}`;
    } else if (errorMessage.includes('401') || errorMessage.includes('403')) {
      displayMessage = 'Authentication failed. Please check your API key.';
    }
    
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: displayMessage,
          uri: uri,
          timestamp: new Date().toISOString()
        }, null, 2)
      }]
    };
  }
}
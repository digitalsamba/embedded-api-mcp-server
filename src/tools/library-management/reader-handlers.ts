/**
 * Reader tool handlers for content resources (hybrid approach)
 */

import { DigitalSambaApiClient } from "../../digital-samba-api.js";
import logger from "../../logger.js";

/**
 * Handle list libraries
 */
export async function handleListLibraries(
  params: { limit?: number; offset?: number; searchName?: string },
  apiClient: DigitalSambaApiClient,
): Promise<any> {
  const { limit = 100, offset = 0, searchName } = params;

  logger.info("Listing libraries", { limit, offset, searchName });

  try {
    // If searching for a specific name, we need to fetch all libraries
    if (searchName) {
      let allLibraries: any[] = [];
      let currentOffset = 0;
      const pageSize = 100;
      let hasMore = true;
      
      while (hasMore) {
        const response = await apiClient.listLibraries({ 
          limit: pageSize, 
          offset: currentOffset 
        });
        
        allLibraries = allLibraries.concat(response.data);
        currentOffset += pageSize;
        const totalCount = typeof response.total_count === 'string' 
          ? parseInt(response.total_count, 10) 
          : (response.total_count || 0);
        hasMore = response.data.length === pageSize && currentOffset < totalCount;
      }
      
      // Filter by name (case insensitive)
      const filtered = allLibraries.filter(lib => 
        lib.name?.toLowerCase().includes(searchName.toLowerCase()) ||
        lib.external_id?.toLowerCase().includes(searchName.toLowerCase())
      );
      
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                libraries: filtered,
                total_count: filtered.length,
                total_libraries: allLibraries.length,
                search_term: searchName,
                summary: `Found ${filtered.length} libraries matching "${searchName}" out of ${allLibraries.length} total libraries`,
              },
              null,
              2,
            ),
          },
        ],
      };
    }
    
    // Normal pagination
    const response = await apiClient.listLibraries({ limit, offset });
    const totalCount = typeof response.total_count === 'string' 
      ? parseInt(response.total_count, 10) 
      : (response.total_count || 0);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              libraries: response.data,
              total_count: totalCount,
              current_page: Math.floor(offset / limit) + 1,
              total_pages: Math.ceil(totalCount / limit),
              summary: `Found ${response.data.length} libraries (showing ${offset + 1}-${offset + response.data.length} of ${totalCount})`,
            },
            null,
            2,
          ),
        },
      ],
    };
  } catch (error) {
    logger.error("Error listing libraries", {
      error: error instanceof Error ? error.message : String(error),
    });

    return {
      content: [
        {
          type: "text",
          text: `Error listing libraries: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
}

/**
 * Handle get library details
 */
export async function handleGetLibraryDetails(
  params: { libraryId: string },
  apiClient: DigitalSambaApiClient,
): Promise<any> {
  const { libraryId } = params;

  if (!libraryId || libraryId.trim() === "") {
    return {
      content: [
        {
          type: "text",
          text: "Library ID is required to get library details.",
        },
      ],
      isError: true,
    };
  }

  logger.info("Getting library details", { libraryId });

  try {
    const library = await apiClient.getLibrary(libraryId);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              library: library,
              summary: `Library details for ID: ${libraryId}`,
            },
            null,
            2,
          ),
        },
      ],
    };
  } catch (error) {
    logger.error("Error getting library details", {
      libraryId,
      error: error instanceof Error ? error.message : String(error),
    });

    const errorMessage = error instanceof Error ? error.message : String(error);
    let displayMessage = `Error getting library details: ${errorMessage}`;

    if (errorMessage.includes("404") || errorMessage.includes("not found")) {
      displayMessage = `Library with ID ${libraryId} not found`;
    }

    return {
      content: [
        {
          type: "text",
          text: displayMessage,
        },
      ],
      isError: true,
    };
  }
}

/**
 * Handle get library hierarchy
 */
export async function handleGetLibraryHierarchy(
  params: { libraryId: string },
  apiClient: DigitalSambaApiClient,
): Promise<any> {
  const { libraryId } = params;

  if (!libraryId || libraryId.trim() === "") {
    return {
      content: [
        {
          type: "text",
          text: "Library ID is required to get library hierarchy.",
        },
      ],
      isError: true,
    };
  }

  logger.info("Getting library hierarchy", { libraryId });

  try {
    const hierarchy = await apiClient.getLibraryHierarchy(libraryId);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              library_id: libraryId,
              hierarchy: hierarchy,
              summary: "Complete library hierarchy retrieved",
            },
            null,
            2,
          ),
        },
      ],
    };
  } catch (error) {
    logger.error("Error getting library hierarchy", {
      libraryId,
      error: error instanceof Error ? error.message : String(error),
    });

    const errorMessage = error instanceof Error ? error.message : String(error);
    let displayMessage = `Error getting library hierarchy: ${errorMessage}`;

    if (errorMessage.includes("404") || errorMessage.includes("not found")) {
      displayMessage = `Library with ID ${libraryId} not found`;
    }

    return {
      content: [
        {
          type: "text",
          text: displayMessage,
        },
      ],
      isError: true,
    };
  }
}

/**
 * Handle list library folders
 */
export async function handleListLibraryFolders(
  params: { libraryId: string; limit?: number; offset?: number },
  apiClient: DigitalSambaApiClient,
): Promise<any> {
  const { libraryId, limit = 100, offset = 0 } = params;

  if (!libraryId || libraryId.trim() === "") {
    return {
      content: [
        {
          type: "text",
          text: "Library ID is required to list folders.",
        },
      ],
      isError: true,
    };
  }

  logger.info("Listing library folders", { libraryId, limit, offset });

  try {
    const response = await apiClient.listLibraryFolders(libraryId, {
      limit,
      offset,
    });

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              library_id: libraryId,
              folders: response.data,
              total_count: response.total_count,
              summary: `Found ${response.data.length} folders in library`,
            },
            null,
            2,
          ),
        },
      ],
    };
  } catch (error) {
    logger.error("Error listing library folders", {
      libraryId,
      error: error instanceof Error ? error.message : String(error),
    });

    const errorMessage = error instanceof Error ? error.message : String(error);
    let displayMessage = `Error listing folders: ${errorMessage}`;

    if (errorMessage.includes("404") || errorMessage.includes("not found")) {
      displayMessage = `Library with ID ${libraryId} not found`;
    }

    return {
      content: [
        {
          type: "text",
          text: displayMessage,
        },
      ],
      isError: true,
    };
  }
}

/**
 * Handle get library folder details
 */
export async function handleGetLibraryFolderDetails(
  params: { libraryId: string; folderId: string },
  apiClient: DigitalSambaApiClient,
): Promise<any> {
  const { libraryId, folderId } = params;

  if (!libraryId || libraryId.trim() === "") {
    return {
      content: [
        {
          type: "text",
          text: "Library ID is required to get folder details.",
        },
      ],
      isError: true,
    };
  }

  if (!folderId || folderId.trim() === "") {
    return {
      content: [
        {
          type: "text",
          text: "Folder ID is required to get folder details.",
        },
      ],
      isError: true,
    };
  }

  logger.info("Getting folder details", { libraryId, folderId });

  try {
    const folder = await apiClient.getLibraryFolder(libraryId, folderId);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              library_id: libraryId,
              folder: folder,
              summary: `Folder details for ID: ${folderId}`,
            },
            null,
            2,
          ),
        },
      ],
    };
  } catch (error) {
    logger.error("Error getting folder details", {
      libraryId,
      folderId,
      error: error instanceof Error ? error.message : String(error),
    });

    const errorMessage = error instanceof Error ? error.message : String(error);
    let displayMessage = `Error getting folder details: ${errorMessage}`;

    if (errorMessage.includes("404") || errorMessage.includes("not found")) {
      displayMessage = `Folder with ID ${folderId} not found in library ${libraryId}`;
    }

    return {
      content: [
        {
          type: "text",
          text: displayMessage,
        },
      ],
      isError: true,
    };
  }
}

/**
 * Handle list library files
 */
export async function handleListLibraryFiles(
  params: { libraryId: string; limit?: number; offset?: number },
  apiClient: DigitalSambaApiClient,
): Promise<any> {
  const { libraryId, limit = 100, offset = 0 } = params;

  if (!libraryId || libraryId.trim() === "") {
    return {
      content: [
        {
          type: "text",
          text: "Library ID is required to list files.",
        },
      ],
      isError: true,
    };
  }

  logger.info("Listing library files", { libraryId, limit, offset });

  try {
    const files = await apiClient.listLibraryFiles(libraryId, { limit, offset });

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              library_id: libraryId,
              files: files,
              total_count: files.length,
              summary: `Found ${files.length} files in library`,
            },
            null,
            2,
          ),
        },
      ],
    };
  } catch (error) {
    logger.error("Error listing library files", {
      libraryId,
      error: error instanceof Error ? error.message : String(error),
    });

    const errorMessage = error instanceof Error ? error.message : String(error);
    let displayMessage = `Error listing files: ${errorMessage}`;

    if (errorMessage.includes("404") || errorMessage.includes("not found")) {
      displayMessage = `Library with ID ${libraryId} not found`;
    }

    return {
      content: [
        {
          type: "text",
          text: displayMessage,
        },
      ],
      isError: true,
    };
  }
}

/**
 * Handle get library file details
 */
export async function handleGetLibraryFileDetails(
  params: { libraryId: string; fileId: string },
  apiClient: DigitalSambaApiClient,
): Promise<any> {
  const { libraryId, fileId } = params;

  if (!libraryId || libraryId.trim() === "") {
    return {
      content: [
        {
          type: "text",
          text: "Library ID is required to get file details.",
        },
      ],
      isError: true,
    };
  }

  if (!fileId || fileId.trim() === "") {
    return {
      content: [
        {
          type: "text",
          text: "File ID is required to get file details.",
        },
      ],
      isError: true,
    };
  }

  logger.info("Getting file details", { libraryId, fileId });

  try {
    const file = await apiClient.getLibraryFile(libraryId, fileId);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              library_id: libraryId,
              file: file,
              summary: `File details for ID: ${fileId}`,
            },
            null,
            2,
          ),
        },
      ],
    };
  } catch (error) {
    logger.error("Error getting file details", {
      libraryId,
      fileId,
      error: error instanceof Error ? error.message : String(error),
    });

    const errorMessage = error instanceof Error ? error.message : String(error);
    let displayMessage = `Error getting file details: ${errorMessage}`;

    if (errorMessage.includes("404") || errorMessage.includes("not found")) {
      displayMessage = `File with ID ${fileId} not found in library ${libraryId}`;
    }

    return {
      content: [
        {
          type: "text",
          text: displayMessage,
        },
      ],
      isError: true,
    };
  }
}
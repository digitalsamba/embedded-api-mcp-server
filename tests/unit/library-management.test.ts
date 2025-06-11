/**
 * Unit tests for Library Management Tools
 *
 * Tests the library management tools functionality including
 * CRUD operations and reader tools for the hybrid approach
 *
 * @group unit
 * @group library
 */

import { registerLibraryTools, executeLibraryTool } from '../../src/tools/library-management/index.js';
import { DigitalSambaApiClient } from '../../src/digital-samba-api.js';
import logger from '../../src/logger.js';

// Mock dependencies
jest.mock('../../src/logger.js');
jest.mock('../../src/digital-samba-api.js');

describe('Library Management Tools', () => {
  let mockApiClient: jest.Mocked<DigitalSambaApiClient>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockApiClient = new DigitalSambaApiClient('test-key') as jest.Mocked<DigitalSambaApiClient>;
  });

  describe('Tool Registration', () => {
    it('should register all library management tools', () => {
      const tools = registerLibraryTools();
      
      expect(tools).toBeDefined();
      expect(Array.isArray(tools)).toBe(true);
      expect(tools.length).toBe(24); // 17 CRUD tools + 7 reader tools
      
      // Check for some key tools
      const toolNames = tools.map(t => t.name);
      expect(toolNames).toContain('create-library');
      expect(toolNames).toContain('update-library');
      expect(toolNames).toContain('delete-library');
      expect(toolNames).toContain('list-libraries');
      expect(toolNames).toContain('get-library-details');
    });

    it('should have proper schema for each tool', () => {
      const tools = registerLibraryTools();
      
      tools.forEach(tool => {
        expect(tool).toHaveProperty('name');
        expect(tool).toHaveProperty('description');
        expect(tool).toHaveProperty('inputSchema');
        expect(tool.inputSchema).toHaveProperty('type', 'object');
        expect(tool.inputSchema).toHaveProperty('properties');
      });
    });
  });

  describe('Library CRUD Operations', () => {
    describe('create-library', () => {
      it('should create a library successfully', async () => {
        const mockResponse = {
          id: 'lib-123',
          name: 'Test Library',
          external_id: 'ext-123'
        };
        mockApiClient.createLibrary.mockResolvedValue(mockResponse);

        const result = await executeLibraryTool(
          'create-library',
          {
            name: 'Test Library',
            externalId: 'ext-123'
          },
          mockApiClient
        );

        expect(mockApiClient.createLibrary).toHaveBeenCalledWith({
          name: 'Test Library',
          external_id: 'ext-123'
        });
        expect(result.content[0].text).toContain('Successfully created library');
        expect(result.content[0].text).toContain('lib-123');
      });

      it('should handle missing external ID', async () => {
        const result = await executeLibraryTool(
          'create-library',
          { name: 'Test Library' },
          mockApiClient
        );

        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('External ID is required');
      });
    });

    describe('update-library', () => {
      it('should update library successfully', async () => {
        mockApiClient.updateLibrary.mockResolvedValue({});

        const result = await executeLibraryTool(
          'update-library',
          {
            libraryId: 'lib-123',
            name: 'Updated Library'
          },
          mockApiClient
        );

        expect(mockApiClient.updateLibrary).toHaveBeenCalledWith('lib-123', {
          name: 'Updated Library'
        });
        expect(result.content[0].text).toContain('Successfully updated library');
      });

      it('should handle library not found', async () => {
        mockApiClient.updateLibrary.mockRejectedValue(new Error('404: Library not found'));

        const result = await executeLibraryTool(
          'update-library',
          {
            libraryId: 'non-existent',
            name: 'Updated'
          },
          mockApiClient
        );

        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Library with ID non-existent not found');
      });
    });
  });

  describe('Library Reader Tools (Hybrid Approach)', () => {
    describe('list-libraries', () => {
      it('should list all libraries', async () => {
        const mockResponse = {
          data: [
            { id: 'lib-1', name: 'Library 1' },
            { id: 'lib-2', name: 'Library 2' }
          ],
          total_count: 2
        };
        mockApiClient.listLibraries.mockResolvedValue(mockResponse);

        const result = await executeLibraryTool(
          'list-libraries',
          { limit: 100, offset: 0 },
          mockApiClient
        );

        expect(mockApiClient.listLibraries).toHaveBeenCalledWith({ limit: 100, offset: 0 });
        expect(result.content[0].text).toContain('Found 2 libraries');
        expect(result.content[0].text).toContain('lib-1');
        expect(result.content[0].text).toContain('lib-2');
      });
    });

    describe('get-library-details', () => {
      it('should get library details', async () => {
        const mockLibrary = {
          id: 'lib-123',
          name: 'Test Library',
          external_id: 'ext-123',
          created_at: '2025-01-01T00:00:00Z',
          file_count: 10,
          folder_count: 3
        };
        mockApiClient.getLibrary.mockResolvedValue(mockLibrary);

        const result = await executeLibraryTool(
          'get-library-details',
          { libraryId: 'lib-123' },
          mockApiClient
        );

        expect(mockApiClient.getLibrary).toHaveBeenCalledWith('lib-123');
        expect(result.content[0].text).toContain('lib-123');
        expect(result.content[0].text).toContain('Test Library');
      });

      it('should handle library not found', async () => {
        mockApiClient.getLibrary.mockRejectedValue(new Error('404: Not found'));

        const result = await executeLibraryTool(
          'get-library-details',
          { libraryId: 'non-existent' },
          mockApiClient
        );

        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Library with ID non-existent not found');
      });
    });

    describe('get-library-hierarchy', () => {
      it('should get library folder hierarchy', async () => {
        const mockHierarchy = {
          folders: [
            {
              id: 'folder-1',
              name: 'Documents',
              children: [
                {
                  id: 'folder-2',
                  name: 'Reports',
                  children: []
                }
              ]
            }
          ]
        };
        mockApiClient.getLibraryHierarchy.mockResolvedValue(mockHierarchy);

        const result = await executeLibraryTool(
          'get-library-hierarchy',
          { libraryId: 'lib-123' },
          mockApiClient
        );

        expect(mockApiClient.getLibraryHierarchy).toHaveBeenCalledWith('lib-123');
        expect(result.content[0].text).toContain('Documents');
        expect(result.content[0].text).toContain('Reports');
      });
    });

    describe('list-library-files', () => {
      it('should list library files', async () => {
        const mockResponse = {
          data: [
            { id: 'file-1', name: 'Document.pdf', size: 1024 },
            { id: 'file-2', name: 'Image.png', size: 2048 }
          ],
          total_count: 2
        };
        mockApiClient.listLibraryFiles.mockResolvedValue(mockResponse);

        const result = await executeLibraryTool(
          'list-library-files',
          { libraryId: 'lib-123', limit: 50 },
          mockApiClient
        );

        expect(mockApiClient.listLibraryFiles).toHaveBeenCalledWith('lib-123', { limit: 50, offset: 0 });
        expect(result.content[0].text).toContain('Found 2 files');
        expect(result.content[0].text).toContain('Document.pdf');
        expect(result.content[0].text).toContain('Image.png');
      });
    });
  });

  describe('File Operations', () => {
    describe('create-library-file', () => {
      it('should create file and get upload URL', async () => {
        const mockResponse = {
          file_id: 'file-123',
          external_storage_url: 'https://upload.example.com/file-123',
          token: 'upload-token',
          expiration_timestamp: 1234567890
        };
        mockApiClient.createLibraryFile.mockResolvedValue(mockResponse);

        const result = await executeLibraryTool(
          'create-library-file',
          {
            libraryId: 'lib-123',
            name: 'test.pdf',
            folderId: 'folder-1'
          },
          mockApiClient
        );

        expect(mockApiClient.createLibraryFile).toHaveBeenCalledWith('lib-123', {
          name: 'test.pdf',
          folder_id: 'folder-1'
        });
        expect(result.content[0].text).toContain('Successfully created file');
        expect(result.content[0].text).toContain('file-123');
        expect(result.content[0].text).toContain('https://upload.example.com/file-123');
      });
    });

    describe('get-file-links', () => {
      it('should get file viewing links', async () => {
        const mockResponse = {
          pages: [
            {
              url: 'https://view.example.com/page1',
              thumbnail_url: 'https://thumb.example.com/page1'
            }
          ]
        };
        mockApiClient.getFileLinks.mockResolvedValue(mockResponse);

        const result = await executeLibraryTool(
          'get-file-links',
          {
            libraryId: 'lib-123',
            fileId: 'file-123'
          },
          mockApiClient
        );

        expect(mockApiClient.getFileLinks).toHaveBeenCalledWith('lib-123', 'file-123');
        expect(result.content[0].text).toContain('https://view.example.com/page1');
        expect(result.content[0].text).toContain('https://thumb.example.com/page1');
      });
    });
  });

  describe('Bulk Operations', () => {
    describe('bulk-delete-library-files', () => {
      it('should delete multiple files', async () => {
        mockApiClient.deleteLibraryFile
          .mockResolvedValueOnce(undefined)
          .mockResolvedValueOnce(undefined)
          .mockRejectedValueOnce(new Error('File not found'));

        const result = await executeLibraryTool(
          'bulk-delete-library-files',
          {
            libraryId: 'lib-123',
            fileIds: ['file-1', 'file-2', 'file-3']
          },
          mockApiClient
        );

        expect(mockApiClient.deleteLibraryFile).toHaveBeenCalledTimes(3);
        expect(result.content[0].text).toContain('2 succeeded, 1 failed');
      });
    });

    describe('bulk-upload-library-files', () => {
      it('should get upload URLs for multiple files', async () => {
        const mockResponse = {
          file_id: 'file-123',
          external_storage_url: 'https://upload.example.com/file',
          token: 'token',
          expiration_timestamp: 1234567890
        };
        mockApiClient.createLibraryFile.mockResolvedValue(mockResponse);

        const result = await executeLibraryTool(
          'bulk-upload-library-files',
          {
            libraryId: 'lib-123',
            files: [
              { name: 'file1.pdf', size: 1024, mimeType: 'application/pdf' },
              { name: 'file2.png', size: 2048, mimeType: 'image/png' }
            ]
          },
          mockApiClient
        );

        expect(mockApiClient.createLibraryFile).toHaveBeenCalledTimes(2);
        expect(result.content[0].text).toContain('2 succeeded');
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle unknown tool name', async () => {
      await expect(
        executeLibraryTool('unknown-tool', {}, mockApiClient)
      ).rejects.toThrow('Unknown tool: unknown-tool');
    });

    it('should handle API errors gracefully', async () => {
      mockApiClient.createLibrary.mockRejectedValue(new Error('Network error'));

      const result = await executeLibraryTool(
        'create-library',
        { externalId: 'ext-123' },
        mockApiClient
      );

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Error creating library: Network error');
    });
  });
});
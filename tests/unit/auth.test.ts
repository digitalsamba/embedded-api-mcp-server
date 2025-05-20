/**
 * Unit tests for auth.ts
 * 
 * This file contains comprehensive tests for the authentication module functionality,
 * including API key extraction, session context management, and request handling.
 * 
 * @module tests/unit/auth
 */
import { extractApiKey, ApiKeyContext, getApiKeyFromRequest } from '../../src/auth';
import { mockExpressRequest, mockRequestMeta } from '../mocks/api-responses';

describe('Authentication Module Tests', () => {
  describe('extractApiKey', () => {
    it('should extract API key from valid Authorization header', () => {
      const req = {
        headers: {
          authorization: 'Bearer test-api-key'
        }
      };
      
      const apiKey = extractApiKey(req as any);
      expect(apiKey).toBe('test-api-key');
    });
    
    it('should return null if Authorization header is missing', () => {
      const req = {
        headers: {}
      };
      
      const apiKey = extractApiKey(req as any);
      expect(apiKey).toBeNull();
    });
    
    it('should return null if Authorization header is not a Bearer token', () => {
      const req = {
        headers: {
          authorization: 'Basic test-api-key'
        }
      };
      
      const apiKey = extractApiKey(req as any);
      expect(apiKey).toBeNull();
    });
    
    it('should return null if Bearer token is empty', () => {
      const req = {
        headers: {
          authorization: 'Bearer '
        }
      };
      
      const apiKey = extractApiKey(req as any);
      expect(apiKey).toBeNull();
    });
  });
  
  describe('ApiKeyContext', () => {
    // Reset the singleton between tests
    beforeEach(() => {
      // Reset the singleton instance
      (ApiKeyContext as any).instance = undefined;
    });
    
    it('should store and retrieve API key for a session', () => {
      const context = ApiKeyContext.getInstance();
      
      context.setApiKey('test-session', 'test-api-key');
      const apiKey = context.getApiKey('test-session');
      
      expect(apiKey).toBe('test-api-key');
    });
    
    it('should return undefined for unknown session', () => {
      const context = ApiKeyContext.getInstance();
      
      const apiKey = context.getApiKey('unknown-session');
      
      expect(apiKey).toBeUndefined();
    });
    
    it('should remove API key for a session', () => {
      const context = ApiKeyContext.getInstance();
      
      context.setApiKey('test-session', 'test-api-key');
      context.removeApiKey('test-session');
      const apiKey = context.getApiKey('test-session');
      
      expect(apiKey).toBeUndefined();
    });
    
    it('should return the current API key', () => {
      const context = ApiKeyContext.getInstance();
      
      context.setApiKey('test-session', 'test-api-key');
      const apiKey = context.getCurrentApiKey();
      
      expect(apiKey).toBe('test-api-key');
    });
    
    it('should maintain singleton behavior across getInstance calls', () => {
      const context1 = ApiKeyContext.getInstance();
      const context2 = ApiKeyContext.getInstance();
      
      // Should be the same instance
      expect(context1).toBe(context2);
      
      // Changes in one should affect the other
      context1.setApiKey('shared-session', 'shared-api-key');
      expect(context2.getApiKey('shared-session')).toBe('shared-api-key');
    });
    
    it('should clear the current session reference when removing current session', () => {
      const context = ApiKeyContext.getInstance();
      
      context.setApiKey('current-session', 'current-api-key');
      expect(context.getCurrentApiKey()).toBe('current-api-key');
      
      // Remove the current session
      context.removeApiKey('current-session');
      
      // Current API key should now be undefined
      expect(context.getCurrentApiKey()).toBeUndefined();
    });
    
    it('should update the current session when setting a new API key', () => {
      const context = ApiKeyContext.getInstance();
      
      context.setApiKey('session-1', 'api-key-1');
      expect(context.getCurrentApiKey()).toBe('api-key-1');
      
      // Set a new session
      context.setApiKey('session-2', 'api-key-2');
      
      // Current API key should now be from session-2
      expect(context.getCurrentApiKey()).toBe('api-key-2');
      
      // But session-1 should still have its key
      expect(context.getApiKey('session-1')).toBe('api-key-1');
    });
  });
  
  describe('getApiKeyFromRequest', () => {
    // Reset the singleton between tests
    beforeEach(() => {
      // Reset the singleton instance
      (ApiKeyContext as any).instance = undefined;
      
      // Save the original env
      process.env.DIGITAL_SAMBA_API_KEY = undefined;
    });
    
    afterEach(() => {
      // Restore the env
      process.env.DIGITAL_SAMBA_API_KEY = undefined;
    });
    
    it('should get API key from session context', () => {
      const context = ApiKeyContext.getInstance();
      context.setApiKey('test-session-id', 'test-api-key');
      
      const apiKey = getApiKeyFromRequest(mockRequestMeta);
      
      expect(apiKey).toBe('test-api-key');
    });
    
    it('should get API key from environment variable if not in session context', () => {
      process.env.DIGITAL_SAMBA_API_KEY = 'env-api-key';
      
      const apiKey = getApiKeyFromRequest({
        ...mockRequestMeta,
        transport: {
          sessionId: 'unknown-session-id'
        }
      });
      
      expect(apiKey).toBe('env-api-key');
    });
    
    it('should store environment API key in session context if sessionId exists', () => {
      process.env.DIGITAL_SAMBA_API_KEY = 'env-api-key';
      const context = ApiKeyContext.getInstance();
      
      // Call the function with a sessionId
      getApiKeyFromRequest({
        ...mockRequestMeta,
        transport: {
          sessionId: 'new-session-id'
        }
      });
      
      // Should have stored the API key
      const storedKey = context.getApiKey('new-session-id');
      expect(storedKey).toBe('env-api-key');
    });
    
    it('should return null if no API key is available', () => {
      const apiKey = getApiKeyFromRequest({
        ...mockRequestMeta,
        transport: {
          sessionId: 'unknown-session-id'
        }
      });
      
      expect(apiKey).toBeNull();
    });
    
    it('should handle request with no sessionId gracefully', () => {
      // No sessionId in the request
      const apiKey = getApiKeyFromRequest({
        id: 'request-id',
        method: 'test-method',
        transport: {}
      });
      
      expect(apiKey).toBeNull();
    });
    
    it('should handle request with empty sessionId gracefully', () => {
      // Empty sessionId in the request
      const apiKey = getApiKeyFromRequest({
        id: 'request-id',
        method: 'test-method',
        transport: {
          sessionId: ''
        }
      });
      
      expect(apiKey).toBeNull();
    });
    
    it('should prioritize session context over environment variable', () => {
      // Set both context and environment
      const context = ApiKeyContext.getInstance();
      context.setApiKey('test-session-id', 'context-api-key');
      process.env.DIGITAL_SAMBA_API_KEY = 'env-api-key';
      
      const apiKey = getApiKeyFromRequest(mockRequestMeta);
      
      // Should use context value
      expect(apiKey).toBe('context-api-key');
    });
  });
  
  describe('Integration Tests', () => {
    // Reset the singleton between tests
    beforeEach(() => {
      // Reset the singleton instance
      (ApiKeyContext as any).instance = undefined;
      process.env.DIGITAL_SAMBA_API_KEY = undefined;
    });
    
    it('should handle the full authentication flow correctly', () => {
      // Mock Express request with authorization header
      const req = {
        headers: {
          authorization: 'Bearer auth-header-key',
          'mcp-session-id': 'session-123'
        }
      };
      
      // 1. Extract the API key from headers
      const extractedKey = extractApiKey(req as any);
      expect(extractedKey).toBe('auth-header-key');
      
      // 2. Get the ApiKeyContext instance
      const context = ApiKeyContext.getInstance();
      
      // 3. Store the key in the context
      context.setApiKey('session-123', extractedKey!);
      
      // 4. Make an MCP request with the session ID
      const mockReq = {
        id: 'request-id',
        method: 'test-method',
        transport: {
          sessionId: 'session-123'
        }
      };
      
      // 5. Get the API key from the request
      const apiKey = getApiKeyFromRequest(mockReq);
      
      // 6. Verify we got the correct key
      expect(apiKey).toBe('auth-header-key');
    });
  });
});

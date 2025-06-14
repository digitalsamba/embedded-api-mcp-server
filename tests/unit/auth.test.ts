/**
 * Unit tests for auth.ts
 * 
 * Tests for the simplified authentication module that uses environment variables
 * for API key configuration in MCP stdio mode.
 * 
 * @module tests/unit/auth
 */
import apiKeyContext, { extractApiKey, getApiKeyFromRequest } from '../../src/auth';

describe('Authentication Module Tests', () => {
  // Store original env value
  const originalApiKey = process.env.DIGITAL_SAMBA_DEVELOPER_KEY;
  
  beforeEach(() => {
    // Clear environment variable before each test
    delete process.env.DIGITAL_SAMBA_DEVELOPER_KEY;
  });
  
  afterEach(() => {
    // Restore original value
    if (originalApiKey) {
      process.env.DIGITAL_SAMBA_DEVELOPER_KEY = originalApiKey;
    } else {
      delete process.env.DIGITAL_SAMBA_DEVELOPER_KEY;
    }
  });

  describe('getApiKeyFromRequest', () => {
    it('should return API key from environment variable', () => {
      process.env.DIGITAL_SAMBA_DEVELOPER_KEY = 'test-api-key';
      
      const apiKey = getApiKeyFromRequest({});
      expect(apiKey).toBe('test-api-key');
    });
    
    it('should return null if environment variable is not set', () => {
      delete process.env.DIGITAL_SAMBA_DEVELOPER_KEY;
      
      const apiKey = getApiKeyFromRequest({});
      expect(apiKey).toBeNull();
    });
    
    it('should handle empty environment variable', () => {
      process.env.DIGITAL_SAMBA_DEVELOPER_KEY = '';
      
      const apiKey = getApiKeyFromRequest({});
      // Empty string is falsy, so it returns null
      expect(apiKey).toBeNull();
    });
  });
  
  describe('extractApiKey', () => {
    it('should extract API key from environment variable', () => {
      process.env.DIGITAL_SAMBA_DEVELOPER_KEY = 'env-api-key';
      
      const apiKey = extractApiKey();
      expect(apiKey).toBe('env-api-key');
    });
    
    it('should return null when no API key is available', () => {
      delete process.env.DIGITAL_SAMBA_DEVELOPER_KEY;
      
      const apiKey = extractApiKey();
      expect(apiKey).toBeNull();
    });
    
    it('should handle various input parameters (for backwards compatibility)', () => {
      process.env.DIGITAL_SAMBA_DEVELOPER_KEY = 'test-key';
      
      // Should ignore any parameters and use env variable
      expect(extractApiKey({})).toBe('test-key');
      expect(extractApiKey({ headers: { authorization: 'Bearer other-key' } })).toBe('test-key');
      expect(extractApiKey('some-string')).toBe('test-key');
      expect(extractApiKey(null)).toBe('test-key');
      expect(extractApiKey(undefined)).toBe('test-key');
    });

    it('should check async local storage context when env var is not set', async () => {
      delete process.env.DIGITAL_SAMBA_DEVELOPER_KEY;
      
      // Test with context
      await apiKeyContext.run('context-api-key', () => {
        const apiKey = extractApiKey();
        expect(apiKey).toBe('context-api-key');
      });
      
      // Test without context
      const apiKey = extractApiKey();
      expect(apiKey).toBeNull();
    });
  });
  
  describe('Environment Variable Handling', () => {
    it('should handle special characters in API key', () => {
      const specialKey = 'key-with_special.chars!@#$%^&*()';
      process.env.DIGITAL_SAMBA_DEVELOPER_KEY = specialKey;
      
      expect(getApiKeyFromRequest({})).toBe(specialKey);
      expect(extractApiKey()).toBe(specialKey);
    });
    
    it('should handle very long API keys', () => {
      const longKey = 'x'.repeat(1000);
      process.env.DIGITAL_SAMBA_DEVELOPER_KEY = longKey;
      
      expect(getApiKeyFromRequest({})).toBe(longKey);
      expect(extractApiKey()).toBe(longKey);
    });
  });
});
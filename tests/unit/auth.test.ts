/**
 * Unit tests for auth.ts
 * 
 * Tests for the simplified authentication module that uses environment variables
 * for API key configuration in MCP stdio mode.
 * 
 * @module tests/unit/auth
 */
import apiKeyContext, { getApiKeyFromRequest } from '../../src/auth';

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
  
  describe('apiKeyContext', () => {
    it('should prefer async local storage context over env var', async () => {
      process.env.DIGITAL_SAMBA_DEVELOPER_KEY = 'env-api-key';

      await apiKeyContext.run('context-api-key', () => {
        expect(getApiKeyFromRequest({})).toBe('context-api-key');
      });

      expect(getApiKeyFromRequest({})).toBe('env-api-key');
    });
  });

  describe('Environment Variable Handling', () => {
    it('should handle special characters in API key', () => {
      const specialKey = 'key-with_special.chars!@#$%^&*()';
      process.env.DIGITAL_SAMBA_DEVELOPER_KEY = specialKey;
      
      expect(getApiKeyFromRequest({})).toBe(specialKey);
    });
    
    it('should handle very long API keys', () => {
      const longKey = 'x'.repeat(1000);
      process.env.DIGITAL_SAMBA_DEVELOPER_KEY = longKey;
      
      expect(getApiKeyFromRequest({})).toBe(longKey);
    });
  });
});
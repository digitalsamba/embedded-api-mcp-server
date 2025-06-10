import {
  DigitalSambaError,
  ApiRequestError,
  ApiResponseError,
  AuthenticationError,
  ResourceNotFoundError,
  ValidationError,
  NetworkError,
  RateLimitError,
  ServerError
} from '../../src/errors.js';

describe('Error Classes', () => {
  describe('DigitalSambaError', () => {
    it('should create base error with message', () => {
      const error = new DigitalSambaError('Test error');
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(DigitalSambaError);
      expect(error.message).toBe('Test error');
      expect(error.name).toBe('DigitalSambaError');
    });

    it('should capture stack trace', () => {
      const error = new DigitalSambaError('Test error');
      expect(error.stack).toBeDefined();
      expect(error.stack).toContain('DigitalSambaError');
    });
  });

  describe('ApiRequestError', () => {
    it('should create request error with details', () => {
      const error = new ApiRequestError('Request failed', {
        method: 'GET',
        url: 'https://api.example.com/test'
      });
      
      expect(error).toBeInstanceOf(DigitalSambaError);
      expect(error.name).toBe('ApiRequestError');
      expect(error.method).toBe('GET');
      expect(error.url).toBe('https://api.example.com/test');
    });

    it('should work without request details', () => {
      const error = new ApiRequestError('Request failed');
      expect(error.method).toBeUndefined();
      expect(error.url).toBeUndefined();
    });
  });

  describe('ApiResponseError', () => {
    it('should create response error with all details', () => {
      const error = new ApiResponseError('Response error', 400, {
        error: 'Bad request',
        details: { field: 'Invalid value' }
      });
      
      expect(error).toBeInstanceOf(DigitalSambaError);
      expect(error.name).toBe('ApiResponseError');
      expect(error.status).toBe(400);
      expect(error.response).toEqual({
        error: 'Bad request',
        details: { field: 'Invalid value' }
      });
    });

    it('should work with minimal parameters', () => {
      const error = new ApiResponseError('Error', 500);
      expect(error.status).toBe(500);
      expect(error.response).toBeUndefined();
    });
  });

  describe('AuthenticationError', () => {
    it('should create authentication error', () => {
      const error = new AuthenticationError('Invalid API key');
      expect(error).toBeInstanceOf(DigitalSambaError);
      expect(error.name).toBe('AuthenticationError');
      expect(error.message).toBe('Invalid API key');
    });

    it('should have default message', () => {
      const error = new AuthenticationError();
      expect(error.message).toBe('Authentication failed');
    });
  });

  describe('ResourceNotFoundError', () => {
    it('should create not found error with details', () => {
      const error = new ResourceNotFoundError('Room', 'room-123');
      expect(error).toBeInstanceOf(DigitalSambaError);
      expect(error.name).toBe('ResourceNotFoundError');
      expect(error.resourceType).toBe('Room');
      expect(error.resourceId).toBe('room-123');
      expect(error.message).toBe('Room not found: room-123');
    });

    it('should work without resource ID', () => {
      const error = new ResourceNotFoundError('Room');
      expect(error.message).toBe('Room not found');
      expect(error.resourceId).toBeUndefined();
    });
  });

  describe('ValidationError', () => {
    it('should create validation error with field errors', () => {
      const fieldErrors = {
        name: ['Required field'],
        email: ['Invalid format', 'Already exists']
      };
      
      const error = new ValidationError('Validation failed', fieldErrors);
      expect(error).toBeInstanceOf(DigitalSambaError);
      expect(error.name).toBe('ValidationError');
      expect(error.errors).toEqual(fieldErrors);
    });

    it('should work without field errors', () => {
      const error = new ValidationError('Invalid input');
      expect(error.errors).toBeUndefined();
    });
  });

  describe('NetworkError', () => {
    it('should create network error with cause', () => {
      const originalError = new Error('Connection refused');
      const error = new NetworkError('Network request failed', originalError);
      
      expect(error).toBeInstanceOf(ApiRequestError);
      expect(error.name).toBe('NetworkError');
      expect(error.cause).toBe(originalError);
    });

    it('should work without cause', () => {
      const error = new NetworkError('Network timeout');
      expect(error.cause).toBeUndefined();
    });
  });

  describe('RateLimitError', () => {
    it('should create rate limit error with retry after', () => {
      const error = new RateLimitError('Too many requests', 60);
      
      expect(error).toBeInstanceOf(ApiResponseError);
      expect(error.name).toBe('RateLimitError');
      expect(error.retryAfter).toBe(60);
      expect(error.status).toBe(429);
    });

    it('should work without retry after', () => {
      const error = new RateLimitError('Rate limit exceeded');
      expect(error.retryAfter).toBeUndefined();
    });
  });

  describe('ServerError', () => {
    it('should create server error', () => {
      const error = new ServerError('Internal server error');
      
      expect(error).toBeInstanceOf(ApiResponseError);
      expect(error.name).toBe('ServerError');
      expect(error.status).toBe(500);
    });

    it('should use custom status code', () => {
      const error = new ServerError('Bad gateway', 502);
      expect(error.status).toBe(502);
    });
  });

  describe('Error serialization', () => {
    it('should serialize to JSON properly', () => {
      const error = new ValidationError('Validation failed', {
        name: ['Required']
      });
      
      const json = JSON.stringify(error);
      const parsed = JSON.parse(json);
      
      expect(parsed.name).toBe('ValidationError');
      expect(parsed.message).toBe('Validation failed');
      expect(parsed.errors).toEqual({ name: ['Required'] });
    });

    it('should handle circular references', () => {
      const error = new ApiRequestError('Request failed');
      (error as any).circular = error;
      
      // Should not throw
      expect(() => JSON.stringify(error)).not.toThrow();
    });
  });
});
/**
 * Error Types Module for Digital Samba MCP Server
 * 
 * This module defines custom error types used throughout the MCP server implementation.
 * Standardized error handling provides consistent behavior, improves error reporting,
 * and makes debugging easier.
 * 
 * @module errors
 * @author Digital Samba Team
 * @version 0.1.0
 */

/**
 * Base error class for all Digital Samba MCP errors
 * 
 * This class extends the standard Error to add additional context and typed error handling.
 * It provides a common base class for all custom errors in the system.
 * 
 * @class DigitalSambaError
 * @extends Error
 * @example
 * throw new DigitalSambaError('Something went wrong');
 */
export class DigitalSambaError extends Error {
  /**
   * Create a new DigitalSambaError
   * 
   * @param {string} message - Error message
   * @param {Object} [options] - Additional error options
   * @param {Error} [options.cause] - The error that caused this error
   */
  constructor(message: string, _options?: { cause?: Error }) {
    super(message);
    this.name = 'DigitalSambaError';
  }
}

/**
 * Error thrown when API authentication fails
 * 
 * This error is used when the developer key is missing, invalid, or unauthorized.
 * 
 * @class AuthenticationError
 * @extends DigitalSambaError
 * @example
 * throw new AuthenticationError('Developer key is missing or invalid');
 */
export class AuthenticationError extends DigitalSambaError {
  /**
   * Create a new AuthenticationError
   * 
   * @param {string} message - Error message
   * @param {Object} [options] - Additional error options
   * @param {Error} [options.cause] - The error that caused this error
   */
  constructor(message: string, _options?: { cause?: Error }) {
    super(message);
    this.name = 'AuthenticationError';
  }
}

/**
 * Error thrown when an API request fails
 * 
 * This error is used for general API request failures, such as network errors,
 * timeouts, or other issues with the HTTP request itself.
 * 
 * @class ApiRequestError
 * @extends DigitalSambaError
 * @example
 * throw new ApiRequestError('Failed to connect to the API server', { cause: originalError });
 */
export class ApiRequestError extends DigitalSambaError {
  /**
   * Create a new ApiRequestError
   * 
   * @param {string} message - Error message
   * @param {Object} [options] - Additional error options
   * @param {Error} [options.cause] - The error that caused this error
   */
  constructor(message: string, _options?: { cause?: Error }) {
    super(message);
    this.name = 'ApiRequestError';
  }
}

/**
 * Error thrown when an API response indicates an error
 * 
 * This error represents errors that come from the Digital Samba API itself,
 * such as validation errors, resource not found, etc.
 * 
 * @class ApiResponseError
 * @extends DigitalSambaError
 * @property {number} statusCode - HTTP status code from the API response
 * @property {string} apiErrorMessage - Original error message from the API
 * @property {any} apiErrorData - Additional error data from the API (if available)
 * @example
 * throw new ApiResponseError('Room not found', { 
 *   statusCode: 404, 
 *   apiErrorMessage: 'The requested room does not exist',
 *   apiErrorData: { roomId: '123' }
 * });
 */
export class ApiResponseError extends DigitalSambaError {
  statusCode: number;
  apiErrorMessage: string;
  apiErrorData?: any;
  
  /**
   * Create a new ApiResponseError
   * 
   * @param {string} message - Error message
   * @param {Object} options - Additional error options
   * @param {number} options.statusCode - HTTP status code from the API response
   * @param {string} options.apiErrorMessage - Original error message from the API
   * @param {any} [options.apiErrorData] - Additional error data from the API (if available)
   * @param {Error} [options.cause] - The error that caused this error
   */
  constructor(message: string, options: { 
    statusCode: number, 
    apiErrorMessage: string, 
    apiErrorData?: any,
    cause?: Error
  }) {
    super(message);
    this.name = 'ApiResponseError';
    this.statusCode = options.statusCode;
    this.apiErrorMessage = options.apiErrorMessage;
    this.apiErrorData = options.apiErrorData;
  }
}

/**
 * Error thrown when a resource is not found
 * 
 * This error is a specific type of API response error for 404 Not Found responses.
 * 
 * @class ResourceNotFoundError
 * @extends ApiResponseError
 * @example
 * throw new ResourceNotFoundError('Room not found', { resourceId: '123', resourceType: 'room' });
 */
export class ResourceNotFoundError extends ApiResponseError {
  resourceType: string;
  resourceId: string;
  
  /**
   * Create a new ResourceNotFoundError
   * 
   * @param {string} message - Error message
   * @param {Object} options - Additional error options
   * @param {string} options.resourceId - ID of the resource that was not found
   * @param {string} options.resourceType - Type of resource (e.g., 'room', 'participant')
   * @param {Error} [options.cause] - The error that caused this error
   */
  constructor(message: string, options: { 
    resourceId: string, 
    resourceType: string,
    cause?: Error
  }) {
    super(message, { 
      statusCode: 404, 
      apiErrorMessage: `${options.resourceType} with ID ${options.resourceId} not found`
    });
    this.name = 'ResourceNotFoundError';
    this.resourceType = options.resourceType;
    this.resourceId = options.resourceId;
  }
}

/**
 * Error thrown when a request is invalid
 * 
 * This error is used for validation errors, such as missing required parameters
 * or invalid parameter values.
 * 
 * @class ValidationError
 * @extends DigitalSambaError
 * @property {Record<string, string>} validationErrors - Map of field names to error messages
 * @example
 * throw new ValidationError('Invalid request parameters', {
 *   validationErrors: {
 *     'name': 'Name is required',
 *     'email': 'Email is not valid'
 *   }
 * });
 */
export class ValidationError extends DigitalSambaError {
  validationErrors: Record<string, string>;
  
  /**
   * Create a new ValidationError
   * 
   * @param {string} message - Error message
   * @param {Object} options - Additional error options
   * @param {Record<string, string>} options.validationErrors - Map of field names to error messages
   * @param {Error} [options.cause] - The error that caused this error
   */
  constructor(message: string, options: { 
    validationErrors: Record<string, string>,
    cause?: Error
  }) {
    super(message);
    this.name = 'ValidationError';
    this.validationErrors = options.validationErrors;
  }
}

/**
 * Error thrown when a feature is not implemented
 * 
 * This error is used when attempting to use a feature that is not yet implemented.
 * 
 * @class NotImplementedError
 * @extends DigitalSambaError
 * @example
 * throw new NotImplementedError('This feature is not yet implemented');
 */
export class NotImplementedError extends DigitalSambaError {
  /**
   * Create a new NotImplementedError
   * 
   * @param {string} message - Error message
   * @param {Object} [options] - Additional error options
   * @param {Error} [options.cause] - The error that caused this error
   */
  constructor(message: string, _options?: { cause?: Error }) {
    super(message);
    this.name = 'NotImplementedError';
  }
}

/**
 * Error thrown when a configuration value is missing
 * 
 * This error is used when a required configuration value is not provided.
 * 
 * @class ConfigurationError
 * @extends DigitalSambaError
 * @example
 * throw new ConfigurationError('Missing required configuration value: API_KEY');
 */
export class ConfigurationError extends DigitalSambaError {
  /**
   * Create a new ConfigurationError
   * 
   * @param {string} message - Error message
   * @param {Object} [options] - Additional error options
   * @param {Error} [options.cause] - The error that caused this error
   */
  constructor(message: string, _options?: { cause?: Error }) {
    super(message);
    this.name = 'ConfigurationError';
  }
}

/**
 * Error thrown when a session operation fails
 * 
 * This error is used for session-related operations such as session initialization,
 * session context access, or session termination.
 * 
 * @class SessionError
 * @extends DigitalSambaError
 * @example
 * throw new SessionError('Failed to initialize session', { sessionId: '123' });
 */
export class SessionError extends DigitalSambaError {
  sessionId?: string;
  
  /**
   * Create a new SessionError
   * 
   * @param {string} message - Error message
   * @param {Object} [options] - Additional error options
   * @param {string} [options.sessionId] - ID of the session that caused the error
   * @param {Error} [options.cause] - The error that caused this error
   */
  constructor(message: string, options?: { 
    sessionId?: string,
    cause?: Error
  }) {
    super(message);
    this.name = 'SessionError';
    this.sessionId = options?.sessionId;
  }
}

/**
 * Error thrown when a service is in a degraded state
 * 
 * This error is used when a service operation fails due to degraded service health,
 * and no fallback strategies are available or all fallbacks have failed.
 * 
 * @class DegradedServiceError
 * @extends DigitalSambaError
 * @property {string} operationName - Name of the operation that failed
 * @property {string} componentStatus - Status of the component that is degraded
 * @property {string[]} attemptedStrategies - List of strategies that were attempted
 * @example
 * throw new DegradedServiceError('Service unavailable', { 
 *   operationName: 'listRooms',
 *   componentStatus: 'SEVERELY_DEGRADED',
 *   attemptedStrategies: ['retry', 'cache', 'fallback']
 * });
 */
export class DegradedServiceError extends DigitalSambaError {
  operationName: string;
  componentStatus?: string;
  attemptedStrategies: string[];
  
  /**
   * Create a new DegradedServiceError
   * 
   * @param {string} message - Error message
   * @param {Object} options - Additional error options
   * @param {string} options.operationName - Name of the operation that failed
   * @param {string} [options.componentStatus] - Status of the component that is degraded
   * @param {string[]} [options.attemptedStrategies] - List of strategies that were attempted
   * @param {Error} [options.cause] - The error that caused this error
   */
  constructor(message: string, options: { 
    operationName: string,
    componentStatus?: string,
    attemptedStrategies?: string[],
    cause?: Error
  }) {
    super(message);
    this.name = 'DegradedServiceError';
    this.operationName = options.operationName;
    this.componentStatus = options.componentStatus;
    this.attemptedStrategies = options.attemptedStrategies || [];
  }
}

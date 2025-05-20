/**
 * Authentication utilities for the Digital Samba MCP Server
 * 
 * This module provides functions and classes for handling API key authentication
 * with the Digital Samba API. It supports extracting API keys from HTTP headers,
 * storing them in a session context, and retrieving them when needed for API calls.
 *
 * @module auth
 * @author Digital Samba Team
 * @version 0.1.0
 */
// External dependencies
import { Request } from 'express';

// MCP SDK imports
import { RequestMeta } from '@modelcontextprotocol/sdk/types.js';

// Local modules
import logger from './logger.js';

/**
 * Extracts API key from Authorization header
 * 
 * This function parses the Authorization header to extract a Bearer token.
 * It expects the format: 'Bearer YOUR_API_KEY'
 * 
 * @param {Request} req - Express request object containing headers
 * @returns {string|null} The extracted API key or null if not found or invalid
 * @example
 * const apiKey = extractApiKey(req);
 * if (apiKey) {
 *   // Use apiKey for authentication
 * }
 */
export function extractApiKey(req: Request): string | null {
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    logger.debug('No Authorization header present');
    return null;
  }
  
  logger.debug(`Authorization header detected (masked)`);
  
  // Check if it's a Bearer token
  if (!authHeader.startsWith('Bearer ')) {
    logger.debug('Authorization header is not a Bearer token');
    return null;
  }
  
  // Extract the token
  const apiKey = authHeader.slice(7).trim();
  
  if (!apiKey) {
    logger.debug('Empty API key in Authorization header');
    return null;
  }
  
  logger.debug(`Successfully extracted API key (length: ${apiKey.length})`);
  return apiKey;
}

/**
 * API Key context for the current MCP session
 * 
 * Singleton class that maintains a mapping between session IDs and their
 * corresponding API keys. This allows the system to store and retrieve
 * API keys based on the session context, enabling stateful authentication
 * across multiple requests within the same session.
 */
export class ApiKeyContext {
  private static instance: ApiKeyContext;
  private apiKeys: Map<string, string> = new Map();
  private currentSessionId?: string;
  
  private constructor() {}
  
  public static getInstance(): ApiKeyContext {
    if (!ApiKeyContext.instance) {
      ApiKeyContext.instance = new ApiKeyContext();
    }
    return ApiKeyContext.instance;
  }
  
  /**
   * Store API key for a session
   * 
   * Associates an API key with a specific session ID and sets it as the current session.
   * 
   * @param {string} sessionId - The unique identifier for the session
   * @param {string} apiKey - The Digital Samba API key to store
   */
  public setApiKey(sessionId: string, apiKey: string): void {
    logger.debug(`Storing API key for session ${sessionId}`);
    this.apiKeys.set(sessionId, apiKey);
    this.currentSessionId = sessionId;
  }
  
  /**
   * Get API key for a session
   * 
   * Retrieves the API key associated with the specified session ID.
   * 
   * @param {string} sessionId - The unique identifier for the session
   * @returns {string|undefined} The API key if found, undefined otherwise
   */
  public getApiKey(sessionId: string): string | undefined {
    const apiKey = this.apiKeys.get(sessionId);
    logger.debug(`Getting API key for session ${sessionId}: ${apiKey ? 'found' : 'not found'}`);
    return apiKey;
  }
  
  /**
   * Remove API key for a session
   * 
   * Removes the API key associated with the specified session ID.
   * If this was the current session, clears the current session reference.
   * 
   * @param {string} sessionId - The unique identifier for the session to remove
   */
  public removeApiKey(sessionId: string): void {
    logger.debug(`Removing API key for session ${sessionId}`);
    this.apiKeys.delete(sessionId);
    if (this.currentSessionId === sessionId) {
      this.currentSessionId = undefined;
    }
  }
  
  /**
   * Get the current API key (from the most recently used session)
   * 
   * Retrieves the API key associated with the most recently used session.
   * This is useful when the session context is not explicitly provided.
   * 
   * @returns {string|undefined} The API key if a current session exists, undefined otherwise
   */
  public getCurrentApiKey(): string | undefined {
    if (!this.currentSessionId) {
      logger.debug('No current session ID available');
      return undefined;
    }
    
    return this.getApiKey(this.currentSessionId);
  }
}

// Create singleton instance
const apiKeyContext = ApiKeyContext.getInstance();

/**
 * Gets API key from MCP request context
 * 
 * This function attempts to retrieve an API key using a multi-tiered approach:
 * 1. First tries to get the API key from the session context if a sessionId exists
 * 2. Falls back to the DIGITAL_SAMBA_API_KEY environment variable if available
 * 3. If an environment API key is found and a sessionId exists, stores the key in the session context
 * 
 * @param {RequestMeta & { sessionId?: string }} request - The MCP request metadata object
 * @returns {string|null} The API key if found through any method, null otherwise
 * @example
 * const apiKey = getApiKeyFromRequest(request);
 * if (!apiKey) {
 *   throw new Error('No API key found. Please include an Authorization header with a Bearer token.');
 * }
 */
export function getApiKeyFromRequest(request: RequestMeta & { sessionId?: string, context?: { sessionId?: string } }): string | null {
  // Safety check for undefined request
  if (!request) {
    logger.warn('Request object is undefined when trying to get API key');
    return process.env.DIGITAL_SAMBA_API_KEY || null;
  }

  // Try to get from session context
  let sessionId = request.sessionId;
  if (!sessionId && request.context && request.context.sessionId) {
    sessionId = request.context.sessionId;
    logger.debug(`Got sessionId from request.context: ${sessionId}`);
  }
  
  if (sessionId) {
    logger.debug(`Looking for API key for session ID: ${sessionId}`);
    const contextApiKey = apiKeyContext.getApiKey(sessionId);
    if (contextApiKey) {
      logger.debug(`Found API key in session context for ${sessionId}`);
      return contextApiKey;
    }
  } else {
    logger.debug('No session ID in request');
  }
  
  // Try to get from environment variable
  const envApiKey = process.env.DIGITAL_SAMBA_API_KEY;
  if (envApiKey) {
    logger.debug('Using API key from environment variable');
    
    // If we have a session ID, store this API key for future use
    if (sessionId) {
      apiKeyContext.setApiKey(sessionId, envApiKey);
    }
    
    return envApiKey;
  }
  
  logger.debug('No API key found in context or environment');
  return null;
}

export default apiKeyContext;
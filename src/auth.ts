/**
 * Authentication utilities for the Digital Samba MCP Server
 */
import { Request } from 'express';
import logger from './logger.js';
import { RequestMeta } from '@modelcontextprotocol/sdk/types.js';

/**
 * Extracts API key from Authorization header
 * Expects format: 'Bearer YOUR_API_KEY'
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
   */
  public setApiKey(sessionId: string, apiKey: string): void {
    logger.debug(`Storing API key for session ${sessionId}`);
    this.apiKeys.set(sessionId, apiKey);
    this.currentSessionId = sessionId;
  }
  
  /**
   * Get API key for a session
   */
  public getApiKey(sessionId: string): string | undefined {
    const apiKey = this.apiKeys.get(sessionId);
    logger.debug(`Getting API key for session ${sessionId}: ${apiKey ? 'found' : 'not found'}`);
    return apiKey;
  }
  
  /**
   * Remove API key for a session
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
 * This function tries to get the API key from the session context first,
 * then falls back to the global API key if available.
 */
export function getApiKeyFromRequest(request: RequestMeta & { sessionId?: string }): string | null {
  // Try to get from session context
  const sessionId = request.sessionId;
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
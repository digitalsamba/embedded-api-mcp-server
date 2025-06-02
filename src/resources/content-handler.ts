/**
 * Content Resources Handler
 * Simple handler for content/library resources
 */

import { Resource } from '@modelcontextprotocol/sdk/types.js';
import { DigitalSambaApiClient } from '../digital-samba-api.js';

export function registerContentResources(): Resource[] {
  return [
    {
      uri: 'digitalsamba://content/libraries',
      name: 'Content Libraries',
      description: 'List all content libraries',
      mimeType: 'application/json'
    }
  ];
}

export async function handleContentResource(uri: string, client: DigitalSambaApiClient) {
  const url = new URL(uri);
  const pathParts = url.pathname.split('/').filter(Boolean);
  
  if (pathParts[0] === 'content' && pathParts[1] === 'libraries') {
    // List all libraries
    const libraries = await client.listLibraries();
    return {
      contents: [{
        type: 'application/json',
        text: JSON.stringify(libraries, null, 2)
      }]
    };
  }
  
  throw new Error(`Unknown content resource: ${uri}`);
}
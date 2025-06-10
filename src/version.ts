/**
 * Version information module
 * In development, this reads directly from package.json
 * In production, this is replaced by the build script
 */

// Try to read package.json in development
let versionInfo: any;
try {
  // Development path - this will fail in production build
  const packageJson = require('../package.json');
  versionInfo = {
    version: packageJson.version,
    name: packageJson.name,
    buildTime: 'development',
    nodeVersion: process.version
  };
} catch {
  // Production build - use injected values
  versionInfo = {
    version: 'unknown',
    name: '@digitalsamba/embedded-api-mcp-server',
    buildTime: 'unknown',
    nodeVersion: process.version
  };
}

export const VERSION_INFO = versionInfo;
export const VERSION = versionInfo.version;
export const PACKAGE_NAME = versionInfo.name;
export const BUILD_TIME = versionInfo.buildTime;
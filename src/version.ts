/**
 * Version information module
 * In development, this reads directly from package.json
 * In production, this is replaced by the build script
 */

// Default version info - will be replaced by build script in production
const versionInfo = {
  version: "0.1.1",
  name: "@digitalsamba/embedded-api-mcp-server",
  buildTime: "development",
  nodeVersion: process.version,
};

export const VERSION_INFO = versionInfo;
export const VERSION = versionInfo.version;
export const PACKAGE_NAME = versionInfo.name;
export const BUILD_TIME = versionInfo.buildTime;

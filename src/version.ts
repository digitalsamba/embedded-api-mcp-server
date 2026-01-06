/**
 * Version information module
 *
 * In development: reads from package.json
 * In production: reads from version.json (generated at build time)
 *
 * version.json contains git info:
 * - commit: short SHA
 * - ref: branch name or tag
 * - buildTime: ISO timestamp
 */

import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

interface VersionInfo {
  version: string;
  name: string;
  commit: string;
  ref: string;
  buildTime: string;
  commitsAhead: number;
  nodeVersion: string;
}

let versionInfo: VersionInfo;

try {
  // Get the directory of this file
  const __dirname = dirname(fileURLToPath(import.meta.url));

  // Try to read package.json
  const packageJsonPath = join(__dirname, "..", "..", "package.json");
  const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8"));

  // Try to read version.json (production builds)
  let gitInfo = { commit: "dev", ref: "local", buildTime: "development", commitsAhead: 0 };
  try {
    const versionJsonPath = join(__dirname, "..", "..", "version.json");
    gitInfo = JSON.parse(readFileSync(versionJsonPath, "utf-8"));
  } catch {
    // version.json doesn't exist in development - that's fine
  }

  versionInfo = {
    version: packageJson.version,
    name: packageJson.name,
    commit: gitInfo.commit,
    ref: gitInfo.ref,
    buildTime: gitInfo.buildTime,
    commitsAhead: gitInfo.commitsAhead || 0,
    nodeVersion: process.version,
  };
} catch {
  // Fallback if nothing works
  versionInfo = {
    version: "unknown",
    name: "@digitalsamba/embedded-api-mcp-server",
    commit: "unknown",
    ref: "unknown",
    buildTime: "unknown",
    commitsAhead: 0,
    nodeVersion: process.version,
  };
}

export const VERSION_INFO = versionInfo;
export const VERSION = versionInfo.version;
export const PACKAGE_NAME = versionInfo.name;
export const BUILD_TIME = versionInfo.buildTime;
export const GIT_COMMIT = versionInfo.commit;
export const GIT_REF = versionInfo.ref;
export const COMMITS_AHEAD = versionInfo.commitsAhead;

/**
 * Get a formatted version string for display
 * Examples:
 * - Production (on tag): "1.0.0"
 * - Development: "1.0.0-rc.1 (e5f1b19)"
 */
export function getDisplayVersion(): string {
  // If commit is a tag ref or matches version, just show version
  if (
    versionInfo.ref.startsWith("v") ||
    versionInfo.commit === "dev" ||
    versionInfo.commit === "unknown"
  ) {
    return versionInfo.version;
  }
  // Otherwise show version with commit
  return `${versionInfo.version} (${versionInfo.commit})`;
}

/**
 * Check if this is a development build
 */
export function isDevBuild(): boolean {
  return (
    versionInfo.buildTime === "development" ||
    versionInfo.ref === "develop" ||
    versionInfo.ref.includes("dev")
  );
}

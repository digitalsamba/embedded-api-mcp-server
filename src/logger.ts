/**
 * Simple logger for Digital Samba MCP Server
 * Uses console methods that write to stderr to avoid interfering with stdio transport
 */

const LOG_LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
} as const;

type LogLevel = keyof typeof LOG_LEVELS;

// DS_LOG_LEVEL is the documented name, but LOG_LEVEL is the conventional one
// and gets set by mistake - production ran silently at "warn" for months
// because the host set LOG_LEVEL=info and nothing read it. Accept both.
const currentLogLevel =
  LOG_LEVELS[process.env.DS_LOG_LEVEL as LogLevel] ??
  LOG_LEVELS[process.env.LOG_LEVEL as LogLevel] ??
  LOG_LEVELS.warn;

const logger = {
  error: (message: string, ...args: unknown[]) => {
    if (currentLogLevel >= LOG_LEVELS.error) {
      console.error(`[ERROR] ${message}`, ...args);
    }
  },

  warn: (message: string, ...args: unknown[]) => {
    if (currentLogLevel >= LOG_LEVELS.warn) {
      console.error(`[WARN] ${message}`, ...args);
    }
  },

  info: (message: string, ...args: unknown[]) => {
    if (currentLogLevel >= LOG_LEVELS.info) {
      console.error(`[INFO] ${message}`, ...args);
    }
  },

  debug: (message: string, ...args: unknown[]) => {
    if (currentLogLevel >= LOG_LEVELS.debug) {
      console.error(`[DEBUG] ${message}`, ...args);
    }
  },
};

export default logger;

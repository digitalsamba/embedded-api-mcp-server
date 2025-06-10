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

const currentLogLevel =
  LOG_LEVELS[process.env.DS_LOG_LEVEL as LogLevel] ?? LOG_LEVELS.info;

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

/**
 * Tests for logger module
 */

import logger from "../../src/logger.js";

describe("logger", () => {
  let consoleErrorSpy: jest.SpyInstance;
  const originalEnv = process.env.DS_LOG_LEVEL;

  beforeEach(() => {
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    process.env.DS_LOG_LEVEL = originalEnv;
  });

  describe("log levels", () => {
    it("should log error messages when log level is error", () => {
      process.env.DS_LOG_LEVEL = "error";
      // Force re-evaluation of currentLogLevel
      jest.resetModules();
      const loggerWithErrorLevel = require("../../src/logger.js").default;

      loggerWithErrorLevel.error("test error", { extra: "data" });
      expect(consoleErrorSpy).toHaveBeenCalledWith("[ERROR] test error", {
        extra: "data",
      });
    });

    it("should log warn messages when log level is warn", () => {
      process.env.DS_LOG_LEVEL = "warn";
      jest.resetModules();
      const loggerWithWarnLevel = require("../../src/logger.js").default;

      loggerWithWarnLevel.warn("test warning", "extra");
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "[WARN] test warning",
        "extra",
      );
    });

    it("should log info messages when log level is info", () => {
      process.env.DS_LOG_LEVEL = "info";
      jest.resetModules();
      const loggerWithInfoLevel = require("../../src/logger.js").default;

      loggerWithInfoLevel.info("test info");
      expect(consoleErrorSpy).toHaveBeenCalledWith("[INFO] test info");
    });

    it("should log debug messages when log level is debug", () => {
      process.env.DS_LOG_LEVEL = "debug";
      jest.resetModules();
      const loggerWithDebugLevel = require("../../src/logger.js").default;

      loggerWithDebugLevel.debug("test debug", 1, 2, 3);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "[DEBUG] test debug",
        1,
        2,
        3,
      );
    });
  });

  describe("log level filtering", () => {
    it("should not log info messages when log level is warn", () => {
      process.env.DS_LOG_LEVEL = "warn";
      jest.resetModules();
      const loggerWithWarnLevel = require("../../src/logger.js").default;

      loggerWithWarnLevel.info("should not appear");
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    it("should not log debug messages when log level is info", () => {
      process.env.DS_LOG_LEVEL = "info";
      jest.resetModules();
      const loggerWithInfoLevel = require("../../src/logger.js").default;

      loggerWithInfoLevel.debug("should not appear");
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    it("should use default warn level when DS_LOG_LEVEL is not set", () => {
      delete process.env.DS_LOG_LEVEL;
      jest.resetModules();
      const loggerWithDefaultLevel = require("../../src/logger.js").default;

      loggerWithDefaultLevel.warn("should appear");
      loggerWithDefaultLevel.info("should not appear");

      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      expect(consoleErrorSpy).toHaveBeenCalledWith("[WARN] should appear");
    });

    it("should use default warn level when DS_LOG_LEVEL is invalid", () => {
      process.env.DS_LOG_LEVEL = "invalid";
      jest.resetModules();
      const loggerWithInvalidLevel = require("../../src/logger.js").default;

      loggerWithInvalidLevel.error("should appear");
      loggerWithInvalidLevel.warn("should also appear");
      loggerWithInvalidLevel.info("should not appear");

      expect(consoleErrorSpy).toHaveBeenCalledTimes(2);
    });
  });

  describe("LOG_LEVEL fallback", () => {
    // Production ran silently at "warn" for months because the host set
    // LOG_LEVEL=info while only DS_LOG_LEVEL was read. Both are accepted now.
    const originalLogLevel = process.env.LOG_LEVEL;

    afterEach(() => {
      if (originalLogLevel === undefined) {
        delete process.env.LOG_LEVEL;
      } else {
        process.env.LOG_LEVEL = originalLogLevel;
      }
    });

    it("honours LOG_LEVEL when DS_LOG_LEVEL is not set", () => {
      delete process.env.DS_LOG_LEVEL;
      process.env.LOG_LEVEL = "info";
      jest.resetModules();
      const log = require("../../src/logger.js").default;

      log.info("should appear");
      expect(consoleErrorSpy).toHaveBeenCalledWith("[INFO] should appear");
    });

    it("lets DS_LOG_LEVEL win when both are set", () => {
      process.env.DS_LOG_LEVEL = "error";
      process.env.LOG_LEVEL = "debug";
      jest.resetModules();
      const log = require("../../src/logger.js").default;

      log.warn("should not appear");
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    it("still defaults to warn when neither is set", () => {
      delete process.env.DS_LOG_LEVEL;
      delete process.env.LOG_LEVEL;
      jest.resetModules();
      const log = require("../../src/logger.js").default;

      log.warn("should appear");
      log.info("should not appear");
      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    });
  });
});

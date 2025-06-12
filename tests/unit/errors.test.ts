/**
 * Tests for error classes
 */

import {
  DigitalSambaError,
  AuthenticationError,
  ApiRequestError,
  ApiResponseError,
  ResourceNotFoundError,
  ValidationError,
  NotImplementedError,
  ConfigurationError,
  SessionError,
  DegradedServiceError,
} from "../../src/errors.js";

describe("Error Classes", () => {
  describe("DigitalSambaError", () => {
    it("should create error with message", () => {
      const error = new DigitalSambaError("Test error");
      expect(error.message).toBe("Test error");
      expect(error.name).toBe("DigitalSambaError");
      expect(error).toBeInstanceOf(Error);
    });

    it("should create error with cause", () => {
      const cause = new Error("Original error");
      const error = new DigitalSambaError("Test error", { cause });
      expect(error.message).toBe("Test error");
      expect(error.name).toBe("DigitalSambaError");
    });
  });

  describe("AuthenticationError", () => {
    it("should create authentication error", () => {
      const error = new AuthenticationError("Invalid API key");
      expect(error.message).toBe("Invalid API key");
      expect(error.name).toBe("AuthenticationError");
      expect(error).toBeInstanceOf(DigitalSambaError);
    });

    it("should create authentication error with cause", () => {
      const cause = new Error("Network error");
      const error = new AuthenticationError("Auth failed", { cause });
      expect(error.message).toBe("Auth failed");
      expect(error.name).toBe("AuthenticationError");
    });
  });

  describe("ApiRequestError", () => {
    it("should create API request error", () => {
      const error = new ApiRequestError("Network timeout");
      expect(error.message).toBe("Network timeout");
      expect(error.name).toBe("ApiRequestError");
      expect(error).toBeInstanceOf(DigitalSambaError);
    });

    it("should create API request error with cause", () => {
      const cause = new Error("Socket closed");
      const error = new ApiRequestError("Request failed", { cause });
      expect(error.message).toBe("Request failed");
      expect(error.name).toBe("ApiRequestError");
    });
  });

  describe("ApiResponseError", () => {
    it("should create API response error with all fields", () => {
      const error = new ApiResponseError("Bad request", {
        statusCode: 400,
        apiErrorMessage: "Invalid parameters",
        apiErrorData: { field: "name", error: "required" },
      });
      expect(error.message).toBe("Bad request");
      expect(error.name).toBe("ApiResponseError");
      expect(error.statusCode).toBe(400);
      expect(error.apiErrorMessage).toBe("Invalid parameters");
      expect(error.apiErrorData).toEqual({ field: "name", error: "required" });
      expect(error).toBeInstanceOf(DigitalSambaError);
    });

    it("should create API response error without optional data", () => {
      const error = new ApiResponseError("Server error", {
        statusCode: 500,
        apiErrorMessage: "Internal server error",
      });
      expect(error.statusCode).toBe(500);
      expect(error.apiErrorMessage).toBe("Internal server error");
      expect(error.apiErrorData).toBeUndefined();
    });

    it("should create API response error with cause", () => {
      const cause = new Error("Original");
      const error = new ApiResponseError("Error", {
        statusCode: 404,
        apiErrorMessage: "Not found",
        cause,
      });
      expect(error.message).toBe("Error");
    });
  });

  describe("ResourceNotFoundError", () => {
    it("should create resource not found error", () => {
      const error = new ResourceNotFoundError("Room not found", {
        resourceId: "room123",
        resourceType: "room",
      });
      expect(error.message).toBe("Room not found");
      expect(error.name).toBe("ResourceNotFoundError");
      expect(error.statusCode).toBe(404);
      expect(error.apiErrorMessage).toBe("room with ID room123 not found");
      expect(error.resourceId).toBe("room123");
      expect(error.resourceType).toBe("room");
      expect(error).toBeInstanceOf(ApiResponseError);
    });

    it("should create resource not found error with cause", () => {
      const cause = new Error("DB error");
      const error = new ResourceNotFoundError("Not found", {
        resourceId: "123",
        resourceType: "session",
        cause,
      });
      expect(error.resourceType).toBe("session");
    });
  });

  describe("ValidationError", () => {
    it("should create validation error", () => {
      const validationErrors = {
        name: "Name is required",
        email: "Invalid email format",
      };
      const error = new ValidationError("Validation failed", {
        validationErrors,
      });
      expect(error.message).toBe("Validation failed");
      expect(error.name).toBe("ValidationError");
      expect(error.validationErrors).toEqual(validationErrors);
      expect(error).toBeInstanceOf(DigitalSambaError);
    });

    it("should create validation error with cause", () => {
      const cause = new Error("Schema error");
      const error = new ValidationError("Invalid input", {
        validationErrors: { field: "error" },
        cause,
      });
      expect(error.validationErrors).toEqual({ field: "error" });
    });
  });

  describe("NotImplementedError", () => {
    it("should create not implemented error", () => {
      const error = new NotImplementedError("Feature not available");
      expect(error.message).toBe("Feature not available");
      expect(error.name).toBe("NotImplementedError");
      expect(error).toBeInstanceOf(DigitalSambaError);
    });

    it("should create not implemented error with cause", () => {
      const cause = new Error("Legacy");
      const error = new NotImplementedError("Not implemented", { cause });
      expect(error.message).toBe("Not implemented");
    });
  });

  describe("ConfigurationError", () => {
    it("should create configuration error", () => {
      const error = new ConfigurationError("Missing API_KEY");
      expect(error.message).toBe("Missing API_KEY");
      expect(error.name).toBe("ConfigurationError");
      expect(error).toBeInstanceOf(DigitalSambaError);
    });

    it("should create configuration error with cause", () => {
      const cause = new Error("Env error");
      const error = new ConfigurationError("Config invalid", { cause });
      expect(error.message).toBe("Config invalid");
    });
  });

  describe("SessionError", () => {
    it("should create session error without sessionId", () => {
      const error = new SessionError("Session failed");
      expect(error.message).toBe("Session failed");
      expect(error.name).toBe("SessionError");
      expect(error.sessionId).toBeUndefined();
      expect(error).toBeInstanceOf(DigitalSambaError);
    });

    it("should create session error with sessionId", () => {
      const error = new SessionError("Session expired", {
        sessionId: "session123",
      });
      expect(error.message).toBe("Session expired");
      expect(error.sessionId).toBe("session123");
    });

    it("should create session error with cause", () => {
      const cause = new Error("Timeout");
      const error = new SessionError("Session error", {
        sessionId: "123",
        cause,
      });
      expect(error.sessionId).toBe("123");
    });
  });

  describe("DegradedServiceError", () => {
    it("should create degraded service error with all fields", () => {
      const error = new DegradedServiceError("Service unavailable", {
        operationName: "listRooms",
        componentStatus: "SEVERELY_DEGRADED",
        attemptedStrategies: ["retry", "cache", "fallback"],
      });
      expect(error.message).toBe("Service unavailable");
      expect(error.name).toBe("DegradedServiceError");
      expect(error.operationName).toBe("listRooms");
      expect(error.componentStatus).toBe("SEVERELY_DEGRADED");
      expect(error.attemptedStrategies).toEqual(["retry", "cache", "fallback"]);
      expect(error).toBeInstanceOf(DigitalSambaError);
    });

    it("should create degraded service error with minimal fields", () => {
      const error = new DegradedServiceError("Degraded", {
        operationName: "getRoom",
      });
      expect(error.operationName).toBe("getRoom");
      expect(error.componentStatus).toBeUndefined();
      expect(error.attemptedStrategies).toEqual([]);
    });

    it("should create degraded service error with cause", () => {
      const cause = new Error("Circuit open");
      const error = new DegradedServiceError("Service degraded", {
        operationName: "test",
        cause,
      });
      expect(error.operationName).toBe("test");
    });
  });
});
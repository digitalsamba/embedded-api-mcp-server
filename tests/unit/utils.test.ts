/**
 * Unit tests for utility functions
 *
 * @module tests/unit/utils
 */

import { normalizeBoolean, normalizeBooleans, BOOLEAN_FIELDS } from "../../src/utils.js";

describe("normalizeBoolean", () => {
  describe("handles native booleans", () => {
    it("should return true for true", () => {
      expect(normalizeBoolean(true)).toBe(true);
    });

    it("should return false for false", () => {
      expect(normalizeBoolean(false)).toBe(false);
    });
  });

  describe("handles numeric values (0/1)", () => {
    it("should return false for 0", () => {
      expect(normalizeBoolean(0)).toBe(false);
    });

    it("should return true for 1", () => {
      expect(normalizeBoolean(1)).toBe(true);
    });

    it("should return undefined for other numbers", () => {
      expect(normalizeBoolean(2)).toBeUndefined();
      expect(normalizeBoolean(-1)).toBeUndefined();
      expect(normalizeBoolean(0.5)).toBeUndefined();
    });
  });

  describe("handles string values", () => {
    it("should return true for 'true'", () => {
      expect(normalizeBoolean("true")).toBe(true);
      expect(normalizeBoolean("TRUE")).toBe(true);
      expect(normalizeBoolean("True")).toBe(true);
    });

    it("should return false for 'false'", () => {
      expect(normalizeBoolean("false")).toBe(false);
      expect(normalizeBoolean("FALSE")).toBe(false);
      expect(normalizeBoolean("False")).toBe(false);
    });

    it("should return true for '1'", () => {
      expect(normalizeBoolean("1")).toBe(true);
    });

    it("should return false for '0'", () => {
      expect(normalizeBoolean("0")).toBe(false);
    });

    it("should return true for 'yes'", () => {
      expect(normalizeBoolean("yes")).toBe(true);
      expect(normalizeBoolean("YES")).toBe(true);
    });

    it("should return false for 'no'", () => {
      expect(normalizeBoolean("no")).toBe(false);
      expect(normalizeBoolean("NO")).toBe(false);
    });

    it("should handle whitespace", () => {
      expect(normalizeBoolean("  true  ")).toBe(true);
      expect(normalizeBoolean("  false  ")).toBe(false);
    });

    it("should return undefined for other strings", () => {
      expect(normalizeBoolean("maybe")).toBeUndefined();
      expect(normalizeBoolean("")).toBeUndefined();
    });
  });

  describe("handles null and undefined", () => {
    it("should return undefined for undefined", () => {
      expect(normalizeBoolean(undefined)).toBeUndefined();
    });

    it("should return undefined for null", () => {
      expect(normalizeBoolean(null)).toBeUndefined();
    });
  });

  describe("handles other types", () => {
    it("should return undefined for objects", () => {
      expect(normalizeBoolean({})).toBeUndefined();
    });

    it("should return undefined for arrays", () => {
      expect(normalizeBoolean([])).toBeUndefined();
    });
  });
});

describe("normalizeBooleans", () => {
  it("should normalize known boolean fields from 0/1 to true/false", () => {
    const input = {
      name: "Test Room",
      chat_enabled: 1,
      recordings_enabled: 0,
      topbar_enabled: true,
      toolbar_enabled: false,
    };

    const result = normalizeBooleans(input);

    expect(result.name).toBe("Test Room");
    expect(result.chat_enabled).toBe(true);
    expect(result.recordings_enabled).toBe(false);
    expect(result.topbar_enabled).toBe(true);
    expect(result.toolbar_enabled).toBe(false);
  });

  it("should normalize camelCase boolean fields", () => {
    const input = {
      chatEnabled: 1,
      recordingsEnabled: 0,
      topbarEnabled: "true",
      toolbarEnabled: "false",
    };

    const result = normalizeBooleans(input);

    expect(result.chatEnabled).toBe(true);
    expect(result.recordingsEnabled).toBe(false);
    expect(result.topbarEnabled).toBe(true);
    expect(result.toolbarEnabled).toBe(false);
  });

  it("should not modify non-boolean fields", () => {
    const input = {
      name: "Test Room",
      max_participants: 100,
      privacy: "public",
    };

    const result = normalizeBooleans(input);

    expect(result.name).toBe("Test Room");
    expect(result.max_participants).toBe(100);
    expect(result.privacy).toBe("public");
  });

  it("should normalize nested objects (like settings)", () => {
    const input = {
      settings: {
        chat_enabled: 1,
        recordings_enabled: 0,
      },
    };

    const result = normalizeBooleans(input);

    expect((result.settings as any).chat_enabled).toBe(true);
    expect((result.settings as any).recordings_enabled).toBe(false);
  });

  it("should not modify arrays", () => {
    const input = {
      roles: ["admin", "user"],
      chat_enabled: 1,
    };

    const result = normalizeBooleans(input);

    expect(result.roles).toEqual(["admin", "user"]);
    expect(result.chat_enabled).toBe(true);
  });

  it("should handle mixed input from Claude", () => {
    // This simulates real-world input where Claude might send a mix of formats
    const input = {
      name: "My Meeting Room",
      privacy: "private",
      max_participants: 50,
      // Claude might send these in various formats
      chatEnabled: 1, // numeric
      recordingsEnabled: "true", // string
      topbarEnabled: true, // proper boolean
      toolbarEnabled: 0, // numeric false
      qaEnabled: false, // proper boolean
    };

    const result = normalizeBooleans(input);

    expect(result.name).toBe("My Meeting Room");
    expect(result.privacy).toBe("private");
    expect(result.max_participants).toBe(50);
    expect(result.chatEnabled).toBe(true);
    expect(result.recordingsEnabled).toBe(true);
    expect(result.topbarEnabled).toBe(true);
    expect(result.toolbarEnabled).toBe(false);
    expect(result.qaEnabled).toBe(false);
  });
});

describe("BOOLEAN_FIELDS", () => {
  it("should contain all known room boolean fields", () => {
    const expectedFields = [
      "is_locked",
      "isLocked",
      "chat_enabled",
      "chatEnabled",
      "recordings_enabled",
      "recordingsEnabled",
      "topbar_enabled",
      "topbarEnabled",
      "toolbar_enabled",
      "toolbarEnabled",
    ];

    for (const field of expectedFields) {
      expect(BOOLEAN_FIELDS.has(field)).toBe(true);
    }
  });

  it("should contain both snake_case and camelCase versions", () => {
    // Verify we have pairs
    expect(BOOLEAN_FIELDS.has("chat_enabled")).toBe(true);
    expect(BOOLEAN_FIELDS.has("chatEnabled")).toBe(true);
    expect(BOOLEAN_FIELDS.has("recordings_enabled")).toBe(true);
    expect(BOOLEAN_FIELDS.has("recordingsEnabled")).toBe(true);
  });
});

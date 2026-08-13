/**
 * Regression tests for the silent-drop bugs found during the 2026-08-13 sweep.
 *
 * update-role and update-webhook took their params with a rest spread and
 * handed them to the API unchanged. The API expects snake_case, so the
 * camelCase-only fields — displayName, authorizationHeader — were unknown
 * fields: ignored, still 200, and the tool then reported them as updated.
 * Their create-* counterparts had always mapped these fields, which is why the
 * bug only ever showed on update.
 *
 * Verified live on dev: renaming a role via update-role left the display name
 * unchanged while permissions in the same call did apply.
 */
import { executeRoleTool } from "../../src/tools/role-management/index.js";
import { executeWebhookTool } from "../../src/tools/webhook-management/index.js";

const textOf = (result: any): string => result.content[0].text;

describe("update-role", () => {
  it("sends display_name, not displayName", async () => {
    const apiClient: any = {
      updateRole: jest
        .fn()
        .mockResolvedValue({ id: "r1", display_name: "New Name" }),
    };

    await executeRoleTool(
      "update-role",
      { roleId: "r1", displayName: "New Name" },
      apiClient,
    );

    const payload = apiClient.updateRole.mock.calls[0][1];
    expect(payload).toHaveProperty("display_name", "New Name");
    expect(payload).not.toHaveProperty("displayName");
  });

  it("flags the rename as not applied when the API ignores it", async () => {
    // The exact live failure: 200 back, but the role still has the old name.
    const apiClient: any = {
      updateRole: jest
        .fn()
        .mockResolvedValue({ id: "r1", display_name: "Old Name" }),
    };

    const result = await executeRoleTool(
      "update-role",
      { roleId: "r1", displayName: "New Name" },
      apiClient,
    );

    expect(textOf(result)).toContain("NOT applied");
    expect(textOf(result)).toContain("Old Name");
  });

  it("still maps permissions and normalises their booleans", async () => {
    const apiClient: any = {
      updateRole: jest
        .fn()
        .mockResolvedValue({ id: "r1", display_name: "Role" }),
    };

    await executeRoleTool(
      "update-role",
      { roleId: "r1", permissions: { broadcast: 1, screenshare: 0 } },
      apiClient,
    );

    expect(apiClient.updateRole.mock.calls[0][1].permissions).toEqual({
      broadcast: true,
      screenshare: false,
    });
  });
});

describe("update-webhook", () => {
  it("sends authorization_header, not authorizationHeader", async () => {
    const apiClient: any = {
      updateWebhook: jest.fn().mockResolvedValue({ id: "w1", name: "hook" }),
    };

    await executeWebhookTool(
      "update-webhook",
      { webhookId: "w1", authorizationHeader: "Bearer xyz" },
      apiClient,
    );

    const payload = apiClient.updateWebhook.mock.calls[0][1];
    expect(payload).toHaveProperty("authorization_header", "Bearer xyz");
    expect(payload).not.toHaveProperty("authorizationHeader");
  });

  it("passes through the fields whose names already match", async () => {
    const apiClient: any = {
      updateWebhook: jest.fn().mockResolvedValue({ id: "w1", name: "hook" }),
    };

    await executeWebhookTool(
      "update-webhook",
      {
        webhookId: "w1",
        endpoint: "https://example.com/hook",
        events: ["session_started"],
      },
      apiClient,
    );

    expect(apiClient.updateWebhook.mock.calls[0][1]).toEqual({
      endpoint: "https://example.com/hook",
      events: ["session_started"],
    });
  });
});

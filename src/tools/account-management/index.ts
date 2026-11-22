/**
 * Account administration tools (#26 group 6).
 *
 * - list-alert-recipients: GET /alert-recipients
 * - create-alert-recipient: POST /alert-recipients
 * - update-alert-recipient: PATCH /alert-recipients/{id}
 * - delete-alert-recipient: DELETE /alert-recipients/{id}
 * - get-system-check-results: GET /system-checks/{supportId}
 *
 * Alert recipients are extra addresses for the team's usage alert emails; the
 * team owner always gets them and is not in the list. Every write is
 * confirmed by reading the list back, since a 2xx alone has misled this
 * server before.
 *
 * @module tools/account-management
 */

import { Tool } from "@modelcontextprotocol/sdk/types.js";
import {
  AlertRecipient,
  DigitalSambaApiClient,
} from "../../digital-samba-api.js";
import logger from "../../logger.js";
import { getToolAnnotations } from "../../tool-annotations.js";

export const ACCOUNT_TOOL_NAMES = [
  "list-alert-recipients",
  "create-alert-recipient",
  "update-alert-recipient",
  "delete-alert-recipient",
  "get-system-check-results",
] as const;

const OWNER_NOTE =
  "The team owner always receives usage alerts and is not part of this list.";

export function registerAccountTools(): Tool[] {
  return [
    {
      name: "list-alert-recipients",
      description: `[Account] List the extra email addresses that receive the team's usage alert emails (participation minutes nearing or over the plan limit). Use when users say: "who gets usage alerts", "alert recipients", "who is notified when we hit our limit". ${OWNER_NOTE} Returns id and email for each.`,
      annotations: getToolAnnotations(
        "list-alert-recipients",
        "List Alert Recipients",
      ),
      inputSchema: { type: "object", properties: {} },
    },
    {
      name: "create-alert-recipient",
      description: `[Account] Add an email address to the team's usage alert emails. Use when users say: "send usage alerts to", "add an alert recipient", "notify ops when we near our limit". The address must not already be a recipient. ${OWNER_NOTE} Confirmed by reading the list back.`,
      annotations: getToolAnnotations(
        "create-alert-recipient",
        "Create Alert Recipient",
      ),
      inputSchema: {
        type: "object",
        properties: {
          email: {
            type: "string",
            description: "Email address to notify",
          },
        },
        required: ["email"],
      },
    },
    {
      name: "update-alert-recipient",
      description:
        '[Account] Change the email address of an existing usage alert recipient. Use when users say: "change the alert email", "update alert recipient". Get recipient_id from list-alert-recipients. Confirmed by reading the list back.',
      annotations: getToolAnnotations(
        "update-alert-recipient",
        "Update Alert Recipient",
      ),
      inputSchema: {
        type: "object",
        properties: {
          recipient_id: {
            type: "string",
            description: "Recipient ID (UUID) from list-alert-recipients",
          },
          email: {
            type: "string",
            description: "New email address",
          },
        },
        required: ["recipient_id", "email"],
      },
    },
    {
      name: "delete-alert-recipient",
      description:
        '[Account] Stop sending usage alert emails to a recipient. Use when users say: "remove alert recipient", "stop sending alerts to". Get recipient_id from list-alert-recipients. The team owner cannot be removed this way. Confirmed by reading the list back.',
      annotations: getToolAnnotations(
        "delete-alert-recipient",
        "Delete Alert Recipient",
      ),
      inputSchema: {
        type: "object",
        properties: {
          recipient_id: {
            type: "string",
            description: "Recipient ID (UUID) from list-alert-recipients",
          },
        },
        required: ["recipient_id"],
      },
    },
    {
      name: "get-system-check-results",
      description:
        '[Account] Get the report of a pre-call system check (camera, microphone, network and browser test) by the support ID the user was shown, e.g. SC-7K2M-Q9XD. Use when users say: "look up system check", "support ID", "why can\'t this user join", "check their connection test". Returns the report as uploaded: verdict, network, devices and so on. Runs are kept for about 30 days.',
      annotations: getToolAnnotations(
        "get-system-check-results",
        "Get System Check Results",
      ),
      inputSchema: {
        type: "object",
        properties: {
          support_id: {
            type: "string",
            description: "Support ID from the system check page (SC-XXXX-XXXX)",
          },
        },
        required: ["support_id"],
      },
    },
  ];
}

const text = (t: string) => ({ content: [{ type: "text", text: t }] });
const fail = (t: string) => ({ ...text(t), isError: true });
const message = (error: unknown) =>
  error instanceof Error ? error.message : String(error);
const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");

async function findRecipient(
  apiClient: DigitalSambaApiClient,
  id: string,
): Promise<AlertRecipient | undefined> {
  const list = await apiClient.listAlertRecipients();
  return (list.data ?? []).find((r) => r.id === id);
}

export async function executeAccountTool(
  toolName: string,
  args: any,
  apiClient: DigitalSambaApiClient,
): Promise<any> {
  try {
    switch (toolName) {
      case "list-alert-recipients": {
        const list = await apiClient.listAlertRecipients();
        const rows = list.data ?? [];
        if (rows.length === 0) {
          return text(`No extra alert recipients. ${OWNER_NOTE}`);
        }
        return text(
          `${rows.length} alert recipient(s). ${OWNER_NOTE}\n\n${JSON.stringify(rows, null, 2)}`,
        );
      }

      case "create-alert-recipient": {
        const email = str(args.email);
        if (!email) return fail("create-alert-recipient: email is required.");
        const created = await apiClient.createAlertRecipient(email);
        const found = created?.id
          ? await findRecipient(apiClient, created.id)
          : undefined;
        if (!found || found.email.toLowerCase() !== email.toLowerCase()) {
          return fail(
            `create-alert-recipient: the API accepted ${email}, but it is not in the recipient list on read-back. Check list-alert-recipients.`,
          );
        }
        return text(
          `Added alert recipient ${found.email} (id ${found.id}); confirmed in the recipient list.`,
        );
      }

      case "update-alert-recipient": {
        const id = str(args.recipient_id);
        const email = str(args.email);
        if (!id || !email) {
          return fail(
            "update-alert-recipient: recipient_id and email are both required.",
          );
        }
        await apiClient.updateAlertRecipient(id, email);
        const found = await findRecipient(apiClient, id);
        if (!found || found.email.toLowerCase() !== email.toLowerCase()) {
          return fail(
            `update-alert-recipient: the API accepted the change, but recipient ${id} reads back as ${found ? found.email : "missing"}.`,
          );
        }
        return text(
          `Alert recipient ${id} is now ${found.email}; confirmed in the recipient list.`,
        );
      }

      case "delete-alert-recipient": {
        const id = str(args.recipient_id);
        if (!id)
          return fail("delete-alert-recipient: recipient_id is required.");
        await apiClient.deleteAlertRecipient(id);
        const still = await findRecipient(apiClient, id);
        if (still) {
          return fail(
            `delete-alert-recipient: the API answered success, but ${still.email} (${id}) is still in the recipient list.`,
          );
        }
        return text(
          `Removed alert recipient ${id}; confirmed gone from the recipient list.`,
        );
      }

      case "get-system-check-results": {
        const supportId = str(args.support_id);
        if (!supportId) {
          return fail("get-system-check-results: support_id is required.");
        }
        try {
          return text(
            JSON.stringify(
              await apiClient.getSystemCheckResults(supportId),
              null,
              2,
            ),
          );
        } catch (error) {
          const msg = message(error);
          if (/\(404\)/.test(msg)) {
            // The API uses one status for two cases; only the message differs.
            return fail(
              /not been uploaded/i.test(msg)
                ? `System check ${supportId} exists but has not uploaded its results yet. The check may still be running, or the page was closed before it finished; ask the user to finish the check and try again.`
                : `No system check ${supportId} for this team. Check the ID (format SC-XXXX-XXXX); runs are kept for about 30 days and belong to the team whose check page the user opened.`,
            );
          }
          throw error;
        }
      }

      default:
        return fail(`Unknown account tool: ${toolName}`);
    }
  } catch (error) {
    logger.error("Account tool failed", { toolName, error: message(error) });
    const msg = message(error);
    if (/\(404\)/.test(msg) && args?.recipient_id) {
      return fail(
        `${toolName}: no alert recipient ${args.recipient_id} on this team. Use list-alert-recipients for valid IDs.`,
      );
    }
    return fail(`${toolName} failed: ${msg}`);
  }
}

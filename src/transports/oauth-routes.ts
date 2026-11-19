/**
 * OAuth authorize + callback for the HTTP transport, with a consent step.
 *
 * This server is an OAuth authorization server for MCP clients (with Dynamic
 * Client Registration) and, behind that, an OAuth client of Digital Samba
 * Passport using one static client ID. The browser part of the flow is:
 *
 *   GET  /oauth/authorize   validate the client's request and show OUR consent
 *                           page, naming the client and where access will go
 *   POST /oauth/authorize   the user approves (or cancels); approval binds this
 *                           browser to the flow with a cookie and sends it to
 *                           Digital Samba to sign in
 *   GET  /oauth/callback    Digital Samba returns; accepted only in the browser
 *                           holding that cookie; the client gets its code
 *
 * The consent page and the cookie checks exist because Digital Samba's own
 * approval page cannot tell one MCP client from another: without them, any
 * self-registered client could receive a user's access after one click on a
 * genuine Digital Samba page. Registration and token exchange stay in http.ts.
 */

import express, { type Express, type Request, type Response } from "express";

import logger from "../logger.js";
import {
  type OAuthConfig,
  generateState,
  buildAuthorizationUrl,
  getRegisteredClient,
  validateRedirectUri,
  storePendingClientAuth,
  getPendingClientAuth,
  createAuthorizationCode,
  exchangeCodeForTokens,
  createBrowserBinding,
  bindingMatches,
  storeConsentRequest,
  takeConsentRequest,
} from "../oauth.js";
import {
  CONSENT_COOKIE,
  FLOW_COOKIE,
  readCookie,
  setFlowCookie,
  clearFlowCookie,
  setPageHeaders,
  renderConsentPage,
  renderErrorPage,
} from "../oauth-consent.js";

function sendErrorPage(
  res: Response,
  status: number,
  title: string,
  message: string,
): void {
  setPageHeaders(res);
  res.status(status).type("html").send(renderErrorPage(title, message));
}

export function registerAuthorizeRoutes(
  app: Express,
  oauthConfig: OAuthConfig,
): void {
  // Secure cookies whenever the public URL is https (always, outside local
  // development).
  const secureCookies = oauthConfig.issuer.startsWith("https://");

  // ---------------------------------------------------------------------------
  // Validate the client's request and show the consent page
  // ---------------------------------------------------------------------------
  app.get("/oauth/authorize", async (req, res) => {
    const {
      client_id,
      redirect_uri,
      response_type,
      state: clientState,
      code_challenge,
      code_challenge_method,
    } = req.query;

    if (
      typeof client_id !== "string" ||
      typeof redirect_uri !== "string" ||
      response_type !== "code"
    ) {
      res.status(400).json({
        error: "invalid_request",
        error_description:
          "Missing required parameters: client_id, redirect_uri, response_type=code",
      });
      return;
    }

    const client = await getRegisteredClient(client_id);
    if (!client) {
      res.status(400).json({
        error: "invalid_client",
        error_description:
          "Unknown client_id. Register via /oauth/register first.",
      });
      return;
    }

    // Never redirect to an unvalidated URI, so this error is shown here.
    if (!(await validateRedirectUri(client_id, redirect_uri))) {
      res.status(400).json({
        error: "invalid_request",
        error_description: "redirect_uri not registered for this client",
      });
      return;
    }

    const clientName = client.client_name || "Unknown Client";
    const binding = createBrowserBinding();
    const consentId = await storeConsentRequest({
      clientId: client_id,
      clientName,
      redirectUri: redirect_uri,
      codeChallenge:
        typeof code_challenge === "string" ? code_challenge : undefined,
      codeChallengeMethod:
        typeof code_challenge_method === "string"
          ? code_challenge_method
          : undefined,
      clientState: typeof clientState === "string" ? clientState : undefined,
      browserBindingHash: binding.hash,
    });

    setFlowCookie(res, CONSENT_COOKIE, binding.value, secureCookies);
    setPageHeaders(res);
    logger.info(
      `OAuth: consent requested for client ${client_id.substring(0, 8)}...`,
    );
    res
      .status(200)
      .type("html")
      .send(
        renderConsentPage({
          clientName,
          redirectUri: redirect_uri,
          consentId,
          formAction: "/oauth/authorize",
        }),
      );
  });

  // ---------------------------------------------------------------------------
  // The user's decision
  // ---------------------------------------------------------------------------
  app.post(
    "/oauth/authorize",
    express.urlencoded({ extended: false }),
    async (req: Request, res: Response) => {
      const consentId =
        typeof req.body?.consent_id === "string" ? req.body.consent_id : "";
      const decision = req.body?.decision;

      // One-time: consumed whether or not the checks below pass.
      const consent = await takeConsentRequest(consentId);
      clearFlowCookie(res, CONSENT_COOKIE, secureCookies);

      if (!consent) {
        sendErrorPage(
          res,
          400,
          "This request has expired",
          "The approval page was already used or is more than 10 minutes old.",
        );
        return;
      }

      // The decision must come from the browser the page was shown to. A
      // cross-site form post does not carry this cookie (SameSite=Lax), so
      // another site cannot submit the form for the user.
      if (
        !bindingMatches(
          readCookie(req.headers.cookie, CONSENT_COOKIE),
          consent.browserBindingHash,
        )
      ) {
        logger.warn(
          `OAuth: consent decision without matching browser cookie (client ${consent.clientId.substring(0, 8)}...)`,
        );
        sendErrorPage(
          res,
          400,
          "Approval not accepted",
          "This approval did not come from the browser that opened the request.",
        );
        return;
      }

      if (decision !== "approve") {
        logger.info(
          `OAuth: user declined client ${consent.clientId.substring(0, 8)}...`,
        );
        const redirectUrl = new URL(consent.redirectUri);
        redirectUrl.searchParams.set("error", "access_denied");
        redirectUrl.searchParams.set(
          "error_description",
          "The user declined the request",
        );
        if (consent.clientState) {
          redirectUrl.searchParams.set("state", consent.clientState);
        }
        res.redirect(303, redirectUrl.toString());
        return;
      }

      const ourState = generateState();
      const flowBinding = createBrowserBinding();
      await storePendingClientAuth(
        ourState,
        consent.clientId,
        consent.redirectUri,
        consent.codeChallenge,
        consent.codeChallengeMethod,
        consent.clientState,
        flowBinding.hash,
      );

      const authUrl = await buildAuthorizationUrl(oauthConfig, ourState);
      setFlowCookie(res, FLOW_COOKIE, flowBinding.value, secureCookies);
      logger.info(
        `OAuth: client ${consent.clientId.substring(0, 8)}... approved -> DS Passport (state: ${ourState.substring(0, 8)}...)`,
      );
      res.redirect(303, authUrl);
    },
  );

  // ---------------------------------------------------------------------------
  // Digital Samba returns; hand the client its authorization code
  // ---------------------------------------------------------------------------
  app.get("/oauth/callback", async (req, res) => {
    const { code, state, error, error_description } = req.query;

    if (error) {
      logger.error(`OAuth DS error: ${error} - ${error_description}`);
      res.status(400).json({
        error: error as string,
        error_description: error_description as string,
      });
      return;
    }

    if (typeof code !== "string" || typeof state !== "string") {
      res.status(400).json({
        error: "invalid_request",
        error_description: "Missing code or state parameter from DS Passport",
      });
      return;
    }

    // One-time: consumed whether or not the checks below pass.
    const pendingClient = await getPendingClientAuth(state);
    const flowCookie = readCookie(req.headers.cookie, FLOW_COOKIE);
    clearFlowCookie(res, FLOW_COOKIE, secureCookies);

    // There used to be a "legacy" branch here that, with no pending client,
    // completed the flow and returned a session ID in the response body. No
    // route can start such a flow any more, and a branch that hands a session
    // to whoever reaches the callback must not exist.
    if (!pendingClient) {
      sendErrorPage(
        res,
        400,
        "This sign-in has expired",
        "The sign-in request is unknown, already completed, or more than 10 minutes old.",
      );
      return;
    }

    // Only the browser that approved on our consent page may finish. Without
    // this, someone could approve in their own browser and send the Digital
    // Samba sign-in link to another user, whose sign-in would then deliver
    // access to the first person's client.
    if (!bindingMatches(flowCookie, pendingClient.browserBindingHash)) {
      logger.warn(
        `OAuth: callback without matching browser cookie (client ${pendingClient.clientId.substring(0, 8)}...)`,
      );
      sendErrorPage(
        res,
        400,
        "Sign-in not accepted",
        "This sign-in must be completed in the same browser that approved the connection.",
      );
      return;
    }

    try {
      const dsTokens = await exchangeCodeForTokens(oauthConfig, code, state);

      const clientCode = await createAuthorizationCode(
        pendingClient.clientId,
        pendingClient.redirectUri,
        dsTokens.access_token,
        dsTokens.refresh_token,
        pendingClient.codeChallenge,
        pendingClient.codeChallengeMethod,
      );

      const redirectUrl = new URL(pendingClient.redirectUri);
      redirectUrl.searchParams.set("code", clientCode);
      if (pendingClient.state) {
        redirectUrl.searchParams.set("state", pendingClient.state);
      }

      logger.info(
        `OAuth: DS auth complete, redirecting to client (${pendingClient.clientId.substring(0, 8)}...)`,
      );
      res.redirect(redirectUrl.toString());
    } catch (err: any) {
      logger.error(`OAuth callback error: ${err.message}`);

      const redirectUrl = new URL(pendingClient.redirectUri);
      redirectUrl.searchParams.set("error", "server_error");
      redirectUrl.searchParams.set("error_description", err.message);
      if (pendingClient.state) {
        redirectUrl.searchParams.set("state", pendingClient.state);
      }
      res.redirect(redirectUrl.toString());
    }
  });
}

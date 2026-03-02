import type { FastifyPluginAsync } from "fastify";
import { saveOAuthToken } from "../../../services/store/index.js";

const WEBFLOW_AUTHORIZE_URL = "https://webflow.com/oauth/authorize";
const WEBFLOW_TOKEN_URL = "https://api.webflow.com/oauth/access_token";

const webflowAuthRoute: FastifyPluginAsync = async (app) => {
  app.get("/auth/webflow", async (_req, reply) => {
    const clientId = process.env.WEBFLOW_OAUTH_CLIENT_ID;
    if (!clientId) {
      return reply.status(500).send({ error: "WEBFLOW_OAUTH_CLIENT_ID not configured" });
    }

    const appUrl = process.env.APP_URL || "http://localhost:3200";
    const redirectUri = `${appUrl}/api/auth/webflow/callback`;
    const scope = "sites:read sites:write cms:read cms:write";

    const url = new URL(WEBFLOW_AUTHORIZE_URL);
    url.searchParams.set("client_id", clientId);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", scope);
    url.searchParams.set("redirect_uri", redirectUri);

    return reply.redirect(url.toString());
  });

  app.get("/auth/webflow/callback", async (req, reply) => {
    const { code } = req.query as { code?: string };
    if (!code) {
      return reply.status(400).send({ error: "Missing authorization code" });
    }

    const clientId = process.env.WEBFLOW_OAUTH_CLIENT_ID;
    const clientSecret = process.env.WEBFLOW_OAUTH_CLIENT_SECRET;
    const appUrl = process.env.APP_URL || "http://localhost:3200";
    const redirectUri = `${appUrl}/api/auth/webflow/callback`;

    if (!clientId || !clientSecret) {
      return reply.status(500).send({ error: "OAuth credentials not configured" });
    }

    const response = await fetch(WEBFLOW_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      req.log.error({ status: response.status, body: text }, "OAuth token exchange failed");
      return reply.status(502).send({ error: "Token exchange failed" });
    }

    const data = (await response.json()) as { access_token: string };

    await saveOAuthToken({
      accessToken: data.access_token,
      createdAt: new Date().toISOString(),
    });

    return reply.redirect("/connect?success=true");
  });
};

export default webflowAuthRoute;

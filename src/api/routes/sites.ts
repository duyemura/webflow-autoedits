import type { FastifyPluginAsync } from "fastify";
import { getOAuthToken, getSitesConfig } from "../../services/store/index.js";
import { WebflowClient } from "../../agents/webflow/client.js";

const sitesRoute: FastifyPluginAsync = async (app) => {
  app.get("/sites", async (_req, reply) => {
    const token = await getOAuthToken();
    if (!token) {
      return reply.status(401).send({ error: "No OAuth token. Connect Webflow first." });
    }

    const client = new WebflowClient(token.accessToken);
    const { sites } = await client.listSites();
    const config = await getSitesConfig();

    const tagged = sites.map((site) => {
      let tag: "template" | "client" | "untagged" = "untagged";
      if (config.templates.includes(site.id)) {
        tag = "template";
      } else if (config.clients[site.id]) {
        tag = "client";
      }
      return { ...site, tag };
    });

    return { sites: tagged };
  });
};

export default sitesRoute;

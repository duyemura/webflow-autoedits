import type { FastifyPluginAsync } from "fastify";
import type Anthropic from "@anthropic-ai/sdk";
import { getOAuthToken } from "../../services/store/index.js";
import { WebflowClient } from "../../agents/webflow/client.js";
import { ToolRunner } from "../../shared/ai/tool-runner.js";
import { registerCmsTools } from "../../agents/webflow/tools/cms.js";
import { registerSiteTools } from "../../agents/webflow/tools/sites.js";
import { AIClient } from "../../shared/ai/client.js";

function buildSystemPrompt(siteId: string): string {
  return `You are a Webflow site customization assistant. You help users update their gym website content through the Webflow CMS.

Available actions:
- List and inspect CMS collections to understand the site structure
- Create, update, and delete CMS items
- Publish changes to the staging site

Workflow:
1. When asked to make changes, first inspect the relevant collection to understand its structure
2. Make the requested changes using the appropriate tools
3. After making changes, publish the site to staging
4. Summarize what you did

Always be helpful and explain what changes you're making. If you're unsure about a field name or structure, inspect the collection first.

The site ID you're working with is: ${siteId}`;
}

interface ChatBody {
  siteId: string;
  messages: { role: string; content: string }[];
}

const chatRoute: FastifyPluginAsync = async (app) => {
  app.post("/chat", async (req, reply) => {
    const { siteId, messages } = req.body as ChatBody;

    if (!siteId || !messages || messages.length === 0) {
      return reply.status(400).send({ error: "siteId and messages are required" });
    }

    const token = await getOAuthToken();
    if (!token) {
      return reply.status(401).send({ error: "No OAuth token. Connect Webflow first." });
    }

    const client = new WebflowClient(token.accessToken);
    const runner = new ToolRunner();
    registerCmsTools(runner, client);
    registerSiteTools(runner, client);

    const aiClient = new AIClient();
    const anthropicMessages: Anthropic.MessageParam[] = messages.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

    const result = await aiClient.run({
      systemPrompt: buildSystemPrompt(siteId),
      messages: anthropicMessages,
      tools: runner.getDefinitions(),
      toolHandler: runner.createHandler(),
    });

    return {
      response: result.text,
      toolCalls: result.toolCalls,
    };
  });
};

export default chatRoute;

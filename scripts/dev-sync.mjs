#!/usr/bin/env node

/**
 * dev-sync — Reads the cloudflared tunnel URL and patches Linear webhook(s) to point at it.
 *
 * Usage:
 *   1. Start cloudflared:  cloudflared tunnel --url http://localhost:3100 --metrics 127.0.0.1:20241
 *   2. Run this script:    npm run dev:sync
 *
 * What it does:
 *   - Reads tunnel hostname from cloudflared metrics API (localhost:20241/quicktunnel)
 *   - Lists all Linear webhooks for your API key
 *   - Finds any webhook whose URL contains /webhooks/linear
 *   - Patches the URL to {tunnelUrl}/webhooks/linear
 *
 * Requires LINEAR_API_KEY in .env
 */

import { config } from "dotenv";
config();

const LINEAR_API_KEY = process.env.LINEAR_API_KEY;
const METRICS_PORT = process.env.CLOUDFLARED_METRICS_PORT || "20241";
const WEBHOOK_PATH = "/webhooks/linear";

// The specific webhook ID for this project.
// Set in .env or defaults to the Grow pipeline webhook.
// Find yours at: https://linear.app/pushpress/settings/api/webhooks
const WEBHOOK_ID = process.env.LINEAR_WEBHOOK_ID || "35edec88-aedc-4fba-adeb-b67d2b38cba9";

if (!LINEAR_API_KEY) {
  console.error("Missing LINEAR_API_KEY in .env");
  process.exit(1);
}

async function getTunnelUrl() {
  // Try the configured metrics port, then scan 20241-20245
  const ports = [METRICS_PORT, "20241", "20242", "20243", "20244", "20245"];
  const tried = new Set();

  for (const port of ports) {
    if (tried.has(port)) continue;
    tried.add(port);

    try {
      const res = await fetch(`http://127.0.0.1:${port}/quicktunnel`, {
        signal: AbortSignal.timeout(2000),
      });
      if (!res.ok) continue;
      const data = await res.json();
      if (data.hostname) {
        return `https://${data.hostname}`;
      }
    } catch {
      // try next port
    }
  }

  console.error(
    "Could not find cloudflared tunnel. Make sure cloudflared is running:\n" +
      "  cloudflared tunnel --url http://localhost:3100 --metrics 127.0.0.1:20241"
  );
  process.exit(1);
}

async function linearGraphql(query, variables = {}) {
  const res = await fetch("https://api.linear.app/graphql", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: LINEAR_API_KEY,
    },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  if (json.errors) {
    throw new Error(`Linear API error: ${JSON.stringify(json.errors)}`);
  }
  return json.data;
}

async function listWebhooks() {
  const data = await linearGraphql(`
    query {
      webhooks {
        nodes {
          id
          url
          enabled
        }
      }
    }
  `);
  return data.webhooks.nodes;
}

async function updateWebhookUrl(id, url) {
  await linearGraphql(
    `mutation($id: String!, $url: String!) {
      webhookUpdate(id: $id, input: { url: $url }) {
        success
        webhook { id url }
      }
    }`,
    { id, url }
  );
}

async function main() {
  console.log("Reading cloudflared tunnel URL...");
  const tunnelUrl = await getTunnelUrl();
  console.log(`  Tunnel: ${tunnelUrl}`);

  const newWebhookUrl = `${tunnelUrl}${WEBHOOK_PATH}`;

  console.log(`\nUpdating webhook ${WEBHOOK_ID}...`);
  console.log(`  → ${newWebhookUrl}`);
  await updateWebhookUrl(WEBHOOK_ID, newWebhookUrl);
  console.log(`  ✓ updated`);

  console.log("\nDone. Linear webhook now points at your local tunnel.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

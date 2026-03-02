# Grow Automation Pipeline

Autonomous CI pipeline that processes Linear tickets and makes Webflow CMS/page changes via AI agents.

**Linear webhook → Express Server → Orchestrator → Webflow Agent → Publish to Staging**

## Quick Start

### 1. Install dependencies

```bash
npm install
npx playwright install chromium
```

### 2. Configure environment

```bash
cp .env.example .env
```

Fill in your `.env`:
```
ANTHROPIC_API_KEY=sk-ant-...
LINEAR_API_KEY=lin_api_...
LINEAR_WEBHOOK_SECRET=        # from Linear webhook setup (step 4)
PORT=3100
NODE_ENV=development
LOG_LEVEL=debug
```

### 3. Add a site config

Either edit `config/sites/` JSON files directly, or register via API once the server is running:

```bash
curl -X POST http://localhost:3200/sites \
  -H "Content-Type: application/json" \
  -d '{
    "id": "my-client",
    "name": "My Client Site",
    "webflowSiteId": "your-webflow-site-id",
    "webflowApiToken": "your-site-api-token",
    "stagingDomain": "my-client.webflow.io",
    "productionDomain": "www.myclient.com",
    "linearTeamId": "your-linear-team-uuid",
    "triggerStatus": "Ready for Automation",
    "statusMap": {
      "inProgress": "In Progress",
      "needsInfo": "Needs Info",
      "review": "In Review",
      "done": "Done",
      "blocked": "Blocked"
    },
    "mode": "human-review",
    "allowedTicketTypes": ["cms-content", "page-content"],
    "maxRetries": 2,
    "testing": {
      "baseUrl": "https://my-client.webflow.io",
      "visualRegressionThreshold": 0.05,
      "timeout": 30000
    },
    "maxCostPerRun": 5.0
  }'
```

Each site brings its own Webflow API token — no global token needed.

### 4. Start the server with cloudflared

You need three terminals (first time) or two terminals (after webhook exists):

**Terminal 1 — Start the pipeline server:**
```bash
npm run dev
```

**Terminal 2 — Start cloudflared tunnel:**
```bash
npm run tunnel
```

> **Why cloudflared over ngrok?** Cloudflare tunnels are free with unlimited simultaneous tunnels. ngrok free tier only allows one tunnel at a time.

### 5. Set up the Linear webhook (first time only)

1. Go to **Linear → Settings → API → Webhooks**
2. Click **"New webhook"**
3. Configure:
   - **URL:** any placeholder URL (e.g. `https://placeholder.com/webhooks/linear`) — `dev:sync` will update it
   - **Events:** Check **Issues** (create, update) and **Comments** (create)
   - **Team filter:** Select the team(s) this pipeline should handle
4. Click **Create webhook**
5. Copy the **Signing secret** and add it to your `.env` as `LINEAR_WEBHOOK_SECRET`
6. Restart the server (`npm run dev`) to pick up the new secret

### 6. Sync webhook to your tunnel

```bash
npm run dev:sync
```

This automatically:
- Reads the cloudflared tunnel URL from the local metrics API
- Finds your Linear webhook (any webhook with `/webhooks/linear` in the URL)
- Patches it to point at your tunnel

Run this every time you start a new dev session (cloudflared URLs change on restart).

**Daily workflow:**
```bash
# Terminal 1
npm run dev

# Terminal 2
npm run tunnel

# Terminal 3 (once, then close)
npm run dev:sync
```

### 7. Test it

**Option A — Manual trigger (no webhook needed):**
```bash
curl -X POST http://localhost:3200/test/trigger \
  -H "Content-Type: application/json" \
  -d '{"issueId": "your-linear-issue-uuid", "siteId": "my-client"}'
```

**Option B — Automatic via webhook:**

Move a Linear ticket to your configured `triggerStatus` (e.g. "Ready for Automation"). The pipeline will automatically pick it up.

**Monitor progress:**
```bash
# Check all runs
curl http://localhost:3200/runs | python3 -m json.tool

# Health check with run counts
curl http://localhost:3200/health | python3 -m json.tool

# List registered sites
curl http://localhost:3200/sites | python3 -m json.tool
```

## How It Works

```
Linear Webhook → Express Server → Orchestrator
                                       │
                                  AI Classifier
                              (Webflow? GHL? Both?)
                                       │
                              ┌────────┴────────┐
                              ↓                  ↓
                     Webflow Agent          GHL Agent (Phase 3)
                     7-stage pipeline
                          │
            ┌─────────────┼─────────────┐
            ↓             ↓             ↓
        1. Analyze    4. Execute    6. Green Test
        2. Gen Tests  5. Publish    7. Report
        3. Red Test
```

Each stage posts a comment to the Linear ticket with what it's doing and why.

### Pipeline Stages

| Stage | What happens |
|-------|-------------|
| **Classify** | AI reads the ticket and determines platform (Webflow/GHL) and type (CMS/page/design) |
| **Analyze** | AI inspects the Webflow site via API, builds a change plan |
| **Generate Tests** | AI writes Playwright tests to verify the expected outcome |
| **Red Test** | Runs tests — should FAIL (desired state doesn't exist yet) |
| **Execute** | AI calls Webflow API to make the changes |
| **Publish** | Publishes to staging (.webflow.io) |
| **Green Test** | Runs tests — should PASS |
| **Report** | Posts summary to Linear, moves ticket to "In Review" |

## Architecture

- **Orchestrator** — classifies tickets, routes to the right agent
- **Webflow Agent** — domain expert for Webflow CMS and page changes
- **GHL Agent** — stub for Phase 3 (GoHighLevel workflows)
- **Linear Agent** — shared service for all Linear communication
- **Knowledge Base** — institutional memory that improves over time (`knowledge/`)

### Multi-Site Support

This is built for agencies managing many client sites:
- Each site has its own config with its own Webflow API token
- Sites can be registered at runtime via `POST /sites`
- The orchestrator matches incoming tickets to sites by Linear team ID
- Per-site knowledge rules in `knowledge/webflow/site-specific/{siteId}.md`

## API Routes

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/webhooks/linear` | Linear webhook endpoint (auto-triggered) |
| `POST` | `/test/trigger` | Manual trigger: `{ issueId, siteId }` |
| `GET` | `/runs` | List all pipeline runs with status |
| `GET` | `/health` | Health check with run counts |
| `GET` | `/sites` | List registered sites |
| `POST` | `/sites` | Register a new site config |

## Development

```bash
# Run tests
npm test

# Type check
npx tsc --noEmit

# Dev server with hot reload
npm run dev
```

## Project Structure

```
src/
├── index.ts                    # Entry point
├── types/                      # TypeScript types
├── orchestrator/               # Ticket classification + routing
├── agents/
│   ├── base-agent.ts           # Abstract 7-stage pipeline
│   ├── webflow/                # Webflow agent (API client, stages, tools, prompts)
│   ├── ghl/                    # GHL agent (stub)
│   └── linear/                 # Linear communication service
├── shared/
│   ├── server/                 # Express server, routes, job queue
│   ├── ai/                     # Anthropic SDK client with tool_use loop
│   ├── linear/                 # Linear GraphQL client
│   ├── learning/               # Knowledge base, feedback processing
│   ├── audit/                  # Audit logging
│   └── ...                     # State store, locks, dedup, cost tracking
├── mcp/                        # MCP server for Claude Code integration
config/
├── sites/                      # Per-site JSON configs
└── agents/                     # Per-agent configs (model, retries)
knowledge/                      # Institutional memory (grows over time)
├── global/rules.md
├── webflow/rules.md
├── webflow/site-specific/
└── ...
```

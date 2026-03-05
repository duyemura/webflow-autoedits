# Grow Platform — Build Plan

## What We're Building

A chat-driven website platform for gym and fitness studios. Site owners edit their
website by talking to an AI — no CMS dashboard, no page builder, just chat.

**Core loop:**
1. Owner types: "Change the hero headline to 'Get Fit in 28 Days'"
2. AI calls `update_content` tool → writes to Supabase
3. AI calls `rebuild_site` → Handlebars renders fresh HTML from DB
4. Change is live in seconds

**Three proof points this MVP must demonstrate:**
1. Multiple client websites hosted on one platform (multi-tenancy)
2. Clients can edit any content — copy, images, colors, fonts — via chat
3. Template hot-swap: swap a site's template, content persists automatically

---

## Tech Stack

| Layer | Tech | Why |
|---|---|---|
| Server | Fastify 5 (existing) | Already built, fast, autoloads routes |
| Database | Supabase (Postgres) | Hosted Postgres + Storage + RLS |
| Images | Supabase Storage | S3-compatible, public URLs |
| Templates | Handlebars | Plain HTML with `{{}}` slots, readable and swappable |
| AI Agent | Anthropic SDK (existing) | `tool_use` loop already built at `src/shared/ai/client.ts` |
| Dashboard | React 19 SPA (existing) | Already built at `spa/` |
| Hosting | Grow platform serves client sites directly | Option A: subdomain/custom domain routing |

No Vercel needed for MVP. Fastify serves client site HTML files directly.

---

## Repository Cleanup

### Keep
- `src/app.ts` — Fastify server, keep as-is
- `src/app-server.ts` — server entry, keep
- `src/api/routes/health.ts` — keep
- `src/shared/ai/client.ts` — Anthropic agentic loop, keep as-is
- `src/shared/ai/parse-json.ts`, `tool-runner.ts` — keep
- `src/shared/logger.ts` — keep
- `src/shared/env.ts` — keep
- `spa/` — React dashboard SPA, keep

### Delete
- `src/index.ts` — Express/Linear webhook pipeline server
- `src/orchestrator/` — Linear ticket pipeline, not relevant
- `src/agents/` — Webflow + GHL + Linear agents, all gone
- `src/services/store/` — file-based JSON store, replaced by Supabase
- `src/services/style-compiler.ts`, `style-injector.ts` — Webflow CSS injection
- `src/shared/linear/` — Linear GraphQL client
- `src/shared/server/` — webhook/queue infra for pipeline
- `src/shared/state-store.ts`, `resource-lock.ts`, `dedup.ts` — pipeline infra
- `src/shared/audit/` — pipeline audit log
- `src/shared/cost-tracker.ts` — pipeline cost tracking
- `src/shared/config-loader.ts` — Webflow site config loader
- `src/shared/learning/` — pipeline knowledge base
- `src/shared/testing/` — Playwright test infra for Webflow
- `src/shared/tunnel.ts` — cloudflared tunnel for webhooks
- `src/mcp/` — MCP server for Claude Code (Webflow-specific)
- `src/types/` — all pipeline/Webflow types (rewrite for new domain)
- `src/api/routes/auth/webflow.ts` — Webflow OAuth
- `src/api/routes/sites.ts` — Webflow sites route
- `src/api/routes/chat.ts` — Webflow-specific chat (rewrite)
- `data/` — file-based JSON store
- `config/` — Webflow site configs
- `knowledge/` — Webflow/Linear knowledge base
- `audit/` — pipeline audit logs
- `tests/`, `test-results/` — Playwright Webflow tests
- `scripts/` — Webflow/dev-sync scripts
- `playwright.config.ts`, `playwright.webflow.config.ts`
- `Webflow Template Rebuild: CMS-First Arch.md`
- `docs/V1-TEMPLATE-PLAN.md`, `docs/build-guide/`

---

## Database Schema

### Multi-tenancy

```sql
templates (
  id uuid primary key,
  name text,           -- "Bold", "Minimal", "Energy"
  slug text unique,    -- "bold"
  description text,
  preview_image_url text,
  created_at timestamptz
)

sites (
  id uuid primary key,
  name text,           -- "KS Athletic Club"
  slug text unique,    -- "ksathleticclub"
  subdomain text unique,     -- "ksac" → ksac.growsites.io
  custom_domain text unique, -- "ksathleticclub.com" (optional)
  template_id uuid references templates,
  published boolean default false,
  created_at timestamptz
)
```

**Domain routing:** Fastify reads `Host` header on every request. Matches against
`subdomain + ".growsites.io"` or `custom_domain`. Loads that site's content from
Supabase, renders template, returns HTML. Custom domains require a DNS A record
pointing to the Grow server.

### Site-Level Content

```sql
site_config (
  id uuid primary key,
  site_id uuid references sites unique,
  -- Branding
  name text,
  tagline text,
  logo_url text,
  logo_dark_url text,
  favicon_url text,
  -- Design tokens (compile to CSS :root vars at build time)
  primary_color text,     -- "#E63946"
  secondary_color text,
  accent_color text,
  bg_color text,
  text_color text,
  font_heading text,      -- "Bebas Neue"
  font_body text,         -- "Inter"
  -- Contact
  phone text,
  email text,
  address text,
  city text,
  state text,
  zip text,
  google_maps_url text,
  hours jsonb,            -- { "mon": "5am–8pm", "sat": "8am–10:30am", ... }
  -- Socials
  facebook_url text,
  instagram_url text,
  tiktok_url text,
  youtube_url text,
  twitter_url text,
  -- Integrations
  booking_url text,             -- discovery call / scheduling widget
  members_app_ios_url text,
  members_app_android_url text,
  social_proof_embed text,      -- plugin embed code for reviews/social proof
  schedule_embed_url text       -- external schedule widget (PushPress, etc.)
)
```

```sql
nav_items (
  id uuid primary key,
  site_id uuid references sites,
  label text,
  url text,
  parent_id uuid references nav_items,  -- null = top-level, set = dropdown child
  order int,
  visible boolean default true,
  is_cta boolean default false,
  cta_style text    -- "primary" | "secondary"
)
```

### Pages

```sql
pages (
  id uuid primary key,
  site_id uuid references sites,
  slug text,          -- "home", "programs/crossfit-classes", "about", "pricing"
  title text,
  meta_description text,
  -- Hero
  hero_headline text,
  hero_subheading text,
  hero_image_url text,
  hero_cta_text text,
  hero_cta_url text,
  hero_secondary_cta_text text,
  hero_secondary_cta_url text,
  -- For pages with embedded widgets (schedule)
  embed_url text,
  published boolean default true,
  unique(site_id, slug)
)

sections (
  id uuid primary key,
  site_id uuid references sites,
  page_slug text,
  section_type text,   -- see Section Types below
  order int,
  visible boolean default true,
  heading text,
  subheading text,
  config jsonb         -- section-specific options
)
```

**Section types:** `highlights` | `programs` | `steps` | `features` | `location` |
`faq` | `cta` | `team` | `pricing` | `embed` | `visitor-passes` | `prerequisites`

### Content Cards

```sql
-- Universal content cards for all repeating block types
items (
  id uuid primary key,
  site_id uuid references sites,
  section_id uuid references sections,
  type text,           -- "program" | "feature" | "step" | "highlight" | "benefit"
  title text,
  subtitle text,
  body text,
  short_body text,
  image_url text,
  icon_url text,
  cta_text text,
  cta_url text,
  order int,
  visible boolean default true,
  metadata jsonb,      -- step_number, bullet_list[], page_slug for programs, etc.
  pp_id text           -- PushPress sync hook (null for now)
)
```

### People

```sql
team_members (
  id uuid primary key,
  site_id uuid references sites,
  name text,
  role text,           -- "Owner & Founder", "Fitness Instructor"
  bio text,
  image_url text,
  slug text,           -- /coaches/tj-kiblen
  order int,
  visible boolean default true,
  specialties jsonb,   -- ["CrossFit", "Nutrition"]
  pp_id text
)
```

### Q&A

```sql
faqs (
  id uuid primary key,
  site_id uuid references sites,
  page_slug text,      -- which page(s) this FAQ appears on
  question text,
  answer text,
  category text,
  order int,
  visible boolean default true
)
```

### Pricing

```sql
pricing_plans (
  id uuid primary key,
  site_id uuid references sites,
  plan_type text,      -- "membership" | "visitor_pass" | "trial"
  name text,           -- "Unlimited CrossFit", "3 Visit Pass"
  price decimal,
  billing_frequency text,  -- "monthly" | "annual" | "per_visit" | "flat"
  description text,
  features jsonb,      -- ["Unlimited classes", "Members app", ...]
  is_featured boolean default false,
  cta_text text,
  cta_url text,
  order int,
  visible boolean default true,
  pp_id text
)
```

### Locations

```sql
locations (
  id uuid primary key,
  site_id uuid references sites,
  name text,
  is_primary boolean default false,
  address text,
  city text,
  state text,
  zip text,
  phone text,
  email text,
  hours jsonb,
  google_maps_url text,
  embed_url text,      -- Google Maps embed iframe src
  pp_id text
)
```

### Class Schedule

```sql
class_schedule (
  id uuid primary key,
  site_id uuid references sites,
  location_id uuid references locations,
  class_name text,
  program_type text,   -- "crossfit" | "sweat-bootcamp" | "personal-training"
  instructor_name text,
  day_of_week int,     -- 0=Sunday, 1=Monday, ...
  start_time time,
  end_time time,
  capacity int,
  visible boolean default true,
  pp_id text
)
```

**Total: 12 tables.** All have `site_id` for multi-tenancy. PushPress `pp_id`
columns on `items`, `team_members`, `pricing_plans`, `locations`, `class_schedule`
are null for now — hooks for future sync.

---

## Template System

### How It Works

Templates are Handlebars HTML files in `src/templates/{slug}/`. Each template has
one file per page type:

```
src/templates/
  bold/
    home.hbs
    program.hbs       -- reused for all 5 program pages
    about.hbs
    pricing.hbs
    schedule.hbs
    contact.hbs
    drop-in.hbs
    partials/
      navbar.hbs
      footer.hbs
      hero.hbs
      faq.hbs
      ...
```

Every editable region has a `data-content` attribute for agent targeting:

```html
<section data-section="hero">
  <h1 data-content="hero.headline">{{hero_headline}}</h1>
  <p data-content="hero.subheading">{{hero_subheading}}</p>
  <img data-content="hero.image" src="{{hero_image_url}}" alt="Hero" />
</section>
```

Design tokens compile to a `:root {}` block at the top of each page — no runtime
injection, no `!important`:

```html
<style>
  :root {
    --color-primary: {{primary_color}};
    --color-secondary: {{secondary_color}};
    --font-heading: {{font_heading}};
    --font-body: {{font_body}};
  }
</style>
```

### Hot-Swap Mechanics

When a client switches templates:
1. `sites.template_id` is updated to the new template's ID
2. `rebuild_site` is called
3. Build reads the same `pages`, `sections`, `items`, `faqs`, etc. from Supabase
4. Renders them through the new template's `.hbs` files
5. New HTML files are written to `dist/sites/{site_id}/`
6. Live immediately — zero content migration needed

Content is template-agnostic. Templates are interchangeable views over the same data.

---

## Build Pipeline

```
rebuild_site(site_id)
  ↓
1. Load site + site_config from Supabase
2. For each published page:
   a. Load page row
   b. Load sections (ordered) for this page slug
   c. Load items for each section
   d. Load faqs, pricing_plans, team_members, locations, nav_items
   e. Compile CSS :root block from site_config tokens
   f. Render Handlebars template → HTML string
   g. Write to dist/sites/{site_id}/{page-slug}/index.html
3. Return { pagesBuilt, buildTimeMs }
```

Full rebuild for all pages on a typical site: < 500ms. No need for targeted
partial rebuilds in MVP — rebuild whole site on every change.

---

## Domain Routing

Fastify middleware on every request:

```
Request: Host: ironforge.growsites.io
  → strip ".growsites.io" → subdomain = "ironforge"
  → SELECT * FROM sites WHERE subdomain = 'ironforge'
  → serve dist/sites/{site_id}/{path}/index.html

Request: Host: ksathleticclub.com
  → SELECT * FROM sites WHERE custom_domain = 'ksathleticclub.com'
  → serve dist/sites/{site_id}/{path}/index.html
```

Static files served by `@fastify/static` from `dist/sites/`. Each site gets its
own subdirectory. The Grow dashboard SPA is served separately at the platform
domain (e.g., `app.growsites.io`).

---

## Agent Tools

The AI chat agent has these tools. All are TypeScript functions registered with
the `ToolRunner` (existing pattern from `src/shared/ai/tool-runner.ts`):

| Tool | Input | What it does |
|---|---|---|
| `get_site_content` | `site_id`, `content_type` | Reads any table for a site — pages, items, faqs, etc. |
| `update_content` | `site_id`, `table`, `id`, `fields` | Updates any row by ID |
| `create_content` | `site_id`, `table`, `fields` | Inserts a new row |
| `delete_content` | `site_id`, `table`, `id` | Deletes a row |
| `upload_image` | `site_id`, `file_base64`, `filename` | Uploads to Supabase Storage, returns public URL |
| `rebuild_site` | `site_id` | Runs full build pipeline, returns pages built + time |
| `get_site_config` | `site_id` | Returns site_config row (colors, fonts, contact, etc.) |
| `update_site_config` | `site_id`, `fields` | Updates site_config (colors, fonts, etc.) |

The agent system prompt tells it: always call `rebuild_site` after any content
change, and tell the user what was changed and that it's live.

---

## Page Inventory — "Bold" Template

| Page | Slug | Sections |
|---|---|---|
| Homepage | `home` | hero, highlights×3, programs grid, steps×3, features, location, faq, cta |
| CrossFit | `programs/crossfit-classes` | hero, bullets, class-structure, target-audience, steps, faq, social-proof, location |
| Sweat Bootcamp | `programs/sweat-bootcamp` | same structure as crossfit |
| Personal Training | `programs/personal-training` | same |
| Parisi Speed | `programs/parisi-speed-school` | same |
| Nutrition | `programs/nutrition-coaching` | same |
| About | `about` | hero, mission, team-grid, location |
| Drop-In | `programs/drop-in` | hero, how-it-works, prerequisites, visitor-passes, location |
| Schedule | `schedule` | hero, embed-widget |
| Pricing | `pricing` | hero, membership-plans, visitor-passes, cta |
| Contact | `contact` | hero, contact-form, location-tabs |

---

## Phased Build Order

### Phase 1 — Foundation
1. Clean up repo (delete Webflow/Linear code listed above)
2. Supabase project setup + migration SQL (all 12 tables)
3. Supabase TypeScript client (`src/services/supabase/client.ts`)
4. Seed data: Iron Forge CrossFit (Austin TX demo gym)

### Phase 2 — Template Engine
1. Install `handlebars` dependency
2. Build the "Bold" homepage template (`src/templates/bold/home.hbs`)
3. Build partials: navbar, footer, hero, section wrappers
4. Build the program page template (shared by all 5 programs)
5. Remaining pages: about, pricing, contact, schedule, drop-in
6. Build script: `src/services/builder.ts` — reads Supabase, renders templates, writes HTML

### Phase 3 — Domain Routing
1. Fastify middleware for Host-based site lookup
2. Serve `dist/sites/{site_id}/` per site via `@fastify/static`
3. Test with local `/etc/hosts` entries for fake subdomains

### Phase 4 — Agent Tools
1. Supabase query helpers for all content types
2. Register agent tools with ToolRunner
3. Rewrite `src/api/routes/chat.ts` — Supabase-backed, template-agnostic
4. System prompt for gym site editing agent

### Phase 5 — Dashboard
1. Update SPA to list sites (from Supabase instead of Webflow)
2. Chat UI connected to new `/api/chat` route
3. "Preview site" link per site
4. Basic site creation form

### Phase 6 — Demo
1. Two demo clients on Iron Forge seed data (same content, different templates)
2. Show template hot-swap live
3. Show custom domain routing

---

## Seed Data — Iron Forge CrossFit (Austin, TX)

Demo gym used for development and demos. Fictional but realistic. One site with:
- Full homepage content
- 3 programs (CrossFit, Bootcamp, Personal Training)
- 5 team members
- 12 FAQs
- 3 membership tiers + 3 visitor pass options
- 1 location with hours
- Nav with dropdown

A second site ("Peak Performance") uses the same schema with different content
to prove multi-tenancy.

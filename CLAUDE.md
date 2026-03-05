# Grow Platform — Claude Instructions

## MVP Focus Gate

**We are proving three things and nothing else:**
1. Multiple client websites can be hosted on one platform (subdomain/domain routing)
2. Chat can edit any site content and it goes live immediately
3. Template hot-swap works — content persists, new template renders it

**Before building anything new, ask: does this directly prove one of those three things?**
If no — don't build it. If Dan asks for it, push back with: "That's past the MVP gate. What are we trying to prove with this?"

### Things that are explicitly out of scope until all three are proven:
- Image upload / Supabase Storage
- Authentication / user accounts / multi-user
- Dashboard UI improvements beyond a basic chat box
- Blog / additional page types beyond homepage
- PushPress sync
- Billing / payments
- Custom domain SSL automation
- A second template ("Clean") — only needed once "Bold" is solid
- Analytics, logging dashboards, error tracking
- Mobile-specific template tweaks
- SEO tooling
- Performance optimization
- Anything described as "while we're at it" or "it would be nice if"

### The bar for "proven":
- Run `npm run test:system` — all pass
- Run `npm run test:site <siteId>` on Iron Forge — all pass
- Make a chat edit, run site tests again — still pass, change is visible in HTML
- Swap template on Iron Forge, run site tests — content present in new template

---

## Testing Architecture

Two completely separate test suites with different purposes:

### 1. System Tests (`tests/system/`)
**What:** Does the Grow platform itself work correctly?
**When:** On every code change, CI, before any deploy of the platform
**Scope:**
- Supabase schema integrity (tables exist, constraints work)
- Builder service (given seed data, produces valid HTML)
- Domain routing (correct site returned for host header)
- API routes (health, sites list, rebuild, chat endpoint accepts input)
- Agent tools (each tool returns expected shape)

**Run with:** `npm run test:system`

### 2. Site Tests (`tests/site/`)
**What:** Does a specific client's built website meet their expectations?
**When:** After every rebuild of a client site (chat edit, template swap, manual rebuild)
**Scope:**
- Required sections present (`data-section` attributes exist)
- Client-specific content visible (their name, phone, address, hero headline)
- CSS variables compiled from their site_config (primary color appears in `:root`)
- Navigation links render
- No broken template syntax (no `{{` visible in output)
- CTA buttons have valid hrefs

**Run with:** `npm run test:site <siteId>`

These tests are parameterized — each client gets assertions built from their own DB data,
so "Iron Forge's phone number appears on the page" is generated from their `site_config`,
not hardcoded. This means the test suite automatically stays in sync with the DB.

---

## Architecture Decisions (do not relitigate)

- **Supabase** for content storage — not file-based JSON, not another DB
- **Handlebars** for templates — not React, not JSX, not a build step per client
- **Fastify serves client sites** via Host header routing — not Vercel per client
- **Full page rebuild** on every edit — not targeted DOM surgery (too complex for MVP)
- **6 tables** for MVP: templates, sites, site_config, nav_items, pages, sections, items
- **No testimonials table** — pulled from external review plugin per site

## Key Files
- `src/services/builder.ts` — reads Supabase → renders Handlebars → writes HTML
- `src/services/site-router.ts` — Host header → site lookup → serve HTML
- `src/services/content.ts` — Supabase CRUD helpers used by agent tools
- `src/api/routes/chat.ts` — agent tool registration + chat endpoint
- `src/templates/bold/` — Bold template (home.hbs + partials)
- `supabase/001_schema.sql` — DB schema
- `supabase/002_seed.sql` — Iron Forge CrossFit + Peak Performance seed data
- `dist/sites/{siteId}/` — built HTML output, served by Fastify

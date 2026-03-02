# Webflow Template Rebuild: CMS-First Architecture for 100% Agentic Management

## Context for Claude

You are helping build a **CMS-first Webflow template** for PushPress's Grow product — a platform managing gym websites at scale. The template must be designed so that an **autonomous AI agent pipeline** can edit 100% of visible content without human intervention in the Webflow Designer.

### What Already Exists

An autonomous CI pipeline is built and working:
- **Linear ticket** triggers a webhook → Express server → AI Orchestrator classifies ticket → routes to Webflow Agent
- **Webflow Agent** runs a 7-stage pipeline: analyze → generate Playwright tests → red test (should fail) → execute changes via API → publish to staging → green test (should pass) → report to Linear
- **CMS content editing works end-to-end** — tested with FAQ updates, program descriptions, hero text changes
- Code lives at: `webflow-autoedits/` — TypeScript, Anthropic SDK, Playwright, Express, MCP server

### The Problem

The current Webflow template (Bold gym template) was built for humans, not agents:
- **~55% of visible content** is CMS-driven and agent-editable via REST API
- **~35% is hardcoded in Webflow Components/Symbols** — section headings, nav links, footer text — invisible to the REST API
- **~10% is external embeds or images** requiring special handling
- The REST API Pages DOM endpoint is **read-only for the primary locale** (it's a localization API, not a general editing API)
- Pages cannot be created, elements cannot be added/removed, styles cannot be changed via REST API
- FAQ collection uses a terrible "numbered slot" anti-pattern (question-1 through question-11 on a single item)

### The Goal

Two things:

1. **A template system** — a handful of templates (5-10) with standardized CMS schemas. Clients pick a template, it gets cloned and populated with their content. The autonomous pipeline edits all CMS-driven content via REST API. Templates share the same CMS schema so the agent works identically across all sites.

2. **A template designer tool** — an internal tool/workflow for PushPress designers to create new templates efficiently. Uses Webflow MCP Designer API tools interactively through Claude Code. A designer provides inspiration, brand direction, or a reference site, and the AI builds the template following the standardized CMS schema. New templates can be spun up in hours instead of weeks.

**Design philosophy:** Templates with a customization layer. Each gym gets a professional site that feels unique through colors, fonts, imagery, section visibility, and content — not through bespoke layouts. The standardized CMS schema means the edit pipeline works identically across all sites regardless of which template they use.

**Content strategy — CMS vs hardcoded:**
- **CMS** = content that varies per gym or that owners ask to change (business info, programs, FAQs, hero text, section headings, team, testimonials, images, CTAs)
- **Hardcoded** = structural elements that are universal and never change (nav labels matching page names, footer layout, step numbers, legal link labels, copyright format)
- **One autonomous editing path:** Agent → CMS REST API → publish. Simple, testable, reliable.

**Why not use the Designer API for autonomous edits?**
We investigated using the Webflow MCP Designer API tools (`element_tool`, `element_builder`, etc.) for autonomous editing of hardcoded elements. **This is not possible.** The Designer API tools require the MCP Companion App to be open in a human's Webflow Designer browser tab — they manipulate the canvas in real-time and cannot run headlessly. This means:
- We considered tagging hardcoded elements with data-attributes (e.g., `data-content="company-name"`) so the agent could find and edit them via Designer API. **Rejected** — Designer API requires a browser, so it can't be used by the autonomous pipeline.
- The Designer API is powerful but is inherently interactive. It's the right tool for template creation (human designer in the loop) but not for daily autonomous ticket processing.
- If something needs to be edited autonomously by the pipeline, it **must** be in CMS. No workaround exists.

**Webflow MCP tool categories (confirmed):**

| Category | Tools | Requires Designer open? | Use case |
|----------|-------|------------------------|----------|
| **Designer API** | `element_builder`, `element_tool`, `de_page_tool`, `de_component_tool`, `style_tool`, `variable_tool`, `asset_tool` | **YES** — companion app must be running in browser | Template creation (interactive) |
| **Data API** | `data_cms_tool`, `data_sites_tool`, `data_pages_tool`, `data_scripts_tool`, `data_comments_tool` | **NO** — works headlessly after OAuth | Overlaps with REST API v2, can be used autonomously |

---

## Available Tools

### Webflow MCP — Designer API Tools (REQUIRES browser + companion app)
**Use for:** Template creation, structural changes, design work — always with a human in the loop.
**Cannot be used:** By the autonomous pipeline. These tools require the Webflow Designer to be open in a browser with the MCP Companion App running. They manipulate the canvas in real-time.

- `element_builder` — Create elements (Section, DivBlock, Heading, Paragraph, Button, Image, Form, etc.) up to 3 levels deep with styles, text, links, images
- `element_tool` — Get/select/modify all elements, set text, styles, links, images, attributes, CMS bindings
- `de_page_tool` — CREATE pages, create page folders, switch pages
- `de_component_tool` — Create components, insert component instances, transform elements to components
- `style_tool` — Manage styles (create/apply CSS classes)
- `asset_tool` — Manage assets (upload images, files)
- `variable_tool` — Manage CSS variables

### Webflow MCP — Data API Tools (headless, no browser needed)
**Use for:** CMS operations, site publishing — works after OAuth, no Designer needed.
**Note:** These overlap with REST API v2. Available through MCP but the autonomous pipeline currently uses REST API directly.

- `data_cms_tool` — Full CMS CRUD (create collections, create fields, create/update/publish/delete items)
- `data_sites_tool` — Site-level operations
- `data_pages_tool` — Page-level data operations
- `data_scripts_tool` — Custom code/scripts
- `data_comments_tool` — Page comments

### Webflow REST API v2 (used by the autonomous pipeline today)
- CMS: Collections, Items (full CRUD + publish/unpublish)
- Pages: Read DOM (text, images, component refs) — **write only for secondary locales**
- Sites: Publish to staging/production domains
- Assets: Upload files

### What the Autonomous Agent Pipeline Can Do Today
- Read any CMS collection and its items
- Create, update, delete, publish, unpublish CMS items
- Read page DOM (text nodes, image nodes, component references)
- Publish entire site to staging domain
- Generate and run Playwright E2E tests
- Upload screenshots to Linear
- Post detailed comments on Linear tickets

### The Two Editing Paths (by design)

| Path | Tools | When | Human needed? |
|------|-------|------|--------------|
| **Autonomous pipeline** | CMS REST API v2 | Daily ticket processing | No |
| **Template designer** | MCP Designer API via Claude Code | Creating/modifying templates | Yes (designer in the loop) |

These are intentionally separate. The pipeline handles content, the designer handles structure.

---

## Current Site Analysis (Dan MCP Test — Bold Gym Template)

### CMS Collections (17 total)

**Core Content Collections:**
- `Pages Hero Sections` — Hero content per page (heading, paragraph, CTA, images)
- `Programs` — Fitness programs (CrossFit, HIIT, etc.) with descriptions, images
- `3 Steps` — "Getting Started" steps (title, description, image)
- `Amenities` — Gym amenities (icon, label) — publish/unpublish to show/hide
- `Locations` — Address, phone, hours, map embed
- `FAQs` — **ANTI-PATTERN**: Single item with question-1/answer-1 through question-11/answer-11
- `Main Templates` — Singleton: logo, community quote, social links, about text
- `CTA Sections` — Call-to-action text and buttons
- `Benefits Section` — Value proposition cards (dual-purpose: published = visible, draft = hidden)

**Blog/Content Collections:**
- `Blog Category` — Blog categories
- `Blog Posts` — Blog articles
- `Blog Authors` — Author profiles

**Template/System Collections:**
- `GROW Entries` — DO NOT TOUCH (template management system)
- `Style Guide` — Colors, fonts (reference only)
- `Team Members` — Staff profiles
- `Testimonials` — Reviews/quotes

### Homepage Component Structure (13 components)
Every section is a Webflow Symbol. Pages are empty shells assembling components:

```
Navbar          → Nav links HARDCODED, logo + CTA from CMS
Homepage Header → ALL from CMS (hero heading, paragraph, CTA, images)
Benefits        → From CMS (Benefits Section collection)
Top Programs    → Section heading HARDCODED, cards from CMS (Programs)
Three Steps     → Section heading HARDCODED, steps from CMS (3 Steps)
Amenities       → Section heading HARDCODED, items from CMS (Amenities)
Community       → Section heading HARDCODED, quote + image from CMS
Map Section     → "Select locations" HARDCODED, location data from CMS
Reviews         → External embed (Elfsight widget)
FAQs            → Section heading HARDCODED, Q&A from CMS (numbered slots)
Final Offers    → CTA text from CMS
Footer          → Phone/email/hours ALL HARDCODED (not from CMS!)
```

### Content That Is NOT Agent-Editable Today

**Hardcoded in Components (can read, cannot write):**
- "EVERY BODY IS UNIQUE." + "Find a Fitness Routine that Works for You"
- "Getting Started Is Easy"
- "Everything You Need To Crush Your Fitness Goals"
- "A community that will keep you going"
- "Questions? We have the answers!" + "Still curious? CONTACT US!"
- "Select one of our locations" + "get directions"
- Nav: "Locations", "Programs", "Schedule", "Pricing", "About us", "Blog", "Contact"
- Footer: phone number, email, hours, copyright, legal links, "PROGRAMS", "About"

**Not accessible at all:**
- Reviews (external Elfsight embed)
- All images (can upload but can't set in primary locale DOM)
- Page structure (can't add/remove sections)
- Styles/CSS (no API)
- New pages (no creation endpoint in REST API)

---

## Design Principles for the Rebuilt Template

### 1. CMS for Content That Changes, Hardcode What Doesn't
Put **data** in CMS — gym-specific content that varies per site or that owners ask to update (hours, programs, FAQs, hero text, section headings, contact info, images). Keep **structure** hardcoded — nav labels, footer layout, legal links, step numbers, copyright format. The test: "Would a gym owner ever file a ticket to change this?" If no, hardcode it.

### 2. Proper Collection Design (No Numbered Slots)
Instead of `question-1, answer-1, question-2, answer-2...` on a single item, use a proper `FAQs` collection where each item IS one Q&A pair. Use reference fields or category fields to group them.

### 3. Singleton Collection for Global Site Data
A "Site Settings" collection with one item containing: gym name, logo, phone, email, hours, address, social links. Every component that needs this data binds to it. This replaces the current mess of Footer hardcoded text + Locations collection + Main Templates collection all duplicating the same data.

### 4. Section Headings in CMS
Section headings like "Find Your Fitness Routine" and "Getting Started Is Easy" DO belong in CMS — gyms customize these. Add them as fields on existing collections (e.g., a `heading` field on the Steps collection) rather than creating a separate "Section Content" collection.

### 5. Don't Over-CMS
Every collection adds complexity the agent must navigate. Avoid creating collections for things that are structural (Nav Items, Footer Links). A "Nav Items" collection means Collection Lists, filtering, ordering logic — all for 7 links that match page names and change maybe once a year. Not worth it.

### 6. Image Management Through CMS
All gym-specific images (hero photos, program images, team photos) should be CMS image fields. The agent can update images by uploading new assets and updating the CMS field URL. Decorative/structural images (icons, background patterns) can stay hardcoded.

---

## Open Questions & Things to Figure Out

### Architecture Questions

1. **MCP tools vs Designer API directly**: **ANSWERED.** MCP Designer tools require the Webflow Designer open in a browser with the Companion App. They cannot be scripted headlessly. Template creation = interactive MCP via Claude Code. Daily edits = CMS REST API autonomously. Two separate paths by design.

2. **Component CMS binding via MCP**: Can the `element_tool` set CMS bindings on elements inside components? The current analysis shows components CAN pull from CMS (Homepage Header does it) — but can we CREATE that binding programmatically via MCP during template creation? Needs hands-on testing.

3. **Dynamic lists via MCP**: Can the `element_builder` create Webflow Collection Lists (dynamic lists that auto-render published items)? This is critical for repeating content (programs, amenities, FAQs, team members). Needs hands-on testing during template creation.

4. **Component instances vs inline elements**: Should we use Webflow Symbols (components) at all? They add a layer of indirection. Would it be simpler to build pages with inline elements all bound to CMS? Trade-off: components give design consistency across pages, but add complexity for the agent. Can test both approaches during template creation.

5. **Multi-page CMS binding**: If the "About" page hero and "Home" page hero both pull from "Pages Hero Sections" collection but different items — how does the binding work? Is it filtered by slug? By a reference field? This determines our CMS schema design.

6. **Conditional visibility via MCP**: Can we set Webflow's "conditional visibility" rules via MCP during template creation? This is how you show/hide elements based on CMS field values (e.g., show a section only if the `visible` switch is on). Critical for making the template flexible with CMS toggles.

7. **OAuth setup for MCP**: The Webflow MCP server uses OAuth authentication. How do we set this up for the template designer workflow? Is it per-user, per-workspace, or per-site? Does the token persist across Claude Code sessions?

### CMS Schema Questions

7. **How many collections is too many?** Webflow has a 40-collection limit on most plans. The current template uses 17. With the trimmed schema we're targeting ~12 collections. Need to validate this leaves room for future additions.

8. **Reference fields for relationships**: FAQs should belong to categories. Programs should have related amenities. How well does the REST API handle reference fields? Can the agent read/write them?

9. **Rich text vs plain text**: Some CMS fields are rich text (HTML), some are plain text. The agent needs to know which is which. Rich text fields can contain formatting, links, embedded images — more powerful but harder to edit correctly. What's our policy?

10. **Image fields**: When the agent updates a CMS image field, does it need to upload to Webflow's asset CDN first, then set the URL? Or can it set an external URL? This affects the upload pipeline.

11. **Draft vs published items**: The current template uses draft/published status as a visibility toggle (Amenities, Benefits). Is this a pattern we want to keep? Or should we use a boolean "visible" field instead? The draft pattern is elegant but has side effects (drafts don't appear in API queries by default).

### Template Design Questions

12. **How many page types?** The current template has: Home, About, Contact, Blog (list), Blog Post (template), 404, and likely a few more. What's the full list of pages a gym needs? Do we need: Pricing, Schedule, Programs (list), Program (detail), Team, Locations, Promotions/Landing pages?

13. **Blog architecture**: Blog posts are already a proper CMS collection. Do we keep this as-is or redesign? Blog is probably the most "standard" Webflow CMS pattern and likely works fine.

14. **Reviews/testimonials**: Currently an external Elfsight embed. Should we replace with a CMS-driven testimonials section? This would make it agent-editable but loses the Google Reviews integration.

15. **Forms**: Contact forms, consultation forms, newsletter signups. These typically use Webflow's native form element or embed a third-party form (HubSpot, Typeform). Can we create/modify forms via the Designer API?

16. **Navigation**: Nav labels stay hardcoded — they match page names and rarely change. The nav CTA button text should come from CMS (it already does). **DECIDED.**

17. **Footer**: Footer **data** (phone, email, hours, address, social links) comes from CMS via Site Settings singleton. Footer **structure** (column layout, link labels, copyright format) stays hardcoded. **DECIDED.**

18. **Responsive design**: Webflow styles have desktop/tablet/mobile breakpoints. When we create elements via MCP, do we need to set styles for each breakpoint? Or does Webflow inherit/cascade?

19. **Interactions and animations**: The current template has hover effects, scroll animations, etc. Can these be set via Designer API? Or are they lost in a rebuild?

### Operational Questions

20. **Template cloning strategy**: Once we build a master template, how do we clone it for each new gym? Options:
    - Webflow's native "duplicate site" feature (manual, requires Workspace plan)
    - Rebuild programmatically for each site via MCP (slow but fully automated)
    - Use Webflow's "template" marketplace feature
    - Which approach scales to 1000 sites?

21. **Per-site customization after cloning**: Each gym needs different colors, fonts, images, content. After cloning:
    - Populate all CMS collections with the gym's content (REST API — agent can do this)
    - Update CSS variables for colors/fonts (Designer API needed? Or can CMS color fields drive this?)
    - Toggle section visibility via CMS `visible` switches
    - How much of this can be fully automated vs needs a human touch?

22. **Existing sites migration**: ~1000 existing gym sites on the old Bold template. Options:
    - New template for new sites only, sunset old template gradually
    - Batch-migrate existing sites (rebuild on new template, populate CMS from old site data)
    - Hybrid: migrate high-value sites first, let low-activity sites age out
    - What's the data migration path? Can we scrape old site content and populate new CMS?

23. **Template versioning**: When we improve a template (add a section, fix a layout), how do we propagate to cloned sites? Webflow has no "push template update." Options:
    - Accept divergence (each site is a fork, gets content updates but not template updates)
    - Track template version per site, apply structural diffs via Designer API
    - Design templates to be as thin as possible so divergence doesn't matter much

24. **Template designer workflow**: How does the internal template designer tool integrate?
    - Is it a Claude Code session with MCP tools + a standardized prompt?
    - Do we need a config file that defines the CMS schema so the AI knows what to create?
    - How do we validate a new template meets the standard? Automated test suite?
    - Can we version-control template definitions (separate from the Webflow site itself)?

24. **Cost at scale**: With 1000 sites, each running multiple AI pipeline executions per day:
    - Claude API costs per run (~$0.50-2.00 per ticket based on current usage)
    - Webflow API rate limits (60 requests/minute per site)
    - Playwright test execution time and compute costs
    - Linear API limits
    What's the monthly cost model?

25. **Webflow plan requirements**: Which Webflow plan features do we need?
    - CMS items limit (most plans have limits per site)
    - API access (which plans include REST API v2?)
    - Custom domains
    - Form submissions
    - Do we need Workspace plan for site duplication?

### Testing & QA Questions

26. **Visual regression testing**: Beyond text assertions, should Playwright compare screenshots pixel-by-pixel? Tools like Percy, Applitools, or built-in Playwright visual comparison. This would catch layout breaks the text assertions miss.

27. **Cross-browser testing**: Current tests run Chromium only. Do we need Firefox/Safari? Mobile viewport sizes?

28. **Accessibility testing**: Should the agent verify WCAG compliance? Playwright can run axe-core audits. Could be a "bonus check" on every green test run.

29. **SEO validation**: Meta titles, descriptions, OG tags, canonical URLs. These should be CMS fields too. Should the agent verify they're set correctly?

30. **Performance testing**: Lighthouse scores, Core Web Vitals. Should the pipeline check these and flag regressions?

### Pipeline Integration Questions

31. **How does the template builder integrate with the existing pipeline?** The pipeline currently assumes an existing site. For template creation:
    - Is it a separate "Template Builder Agent"?
    - Or a mode of the existing Webflow Agent?
    - Does it use the same 7-stage pipeline pattern?

32. **CMS schema as code**: Should the CMS schema (collections, fields, types) be defined in a config file that can be version-controlled? This would make it repeatable and diffable. The `data_cms_tool` can create collections/fields — we could have a "schema sync" command.

33. **Rollback for template changes**: If the template builder breaks something, how do we roll back? Webflow has site backups but they're manual. Should we snapshot the site before major changes?

34. **Testing the template itself**: How do we verify the template is correctly built? A "template validation" test suite that checks:
    - All expected pages exist
    - All CMS collections have correct fields
    - All elements are bound to CMS (no hardcoded text)
    - All breakpoints render correctly
    - All CMS items have content

---

## Proposed CMS Schema (Draft)

This is a starting point — needs validation against actual gym website needs.

**Guiding principle:** Only put things in CMS that gym owners actually ask to change. Structure stays hardcoded.

### CMS Collections (~12 total)

**Site Settings** (singleton — 1 item per gym)
- `name` (Plain Text) — Gym name
- `logo` (Image)
- `phone` (Plain Text)
- `email` (Plain Text)
- `address` (Plain Text) — Full formatted address
- `google-maps-embed` (Plain Text — URL or embed code)
- `hours` (Plain Text) — e.g., "Mon-Fri: 5AM-9PM | Sat-Sun: 8AM-5PM"
- `instagram-url` (URL)
- `facebook-url` (URL)
- `youtube-url` (URL)

*Replaces current: Main Templates + Locations (partially) + hardcoded Footer text. Single source of truth for contact/business info.*

**Page Heroes** (one item per page)
- `slug` (Plain Text) — "home", "about", "contact"
- `heading` (Plain Text)
- `subheading` (Plain Text)
- `paragraph` (Rich Text)
- `cta-text` (Plain Text)
- `cta-url` (URL)
- `image` (Image)
- `meta-title` (Plain Text)
- `meta-description` (Plain Text)

*Similar to current Pages Hero Sections. Each page's hero + SEO meta in one place.*

**Programs** (one item per program)
- `name` (Plain Text)
- `description` (Rich Text)
- `short-description` (Plain Text)
- `image` (Image)
- `order` (Number)
- `visible` (Switch)

**FAQs** (one item per Q&A — NOT numbered slots)
- `question` (Plain Text)
- `answer` (Rich Text)
- `category` (Plain Text) — "general", "pricing", "programs"
- `order` (Number)

*Replaces the numbered-slot anti-pattern. Each FAQ is its own item. Use Collection List with filter on `category` to show different FAQ groups on different pages.*

**Team Members** (one item per person)
- `name` (Plain Text)
- `role` (Plain Text)
- `bio` (Rich Text)
- `photo` (Image)
- `order` (Number)

**Testimonials** (one item per testimonial)
- `quote` (Plain Text)
- `author-name` (Plain Text)
- `author-role` (Plain Text) — "Member since 2020"
- `rating` (Number) — 1-5

*Replaces external Elfsight embed. Agent-editable. Loses live Google Reviews sync but gains full control.*

**Amenities** (one item per amenity)
- `name` (Plain Text)
- `icon` (Image)
- `order` (Number)
- `visible` (Switch)

**Steps** (one item per step — "Getting Started" section)
- `title` (Plain Text)
- `description` (Rich Text)
- `step-number` (Number)
- `image` (Image)

**CTAs** (one item per CTA block — nav button, bottom CTA, etc.)
- `location` (Plain Text) — "nav", "bottom", "footer"
- `heading` (Plain Text)
- `button-text` (Plain Text)
- `button-url` (URL)

### Content Collections (keep as-is from current template)

**Blog Categories**
**Blog Posts**
**Blog Authors**

### What Stays Hardcoded (NOT in CMS)

- Nav link labels ("Programs", "Schedule", "Contact", etc.) — match page names, structural
- Footer link labels and layout — structural, rarely changes
- Step numbers ("1", "2", "3") — structural
- Copyright text format — structural
- Legal links ("Privacy Policy", "Terms") — structural, URLs hardcoded
- Decorative icons and background patterns — design, not content

### Estimated Collection Count: ~12
Well under Webflow's 40-collection limit. Leaves room for future additions without over-engineering.

---

## Template Designer Tool (Internal)

An internal workflow for creating new templates. Not customer-facing — used by PushPress team to expand the template library.

### How It Works (confirmed feasible)

The Webflow MCP Designer API tools require the Webflow Designer to be open in a browser with the Companion App running. This is fine for template creation because a human designer IS in the loop. The workflow:

1. **Designer opens Webflow Designer** in browser with MCP Companion App active
2. **Designer opens Claude Code** connected to the Webflow MCP server
3. **Designer provides direction:** inspiration URL, mood board, brand guidelines, or description ("modern minimalist gym, dark theme, bold typography")
4. **Claude builds via MCP:** Using Designer API tools interactively:
   - Creates CMS collections following the standardized schema (`data_cms_tool`)
   - Creates pages (`de_page_tool`)
   - Builds layout elements and components (`element_builder`, `de_component_tool`)
   - Applies styles (`style_tool`)
   - Binds content elements to CMS fields (`element_tool`)
   - Populates sample content (`data_cms_tool`)
5. **Designer reviews live in Webflow Designer** — tweaks styling, adjusts spacing, refines animations, fixes responsive breakpoints
6. **Validation:** Run template validation suite (all CMS bindings work, all pages render, responsive checks)
7. **Publish as template:** Ready for cloning to new gym sites

### Why the Designer Must Be Open (and why that's OK)

The MCP Companion App runs inside the Webflow Designer browser tab and acts as the execution bridge — it translates MCP tool calls into canvas manipulations in real-time. This is a Webflow architectural requirement, not something we can work around.

But template creation is inherently a design task that benefits from human oversight. The designer sees every change Claude makes in real-time on the canvas. They can redirect ("make that section darker", "swap to a two-column layout") or manually polish what the AI builds. This is the right workflow — AI does the heavy lifting (CMS schema, element creation, CMS bindings), human does the taste-making (visual polish, responsive tweaks, animations).

### Key Constraint: Standardized CMS Schema

ALL templates use the SAME CMS collections and field names. This is non-negotiable — it's what makes the autonomous edit pipeline work across all sites. Templates differ in:
- Visual design (colors, fonts, spacing, layout)
- Which sections are included (some templates have team pages, some don't)
- Component styling and arrangement
- Animations and interactions

Templates do NOT differ in:
- CMS collection names or field names
- How the agent reads/writes content
- What Playwright selectors target CMS-driven content

### Why This Matters

Without a template designer tool, creating a new template means weeks of manual Webflow work. With it, a designer describes what they want, Claude builds the scaffolding via MCP (CMS schema + pages + elements + CMS bindings), and the designer polishes the visual design. New templates in hours instead of weeks. The template library grows fast, giving gyms more variety while the autonomous pipeline stays simple.

### Editing Existing Templates

Same workflow as creating a new template — designer opens Webflow Designer + Claude Code MCP. The difference is they're modifying an existing template rather than starting from scratch.

**When to edit a template:**
- Add a new section type (e.g., "Pricing Table" section)
- Fix a layout bug across all sites using this template
- Refresh the design (new year, new look)
- Add support for a new CMS collection (e.g., adding "Events" to the schema)

**Propagation problem:** Editing the master template doesn't automatically update sites already cloned from it. Each cloned site is independent. Options:
- For CMS schema changes: the pipeline or management app can add new collections/fields to existing sites via REST API (automatable)
- For structural/design changes: each site needs the change applied via Designer API (requires human session per site, or batch it)
- For most cases: only apply template updates to new sites, let existing sites stay on their version unless the gym requests an update

**Template versioning (lightweight):** Track which template version each site was cloned from in the site config. When a template is updated, flag sites on older versions. The PushPress team can then decide which sites to upgrade.

---

## Client Onboarding: Interview → Live Website

The most important workflow — how a new gym goes from signing up to having a live website. This should be automatable via API/MCP, kicked off by a human initially but with a path to full automation.

### The Input: Unstructured Client Data

Gym owners don't fill out neat forms. They talk. They send photos. They describe things in their own words. The system needs to handle unstructured input and turn it into structured CMS data.

**Input sources (any combination):**
- Sales call transcript or notes ("They have 3 locations, open 5AM-9PM weekdays, they do CrossFit and yoga and personal training, owner is Mike, they want a dark modern look")
- Onboarding interview (chat or voice) — AI asks questions, client answers naturally
- Intake form (structured) — fallback for clients who prefer forms
- Existing website or social media — scrape content from their current site, Instagram, Google Business listing
- Brand assets — logos, photos, color preferences sent via email/Slack/upload

### The Process

```
Client signs up for PushPress
         │
         ▼
┌─────────────────────────────┐
│  1. GATHER                  │
│  Interview / intake form /  │
│  scrape existing presence   │
│  → Raw unstructured data    │
└─────────────┬───────────────┘
              │
              ▼
┌─────────────────────────────┐
│  2. STRUCTURE               │
│  AI processes raw data into │
│  structured CMS content     │
│  → Site Settings, Programs, │
│    FAQs, Team, etc.         │
└─────────────┬───────────────┘
              │
              ▼
┌─────────────────────────────┐
│  3. BUILD                   │
│  Clone template → populate  │
│  CMS via REST API →         │
│  customize colors/fonts     │
│  → publish to staging       │
└─────────────┬───────────────┘
              │
              ▼
┌─────────────────────────────┐
│  4. REVIEW                  │
│  Human reviews staging site │
│  Client sees preview        │
│  → Feedback loop            │
└─────────────┬───────────────┘
              │
              ▼
┌─────────────────────────────┐
│  5. LAUNCH                  │
│  Publish to production      │
│  Connect custom domain      │
│  → Site is live             │
└─────────────────────────────┘
```

### Step-by-Step Detail

**Step 1: Gather — AI Interview or Intake**

Option A — **AI Chat Interview** (path to full automation):
- Client opens a chat interface (in the management app, or a standalone onboarding page)
- AI asks questions conversationally: "What's your gym called? What programs do you offer? What are your hours? What vibe are you going for — bright and energetic, or dark and intense?"
- Client answers naturally, sends photos, describes things in their own words
- AI follows up on gaps: "You mentioned CrossFit and yoga — any other programs? Do you have a team page you want on the site?"
- Output: unstructured transcript + uploaded assets

Option B — **Structured Intake Form** (simpler, less AI):
- Form in the management app with sections matching CMS collections
- Gym name, address, hours, programs, team members, photos, brand colors
- Output: structured form data

Option C — **Hybrid** (recommended starting point):
- Sales team fills in what they know from the sales call
- AI reviews the partial data and generates a follow-up questionnaire for the client
- Client fills in the gaps
- AI processes everything together

**Step 2: Structure — AI Turns Raw Data into CMS Content**

This is where the AI shines. Given a messy transcript like:
> "We're open 5AM to 9PM weekdays, weekends 8 to 5. We do CrossFit, HIIT, yoga, and personal training. Our head coach is Mike Rivera, he's been coaching for 12 years. We want something dark and modern looking, like this gym I saw on Instagram..."

The AI generates structured CMS item data:

```json
{
  "site_settings": {
    "name": "Iron Forge Fitness",
    "hours": "Mon-Fri: 5AM-9PM | Sat-Sun: 8AM-5PM",
    "phone": "...",
    ...
  },
  "programs": [
    { "name": "CrossFit", "description": "...", "order": 1 },
    { "name": "HIIT", "description": "...", "order": 2 },
    ...
  ],
  "team_members": [
    { "name": "Mike Rivera", "role": "Head Coach", "bio": "12 years of coaching experience...", "order": 1 }
  ],
  "customization": {
    "template": "bold-dark",
    "primary_color": "#1a1a2e",
    "secondary_color": "#e94560",
    "section_visibility": { "team": true, "testimonials": false, "amenities": true }
  }
}
```

The AI also generates content the client didn't provide — program descriptions, FAQ answers, meta descriptions — based on what it knows about the gym. Client reviews and approves.

**Step 3: Build — Clone + Populate + Customize**

Fully automatable via REST API:
1. Clone the selected template (manual step today — human duplicates site in Webflow, or automated if we find a programmatic approach)
2. Create all CMS items from the structured data via REST API
3. Upload images to Webflow Assets API, set on CMS image fields
4. Publish to staging

**Customization within the template (no Designer needed):**
- Section visibility: toggle CMS `visible` switches to show/hide sections
- Content tone: AI writes all text in the gym's voice/style
- Image selection: client's photos placed in hero, programs, team, etc.

**Customization that needs Designer API (human session):**
- Colors and fonts (CSS variables — needs Designer API or custom code injection)
- Section ordering changes (if not handled by CMS `order` fields)

**Design note for templates:** If templates are built with CSS custom properties (`--primary-color`, `--secondary-color`, `--heading-font`, `--body-font`) and those are set via Webflow's custom code `<head>` injection (which IS available via REST API `custom_code` scope), then color/font customization could be fully automated without the Designer. Worth testing.

**Step 4: Review — Human + Client Feedback**

- PushPress team reviews staging site in management app
- Client gets a preview link
- Feedback comes as natural language: "Can you make the hero image bigger? I don't like the tagline, can we change it to 'Forge Your Strength'? We also need to add our Saturday morning class to the schedule."
- Feedback goes through the same autonomous pipeline — each piece of feedback becomes a ticket or is processed directly
- Iterate until client approves

**Step 5: Launch**

- Publish to production via REST API
- Connect custom domain (manual in Webflow dashboard, or via API if supported)
- Site is live
- Hand off to the autonomous pipeline for ongoing edits

### Automation Maturity Path

| Phase | Gather | Structure | Build | Review | Launch |
|-------|--------|-----------|-------|--------|--------|
| **MVP** | Sales team notes + form | AI + human review | Human clones template, API populates CMS | Human reviews | Human publishes |
| **V2** | AI chat interview | AI (auto-approved for standard content) | Fully automated (clone + populate + customize) | Client self-service preview + feedback chat | Human approves, API publishes |
| **V3** | AI voice interview on sales call | Fully automated | Fully automated | AI processes feedback autonomously | Automated with human approval gate |

### Key Insight: Unstructured Input → Structured Output

The entire system is designed around this principle. Whether it's:
- A sales call transcript → structured CMS data for onboarding
- A gym owner's chat message → a Linear ticket for the pipeline
- A client interview → a complete website build request
- A screenshot + "change this" → an automated edit

The AI's job is always the same: take messy human input, understand the intent, produce structured actions against the CMS API. The same AI capabilities power onboarding, daily edits, and feedback processing.

---

## Client-Driven Editing: Tickets, Screenshots, and Natural Language

This is the core autonomous pipeline, but it's worth documenting the full client experience — how a gym owner goes from "I want to change something" to seeing the change on their site.

### How Gym Owners Request Changes

Gym owners don't write structured tickets. They describe what they want in whatever way is natural:

**Via chat/message:**
> "Hey can we update our hours? We're now open til 10PM on weekdays starting next month"

> "I want to add a new program called 'Strength Foundations' — it's for beginners who want to learn the basics of weightlifting"

> "The hero image on the homepage is outdated, can we swap it for this photo?" [attaches image]

**Via screenshot + annotation:**
> [Screenshot of homepage with arrow pointing to FAQ section] "This answer is wrong, we DO offer group classes for beginners now"

> [Screenshot of programs page] "Can we change the order? Put CrossFit first and yoga last"

**Via voice/conversation:**
> "We just hired a new trainer, Sarah Chen. She specializes in HIIT and nutrition. Can you add her to the team page?"

### How the System Processes These

```
Client sends message/screenshot/voice
              │
              ▼
┌─────────────────────────────┐
│  AI processes unstructured  │
│  input into a structured    │
│  change request             │
│  (same AI as onboarding)    │
└─────────────┬───────────────┘
              │
              ▼
┌─────────────────────────────┐
│  Linear ticket created      │
│  (or processed directly)    │
│  with extracted:            │
│  • What to change           │
│  • Which CMS collection     │
│  • Which fields             │
│  • New values               │
└─────────────┬───────────────┘
              │
              ▼
┌─────────────────────────────┐
│  Autonomous pipeline runs   │
│  analyze → test → execute   │
│  → publish → verify →       │
│  report                     │
└─────────────┬───────────────┘
              │
              ▼
┌─────────────────────────────┐
│  Client sees result         │
│  • Screenshot in Linear     │
│  • Preview link to staging  │
│  • Approve or request       │
│    changes                  │
└─────────────────────────────┘
```

### Input Channels (future)

The system should accept change requests from multiple channels, all flowing into the same pipeline:

- **Linear tickets** (current) — internal team or automation creates tickets
- **Management app chat** — gym owner types a message, AI creates the ticket
- **SMS/WhatsApp** — gym owner texts a change request (via Twilio/WhatsApp Business API)
- **Email** — gym owner emails a change, AI parses it
- **Voice** — gym owner calls or leaves a voicemail, speech-to-text → AI → ticket
- **Screenshot annotation** — gym owner takes a screenshot, draws on it, sends it with a note

All channels converge on the same AI processing: unstructured input → structured change request → autonomous pipeline.

### Screenshot Processing

Screenshots are especially powerful for edits. A gym owner can:
1. Take a screenshot of their site
2. Circle or arrow the thing they want changed
3. Type "change this to [new text]" or "remove this" or "this is wrong"

The AI needs to:
1. Analyze the screenshot to identify what element is highlighted
2. Map that element to a CMS collection and field
3. Extract the desired change
4. Create a structured change request for the pipeline

This uses Claude's vision capabilities. The pipeline already supports screenshot attachments (Playwright screenshots uploaded to Linear). Adding screenshot INPUT (client sends screenshot → AI interprets) is a natural extension.

---

## Template Customization: Making Each Site Unique

With a handful of templates serving 1000+ gyms, each site needs to feel personalized. The template architecture should support deep customization without needing the Designer API for each site.

### Customization Layers (from most to least automatable)

**Layer 1: Content (fully autonomous via CMS REST API)**
- All text: gym name, taglines, program descriptions, FAQs, team bios, testimonials
- All images: hero photos, team photos, program images, logo
- Section visibility: CMS `visible` switches hide/show entire sections
- Content ordering: CMS `order` fields control sequence within sections
- SEO: meta titles, descriptions, OG images per page

This alone makes two gyms on the same template look very different. Different photos, different copy, different programs shown, different FAQ questions.

**Layer 2: Colors & Fonts (automatable if templates use CSS custom properties)**
- Templates should define all colors and fonts via CSS custom properties: `--primary-color`, `--secondary-color`, `--accent-color`, `--heading-font`, `--body-font`
- These can potentially be set via Webflow's custom code `<head>` injection (available through REST API `custom_code` scope):
  ```html
  <style>:root { --primary-color: #e94560; --secondary-color: #1a1a2e; }</style>
  ```
- If this works, color/font customization is fully automatable — no Designer needed
- **Needs testing:** Does Webflow's custom code injection override CSS variables defined in the Designer? Does it persist through publishes?

**Layer 3: Section Configuration (partially automatable)**
- Which sections appear on which pages (CMS visibility toggles)
- Section ordering (if template supports reordering via CMS or custom code)
- Number of items shown (e.g., "show 3 programs" vs "show 6") — controlled by Collection List settings in the template, or CSS
- Hero style variants (if template includes multiple hero layouts togglable via CMS)

**Layer 4: Structural Changes (requires Designer API = human session)**
- Adding a section that the template doesn't include
- Changing layout (two-column to three-column)
- Custom page creation beyond the template's standard pages
- Unique design elements for a specific gym

**Design principle for templates:** Maximize Layer 1 and Layer 2 customization so that most gyms never need Layer 3 or 4. Two gyms on the same template should look 80% different just from content + colors + fonts + section visibility.

### How Customization Requests Are Processed

Gym owners don't say "change CSS variable --primary-color to #e94560." They say:

> "We want a darker, more intense look. Our brand colors are black and red."

> "Can we hide the testimonials section? We don't have enough reviews yet."

> "We want our programs in a different order — CrossFit first, then HIIT, then Yoga."

The AI interprets these natural language requests and maps them to the right customization layer:
- "darker, black and red" → Layer 2: update CSS variables via custom code injection
- "hide testimonials" → Layer 1: set Testimonials section `visible` to false in CMS
- "reorder programs" → Layer 1: update `order` fields on Program CMS items

If a request requires Layer 4 (Designer API), the system flags it: "This change requires a design session. We'll schedule a designer to make this update."

---

## Grow Management App (Internal Tool + Client Blog Editor)

A web app that serves two audiences: the PushPress internal team (full site management) and gym owners (blog editing). Built on top of the same Webflow REST API v2 that the autonomous pipeline uses.

### Authentication: Agency-Wide OAuth

Webflow OAuth allows a registered app to request access to **specific sites or an entire workspace** during authorization. A PushPress admin authorizes the app once with workspace-level access, and the resulting token works across all client sites.

**How it works:**
1. Register a private Webflow App (doesn't need to be on the marketplace)
2. PushPress admin goes through OAuth flow, grants access to the entire workspace
3. App receives an access token with scopes: `sites:read`, `sites:write`, `cms:read`, `cms:write`, `pages:read`, `pages:write`, `assets:read`, `assets:write`, `forms:read`
4. This single token lets the app manage every gym site in the workspace

**Available auth methods (Webflow):**

| Method | Scope | Our use |
|--------|-------|---------|
| **Site Token** | One site only | Not useful — we need multi-site |
| **Workspace Token** | Audit logs only (Enterprise plan required) | Not useful — can't access site data |
| **OAuth App** | Multiple sites or entire workspace | **This is what we use** |

**Caveat to verify:** Docs say users authorize "specific Sites or a Workspace" but don't explicitly confirm whether workspace-level auth automatically includes future sites added later. If not, re-authorization is needed when onboarding new gyms. Worth testing early.

**Gym owner access:** Gym owners never get Webflow tokens. They log into the Grow Management App with their own credentials. The app uses the agency OAuth token behind the scenes, scoped to only show/edit their specific site's blog CMS. They never see Webflow.

### Internal Admin (PushPress Team)

**Dashboard**
- All gym sites in one view — name, template, domain, last published, pipeline status
- Quick actions: publish to staging, publish to production, trigger pipeline run
- Search and filter by template, status, region

**Site Detail**
- CMS browser: view and edit any collection's items for this site
- Publish controls: staging and production with confirmation
- Pipeline history: all runs for this site, status, audit logs, cost per run
- Site config: edit the site's JSON config (Linear team, trigger status, allowed ticket types)
- Knowledge base: view/edit site-specific rules and corrections

**Template Management**
- List all templates with preview thumbnails
- Clone template to create a new gym site
- Manage the standardized CMS schema (view collections/fields, validate consistency)
- Link to Webflow Designer for structural edits (opens in new tab — Designer API work stays in Webflow)

**Pipeline Controls**
- Trigger manual pipeline runs (same as existing `/test/trigger` endpoint)
- View all active/queued/completed runs across all sites
- Cost dashboard: per-site, per-run, monthly totals
- Knowledge base editor: global rules, per-agent rules, corrections

**Audit & Monitoring**
- Searchable audit log across all sites ("show me all CMS changes this week")
- Error log: failed runs, blocked tickets, retries
- Health dashboard: API rate limits, queue depth, stuck runs

### Client Blog Editor (Gym Owners)

A clean, simple interface where gym owners write and manage their blog posts. They never see Webflow, Linear, or pipeline machinery.

**Features:**
- Blog post list: drafts, published, scheduled
- Rich text editor (TipTap or Slate.js) → writes to Webflow CMS `Blog Posts` collection
- Image upload: drag-and-drop → Webflow Assets API → CMS image field
- Draft / publish toggle (maps to Webflow CMS item publish/unpublish)
- Category picker (from `Blog Categories` collection)
- SEO fields: meta title, meta description, OG image (maps to CMS fields on `Page Heroes` or `Blog Posts`)
- Preview button: opens their staging site in a new tab
- Simple, mobile-friendly UI — gym owners manage this from their phone between classes

**What the blog editor does NOT include:**
- Page editing (hero text, programs, FAQs) — these go through Linear tickets → autonomous pipeline
- Site structure changes — these go through the template designer
- Publishing the site — happens automatically when the pipeline runs, or via internal admin

**Why separate the blog editor from the pipeline?**
Blog posts are the one content type where gym owners want to write and publish directly, not file a ticket and wait. Everything else (update hours, change hero text, add a program) is better as a ticket because it benefits from AI-generated tests, staging preview, and human review. Blog posts are low-risk, high-frequency, and time-sensitive — gym owners want to publish a "Summer Challenge" post NOW, not wait for a pipeline run.

### Tech Stack

- **Framework:** Next.js (React, API routes, SSR, auth middleware)
- **Auth:** NextAuth or Clerk — internal team gets admin role, gym owners get client role
- **API layer:** Webflow REST API v2 via the agency OAuth token (shared client code with the pipeline)
- **Rich text:** TipTap (open source, outputs HTML compatible with Webflow rich text fields)
- **Image upload:** Webflow Assets API (upload → get asset URL → set on CMS item)
- **Deployment:** Same infrastructure as the pipeline (Railway/Fly.io) or Vercel for the Next.js app
- **Database:** User accounts, role mappings (which gym owner → which site), session management

### How It Fits Together

```
┌─────────────────────────────────────────────────────────────────┐
│                     Grow Management App                         │
│                                                                 │
│  ┌──────────────────────┐    ┌───────────────────────────────┐  │
│  │   Internal Admin     │    │    Client Blog Editor         │  │
│  │   (PushPress team)   │    │    (Gym owners)               │  │
│  │                      │    │                               │  │
│  │  • All sites dashboard│    │  • Blog post list            │  │
│  │  • CMS browser       │    │  • Rich text editor          │  │
│  │  • Publish controls  │    │  • Image upload              │  │
│  │  • Pipeline controls │    │  • Draft/publish             │  │
│  │  • Template mgmt     │    │  • SEO fields                │  │
│  │  • Audit logs        │    │  • Preview                   │  │
│  └──────────┬───────────┘    └──────────────┬────────────────┘  │
│             │                               │                   │
│             └───────────┬───────────────────┘                   │
│                         │                                       │
│              Webflow REST API v2                                 │
│              (Agency OAuth Token)                                │
│                         │                                       │
└─────────────────────────┼───────────────────────────────────────┘
                          │
          ┌───────────────┼───────────────┐
          │               │               │
     Site A CMS      Site B CMS      Site C CMS
     (Gym Alpha)     (Gym Beta)      (Gym Gamma)
```

The management app and the autonomous pipeline share the same Webflow API. The app is for humans (internal team browsing CMS, gym owners writing blogs). The pipeline is for AI (processing tickets autonomously). Both read/write the same CMS data through the same REST API.

### Open Questions for the Management App

1. **Can the OAuth token access future sites automatically?** If workspace-level auth doesn't include sites added after authorization, we need a re-auth flow or a different approach for onboarding new gyms.

2. **Rich text round-tripping:** TipTap outputs HTML. Webflow CMS rich text fields accept HTML. But does the HTML survive a round trip? (Write from TipTap → store in Webflow CMS → read back → display in TipTap.) Need to test for formatting loss or sanitization issues.

3. **Image upload flow:** When a gym owner uploads an image in the blog editor, the app needs to: upload to Webflow Assets API → get the asset URL → set it on the CMS item's image field. Is there latency? Size limits? Does Webflow process/resize images?

4. **Real-time preview:** Can we show a live preview of the blog post as the gym owner types? Or is it always "save draft → click preview → see staging site"?

5. **Role-based access control:** How granular does it need to be? Options:
   - Simple: admin (PushPress team sees everything) vs client (gym owner sees their blog only)
   - Medium: add "site manager" role for gym staff who can edit CMS but not publish
   - Complex: per-collection permissions (some staff can edit programs but not FAQs)
   Start simple, add complexity later.

6. **Offline/conflict handling:** If a gym owner edits a blog post while the pipeline is also editing CMS on the same site (different collection), are there conflicts? Probably not — they're editing different collections. But worth considering.

7. **Mobile experience:** Gym owners will use this between classes on their phones. The blog editor needs to be mobile-first. Is TipTap good on mobile? Do we need a simplified mobile view?

---

## Phased Build Approach

### Phase A: CMS Schema
1. Create all collections with proper fields and types
2. Populate with sample gym content (Work Ethic KC as reference)
3. Validate that REST API can read/write every field
4. Document the schema in a config file for repeatability

### Phase B: Design System
1. Define CSS variables for colors, fonts, spacing
2. Create base styles/classes that components will use
3. Set up responsive breakpoints
4. Create utility classes for common patterns

### Phase C: Components
1. Build each component (Navbar, Hero, Section, Card, Footer, etc.)
2. Bind content text/images to CMS fields (heroes, programs, FAQs, contact info, etc.)
3. Hardcode structural text (nav labels, footer layout, step numbers, legal links)
4. Footer binds phone/email/hours/address/social from Site Settings singleton
5. Use Collection Lists for repeating content (programs, FAQs, amenities, team, testimonials)
6. Test each component renders correctly with sample data

### Phase D: Pages
1. Create all page types (Home, About, Contact, Blog, etc.)
2. Assemble pages from components
3. Set up CMS-driven page routing where possible
4. Verify all pages render correctly

### Phase E: Validation
1. Run template validation tests (all CMS bindings work, no broken references)
2. Run Playwright tests on every page (content renders from CMS correctly)
3. Verify agent can edit every CMS collection via REST API
4. Mobile/responsive verification
5. Performance audit

### Phase F: Pipeline Integration
1. Update Webflow Agent's analyze prompt with new CMS schema knowledge
2. Update knowledge base with new collection names and field names
3. Test end-to-end: create a Linear ticket → agent edits CMS → tests pass
4. Verify agent can handle every collection type

### Phase G: Grow Management App
1. Register Webflow OAuth App, implement auth flow, verify workspace-level access
2. Next.js project setup with auth (NextAuth/Clerk), admin vs client roles
3. Internal admin: sites dashboard, CMS browser, publish controls
4. Internal admin: pipeline controls (trigger, status, audit logs, cost dashboard)
5. Client blog editor: post list, TipTap rich text editor, image upload, draft/publish
6. Client blog editor: SEO fields, category picker, preview link
7. Test rich text round-tripping (TipTap → Webflow CMS → TipTap)
8. Mobile optimization for blog editor
9. Deploy alongside pipeline infrastructure

### Phase H: Client Onboarding Pipeline
1. Build AI interview/intake flow — conversational or structured form, captures all CMS data needed
2. Build "structurer" — AI that turns unstructured interview data into structured CMS item payloads
3. Build site provisioning flow — clone template, populate CMS via REST API, upload assets
4. Test CSS custom property injection for color/font customization (custom code `<head>` via REST API)
5. Build review/feedback loop — client sees staging, sends natural language feedback, AI processes into edits
6. Build multi-channel input processing — chat, screenshot+annotation, email (start with one, expand)
7. Integration: management app onboarding UI → AI structurer → site provisioning → staging preview → launch

---

## Success Criteria

### Template & CMS
1. **All gym-specific content** (business info, programs, FAQs, hero text, team, testimonials, images) is in CMS and editable via REST API
2. **All content gym owners actually ask to change** can be handled by the agent without hitting "BLOCKED"
3. **Proper CMS design** — no numbered-slot anti-patterns, one item per entity, proper collections
4. **Single source of truth** — no duplicated data (e.g., hours in one place, not three)
5. **Template is clonable** — can be duplicated and populated for any new gym
6. **~12 collections** — lean schema, easy for the agent to navigate, room to grow

### Autonomous Pipeline
7. **Agent pipeline works end-to-end** — Linear ticket → CMS edit → Playwright tests pass → report posted
8. **Works identically across all templates** — standardized CMS schema means one agent handles all sites
9. **Accepts unstructured input** — natural language, screenshots, voice → structured change requests

### Client Onboarding
10. **Interview → live site** — unstructured client data (call transcript, chat, form) → AI structures into CMS content → site provisioned automatically
11. **Template customization without Designer** — colors, fonts, content, section visibility, images all customizable via CMS + CSS variables (no human Designer session needed for most gyms)
12. **Each site feels unique** — two gyms on the same template look 80%+ different through content + colors + imagery + section visibility

### Management App
13. **Agency-wide OAuth** — single token manages all gym sites in the workspace
14. **Internal admin** — PushPress team can view/edit CMS, publish, trigger pipeline, view audit logs for any site
15. **Client blog editor** — gym owners can write, edit, and publish blog posts without seeing Webflow
16. **Mobile-friendly** — blog editor works on a phone between classes
17. **Responsive templates** — look correct on desktop, tablet, mobile

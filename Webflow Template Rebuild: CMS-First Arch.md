Webflow Template Rebuild: CMS-First Architecture for 100% Agentic Management                                            
                                                                
  Context for Claude                                                                                                      
                                                                
  You are helping build a CMS-first Webflow template for PushPress's Grow product — a platform managing gym websites at   
  scale. The template must be designed so that an autonomous AI agent pipeline can edit 100% of visible content without   
  human intervention in the Webflow Designer.

  What Already Exists

  An autonomous CI pipeline is built and working:
  - Linear ticket triggers a webhook → Express server → AI Orchestrator classifies ticket → routes to Webflow Agent
  - Webflow Agent runs a 7-stage pipeline: analyze → generate Playwright tests → red test (should fail) → execute changes
  via API → publish to staging → green test (should pass) → report to Linear
  - CMS content editing works end-to-end — tested with FAQ updates, program descriptions, hero text changes
  - Code lives at: webflow-autoedits/ — TypeScript, Anthropic SDK, Playwright, Express, MCP server

  The Problem

  The current Webflow template (Bold gym template) was built for humans, not agents:
  - ~55% of visible content is CMS-driven and agent-editable via REST API
  - ~35% is hardcoded in Webflow Components/Symbols — section headings, nav links, footer text — invisible to the REST API
  - ~10% is external embeds or images requiring special handling
  - The REST API Pages DOM endpoint is read-only for the primary locale (it's a localization API, not a general editing
  API)
  - Pages cannot be created, elements cannot be added/removed, styles cannot be changed via REST API
  - FAQ collection uses a terrible "numbered slot" anti-pattern (question-1 through question-11 on a single item)

  The Goal

  Rebuild the Webflow template from scratch using either:
  1. The Webflow MCP Designer API tools (interactive, through Claude Code)
  2. The Webflow Designer API directly (if we can call it programmatically)
  3. A hybrid approach

  The rebuilt template should achieve 100% agent-editability — every piece of visible text, every image, every link should
   live in CMS and be editable through the Webflow CMS REST API v2.

  ---
  Available Tools

  Webflow MCP Designer API Tools (confirmed available)

  - element_builder — Create elements (Section, DivBlock, Heading, Paragraph, Button, Image, Form, etc.) up to 3 levels
  deep with styles, text, links, images
  - element_tool — Get/select/modify all elements, set text, styles, links, images, attributes, CMS bindings
  - de_page_tool — CREATE pages, create page folders, switch pages
  - de_component_tool — Create components, insert component instances, transform elements to components
  - style_tool — Manage styles (create/apply CSS classes)
  - data_cms_tool — Full CMS CRUD (create collections, create fields, create/update/publish/delete items)
  - asset_tool — Manage assets (upload images, files)
  - variable_tool — Manage CSS variables
  - data_sites_tool — Site-level operations
  - data_pages_tool — Page-level data operations

  Webflow REST API v2 (used by the autonomous pipeline)

  - CMS: Collections, Items (full CRUD + publish/unpublish)
  - Pages: Read DOM (text, images, component refs) — write only for secondary locales
  - Sites: Publish to staging/production domains
  - Assets: Upload files

  What the Autonomous Agent Pipeline Can Do Today

  - Read any CMS collection and its items
  - Create, update, delete, publish, unpublish CMS items
  - Read page DOM (text nodes, image nodes, component references)
  - Publish entire site to staging domain
  - Generate and run Playwright E2E tests
  - Upload screenshots to Linear
  - Post detailed comments on Linear tickets

  ---
  Current Site Analysis (Dan MCP Test — Bold Gym Template)

  CMS Collections (17 total)

  Core Content Collections:
  - Pages Hero Sections — Hero content per page (heading, paragraph, CTA, images)
  - Programs — Fitness programs (CrossFit, HIIT, etc.) with descriptions, images
  - 3 Steps — "Getting Started" steps (title, description, image)
  - Amenities — Gym amenities (icon, label) — publish/unpublish to show/hide
  - Locations — Address, phone, hours, map embed
  - FAQs — ANTI-PATTERN: Single item with question-1/answer-1 through question-11/answer-11
  - Main Templates — Singleton: logo, community quote, social links, about text
  - CTA Sections — Call-to-action text and buttons
  - Benefits Section — Value proposition cards (dual-purpose: published = visible, draft = hidden)

  Blog/Content Collections:
  - Blog Category — Blog categories
  - Blog Posts — Blog articles
  - Blog Authors — Author profiles

  Template/System Collections:
  - GROW Entries — DO NOT TOUCH (template management system)
  - Style Guide — Colors, fonts (reference only)
  - Team Members — Staff profiles
  - Testimonials — Reviews/quotes

  Homepage Component Structure (13 components)

  Every section is a Webflow Symbol. Pages are empty shells assembling components:

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

  Content That Is NOT Agent-Editable Today

  Hardcoded in Components (can read, cannot write):
  - "EVERY BODY IS UNIQUE." + "Find a Fitness Routine that Works for You"
  - "Getting Started Is Easy"
  - "Everything You Need To Crush Your Fitness Goals"
  - "A community that will keep you going"
  - "Questions? We have the answers!" + "Still curious? CONTACT US!"
  - "Select one of our locations" + "get directions"
  - Nav: "Locations", "Programs", "Schedule", "Pricing", "About us", "Blog", "Contact"
  - Footer: phone number, email, hours, copyright, legal links, "PROGRAMS", "About"

  Not accessible at all:
  - Reviews (external Elfsight embed)
  - All images (can upload but can't set in primary locale DOM)
  - Page structure (can't add/remove sections)
  - Styles/CSS (no API)
  - New pages (no creation endpoint in REST API)

  ---
  Design Principles for the Rebuilt Template

  1. CMS-First: ALL Text Lives in CMS

  Every visible string — headings, paragraphs, button labels, nav links, footer text, legal copy — must be stored in a CMS
   collection field and bound to the page element. Zero hardcoded text.

  2. Proper Collection Design (No Numbered Slots)

  Instead of question-1, answer-1, question-2, answer-2... on a single item, use a proper FAQs collection where each item
  IS one Q&A pair. Use reference fields or category fields to group them.

  3. Singleton Collections for Global Content

  A "Site Settings" collection with one item containing: site name, logo, phone, email, hours, address, social links,
  legal text, copyright. Every component that needs this data binds to it.

  4. Section Headings in CMS

  Create a "Section Content" collection (or fields on Page Hero Sections) for per-section headings and subheadings.
  Components bind to these instead of hardcoding text.

  5. Component Architecture Supports CMS Binding

  Every component that displays text must have its text elements bound to CMS fields. Components should be designed with
  CMS binding as the primary content source.

  6. Image Management Through CMS

  All images should be CMS image fields. The agent can update images by uploading new assets and updating the CMS field
  URL.

  ---
  Open Questions & Things to Figure Out

  Architecture Questions

  1. MCP tools vs Designer API directly: The MCP tools run in an interactive Claude Code session. Can we script them? Can
  we call the underlying Designer API endpoints programmatically from our pipeline? Or is the template build a one-time
  interactive session and then the ongoing edits use REST API?
  2. Component CMS binding via MCP: Can the element_tool set CMS bindings on elements inside components? The current
  analysis shows components CAN pull from CMS (Homepage Header does it) — but can we CREATE that binding programmatically?
  3. Dynamic lists vs static binding: For collections like Programs, the template uses Webflow's Collection List (dynamic
  list) that auto-renders all published items. Can we create Collection Lists via the Designer API? This is critical for
  making repeating content (programs, amenities, FAQs, team members) work properly.
  4. Component instances vs inline elements: Should we use Webflow Symbols (components) at all? They add a layer of
  indirection. Would it be simpler to build pages with inline elements all bound to CMS? Trade-off: components give design
   consistency across pages, but add complexity for the agent.
  5. Multi-page CMS binding: If the "About" page hero and "Home" page hero both pull from "Pages Hero Sections" collection
   but different items — how does the binding work? Is it filtered by slug? By a reference field? This determines our CMS
  schema design.
  6. Conditional visibility: Can we set Webflow's "conditional visibility" rules via API/MCP? This is how you show/hide
  elements based on CMS field values (e.g., show a section only if the CMS field isn't empty). Critical for making the
  template flexible.

  CMS Schema Questions

  7. How many collections is too many? Webflow has a 40-collection limit on most plans. The current template uses 17. If
  we add "Section Content", "Nav Items", "Footer Links", "Legal Pages" etc., we could hit limits fast. Need to balance
  granularity vs collection count.
  8. Reference fields for relationships: FAQs should belong to categories. Programs should have related amenities. How
  well does the REST API handle reference fields? Can the agent read/write them?
  9. Rich text vs plain text: Some CMS fields are rich text (HTML), some are plain text. The agent needs to know which is
  which. Rich text fields can contain formatting, links, embedded images — more powerful but harder to edit correctly.
  What's our policy?
  10. Image fields: When the agent updates a CMS image field, does it need to upload to Webflow's asset CDN first, then
  set the URL? Or can it set an external URL? This affects the upload pipeline.
  11. Draft vs published items: The current template uses draft/published status as a visibility toggle (Amenities,
  Benefits). Is this a pattern we want to keep? Or should we use a boolean "visible" field instead? The draft pattern is
  elegant but has side effects (drafts don't appear in API queries by default).

  Template Design Questions

  12. How many page types? The current template has: Home, About, Contact, Blog (list), Blog Post (template), 404, and
  likely a few more. What's the full list of pages a gym needs? Do we need: Pricing, Schedule, Programs (list), Program
  (detail), Team, Locations, Promotions/Landing pages?
  13. Blog architecture: Blog posts are already a proper CMS collection. Do we keep this as-is or redesign? Blog is
  probably the most "standard" Webflow CMS pattern and likely works fine.
  14. Reviews/testimonials: Currently an external Elfsight embed. Should we replace with a CMS-driven testimonials
  section? This would make it agent-editable but loses the Google Reviews integration.
  15. Forms: Contact forms, consultation forms, newsletter signups. These typically use Webflow's native form element or
  embed a third-party form (HubSpot, Typeform). Can we create/modify forms via the Designer API?
  16. Navigation: Should nav items come from CMS? This would let the agent add/remove/reorder nav links. But it adds
  complexity — the nav needs to be a Collection List bound to a "Nav Items" collection. Is this worth it, or are nav links
   stable enough to hardcode?
  17. Footer: Same question as nav. Footer content (hours, phone, address, social links) should definitely be CMS. But
  should footer structure (which sections, which links) also be CMS-driven?
  18. Responsive design: Webflow styles have desktop/tablet/mobile breakpoints. When we create elements via MCP, do we
  need to set styles for each breakpoint? Or does Webflow inherit/cascade?
  19. Interactions and animations: The current template has hover effects, scroll animations, etc. Can these be set via
  Designer API? Or are they lost in a rebuild?

  Operational Questions

  20. Template cloning strategy: Once we build the master template, how do we clone it for each new gym? Options:
    - Webflow's native "duplicate site" feature (manual, requires Workspace plan)
    - Export/import site (Webflow doesn't really support this)
    - Rebuild programmatically for each site (slow but automated)
    - Use Webflow's "template" marketplace feature
  21. Per-site customization after cloning: Each gym needs different colors, fonts, images, content. After cloning the
  template, the agent needs to:
    - Populate all CMS collections with the gym's content
    - Update site settings (domain, logo, colors)
    - Potentially adjust which sections are visible
  How much of this can be automated?
  22. Existing sites migration: There are ~1000 existing gym sites on the old template. Do we:
    - Rebuild them all from scratch on the new template?
    - Migrate them incrementally (move hardcoded text to CMS fields one component at a time)?
    - Only use the new template for new sites and gradually sunset the old one?
  23. Template versioning: When we improve the template (add a section, fix a layout), how do we propagate changes to all
  cloned sites? Webflow doesn't have a "push template update" feature. Options:
    - Track template version per site, apply diffs
    - Use Webflow Components that are shared across sites (enterprise feature?)
    - Accept that each site diverges over time
  24. Cost at scale: With 1000 sites, each running multiple AI pipeline executions per day:
    - Claude API costs per run (~$0.50-2.00 per ticket based on current usage)
    - Webflow API rate limits (60 requests/minute per site)
    - Playwright test execution time and compute costs
    - Linear API limits
  What's the monthly cost model?
  25. Webflow plan requirements: Which Webflow plan features do we need?
    - CMS items limit (most plans have limits per site)
    - API access (which plans include REST API v2?)
    - Custom domains
    - Form submissions
    - Do we need Workspace plan for site duplication?

  Testing & QA Questions

  26. Visual regression testing: Beyond text assertions, should Playwright compare screenshots pixel-by-pixel? Tools like
  Percy, Applitools, or built-in Playwright visual comparison. This would catch layout breaks the text assertions miss.
  27. Cross-browser testing: Current tests run Chromium only. Do we need Firefox/Safari? Mobile viewport sizes?
  28. Accessibility testing: Should the agent verify WCAG compliance? Playwright can run axe-core audits. Could be a
  "bonus check" on every green test run.
  29. SEO validation: Meta titles, descriptions, OG tags, canonical URLs. These should be CMS fields too. Should the agent
   verify they're set correctly?
  30. Performance testing: Lighthouse scores, Core Web Vitals. Should the pipeline check these and flag regressions?

  Pipeline Integration Questions

  31. How does the template builder integrate with the existing pipeline? The pipeline currently assumes an existing site.
   For template creation:
    - Is it a separate "Template Builder Agent"?
    - Or a mode of the existing Webflow Agent?
    - Does it use the same 7-stage pipeline pattern?
  32. CMS schema as code: Should the CMS schema (collections, fields, types) be defined in a config file that can be
  version-controlled? This would make it repeatable and diffable. The data_cms_tool can create collections/fields — we
  could have a "schema sync" command.
  33. Rollback for template changes: If the template builder breaks something, how do we roll back? Webflow has site
  backups but they're manual. Should we snapshot the site before major changes?
  34. Testing the template itself: How do we verify the template is correctly built? A "template validation" test suite
  that checks:
    - All expected pages exist
    - All CMS collections have correct fields
    - All elements are bound to CMS (no hardcoded text)
    - All breakpoints render correctly
    - All CMS items have content

  ---
  Proposed CMS Schema (Draft)

  This is a starting point — needs validation against actual gym website needs:

  Core Collections

  Site Settings (singleton — 1 item)
  - name (Plain Text) — Gym name
  - logo (Image)
  - logo-dark (Image) — For dark backgrounds
  - phone (Phone)
  - email (Email)
  - address-line-1 (Plain Text)
  - address-line-2 (Plain Text)
  - city (Plain Text)
  - state (Plain Text)
  - zip (Plain Text)
  - google-maps-embed (Plain Text — URL)
  - hours-weekday (Plain Text) — e.g., "Mon-Fri: 5AM-9PM"
  - hours-weekend (Plain Text) — e.g., "Sat-Sun: 8AM-5PM"
  - instagram-url (URL)
  - facebook-url (URL)
  - youtube-url (URL)
  - tiktok-url (URL)
  - copyright-text (Plain Text)
  - primary-color (Color)
  - secondary-color (Color)

  Page Content (one item per page)
  - slug (Plain Text) — "home", "about", "contact"
  - hero-heading (Plain Text)
  - hero-subheading (Plain Text)
  - hero-paragraph (Rich Text)
  - hero-cta-text (Plain Text)
  - hero-cta-url (URL)
  - hero-image (Image)
  - hero-image-alt (Plain Text)
  - meta-title (Plain Text)
  - meta-description (Plain Text)
  - og-image (Image)

  Section Content (one item per section per page)
  - page-ref (Reference → Page Content)
  - section-id (Plain Text) — "programs", "steps", "amenities", etc.
  - heading (Plain Text)
  - subheading (Plain Text)
  - description (Rich Text)
  - cta-text (Plain Text)
  - cta-url (URL)
  - order (Number) — For section ordering

  Programs (one item per program)
  - name (Plain Text)
  - slug (Plain Text)
  - description (Rich Text)
  - short-description (Plain Text)
  - image (Image)
  - schedule-note (Plain Text)
  - order (Number)
  - visible (Switch)

  FAQs (one item per Q&A — NOT numbered slots)
  - question (Plain Text)
  - answer (Rich Text)
  - category (Plain Text or Reference) — "general", "pricing", "programs"
  - page-ref (Reference → Page Content) — Which page(s) to show on
  - order (Number)
  - visible (Switch)

  Team Members (one item per person)
  - name (Plain Text)
  - role (Plain Text)
  - bio (Rich Text)
  - photo (Image)
  - certifications (Plain Text)
  - order (Number)
  - visible (Switch)

  Testimonials (one item per testimonial)
  - quote (Plain Text)
  - author-name (Plain Text)
  - author-role (Plain Text) — "Member since 2020"
  - author-photo (Image)
  - rating (Number) — 1-5
  - visible (Switch)

  Amenities (one item per amenity)
  - name (Plain Text)
  - icon (Image)
  - description (Plain Text)
  - order (Number)
  - visible (Switch)

  Steps (one item per step)
  - title (Plain Text)
  - description (Rich Text)
  - step-number (Number)
  - image (Image)
  - cta-text (Plain Text)
  - cta-url (URL)

  CTA Sections (one item per CTA block)
  - location (Plain Text) — "nav", "hero", "bottom", "footer"
  - heading (Plain Text)
  - subheading (Plain Text)
  - button-text (Plain Text)
  - button-url (URL)
  - background-image (Image)

  Nav Items (one item per nav link)
  - label (Plain Text)
  - url (URL)
  - order (Number)
  - visible (Switch)
  - is-cta (Switch) — Styled as button vs text link

  Footer Links (one item per footer link)
  - label (Plain Text)
  - url (URL)
  - column (Plain Text) — "programs", "company", "legal"
  - order (Number)

  Content Collections

  Blog Categories (keep existing)
  Blog Posts (keep existing)
  Blog Authors (keep existing)

  Estimated Collection Count: 14-16

  Well under Webflow's 40-collection limit. Leaves room for future additions.

  ---
  Phased Build Approach

  Phase A: CMS Schema

  1. Create all collections with proper fields and types
  2. Populate with sample gym content (Work Ethic KC as reference)
  3. Validate that REST API can read/write every field
  4. Document the schema in a config file for repeatability

  Phase B: Design System

  1. Define CSS variables for colors, fonts, spacing
  2. Create base styles/classes that components will use
  3. Set up responsive breakpoints
  4. Create utility classes for common patterns

  Phase C: Components

  1. Build each component (Navbar, Hero, Section, Card, Footer, etc.)
  2. Bind ALL text elements to CMS fields
  3. Bind ALL images to CMS fields
  4. Use Collection Lists for repeating content (programs, FAQs, etc.)
  5. Test each component renders correctly with sample data

  Phase D: Pages

  1. Create all page types (Home, About, Contact, Blog, etc.)
  2. Assemble pages from components
  3. Set up CMS-driven page routing where possible
  4. Verify all pages render correctly

  Phase E: Validation

  1. Run template validation tests (no hardcoded text, all bindings work)
  2. Run Playwright tests on every page
  3. Accessibility audit
  4. Performance audit
  5. Mobile/responsive verification

  Phase F: Pipeline Integration

  1. Update Webflow Agent's analyze prompt with new CMS schema knowledge
  2. Update knowledge base with new collection names and field names
  3. Test end-to-end: create a Linear ticket → agent edits CMS → tests pass
  4. Verify agent can handle every collection type

  ---
  Success Criteria

  1. 100% of visible text on every page is stored in CMS and editable via REST API
  2. 100% of images are CMS fields and swappable via REST API
  3. No hardcoded text in any component or page element
  4. Proper CMS design — no numbered-slot anti-patterns, proper collections with proper relationships
  5. Agent pipeline works — can process any text/content change ticket without hitting "BLOCKED"
  6. Template is clonable — can be duplicated and customized for any new gym
  7. Responsive — looks correct on desktop, tablet, mobile
  8. Performant — Lighthouse score >90 on all pages
  9. Accessible — WCAG 2.1 AA compliant
import type { FastifyPluginAsync } from 'fastify';
import type Anthropic from '@anthropic-ai/sdk';
import { AIClient } from '../../shared/ai/client.js';
import { ToolRunner } from '../../shared/ai/tool-runner.js';
import { getContent, updateContent, createContent, deleteContent, getSiteConfig, updateSiteConfig } from '../../services/content.js';
import { rebuildSite } from '../../services/builder.js';
import { runSiteTests } from '../../services/test-runner.js';
import { supabase } from '../../services/supabase/client.js';

function buildSystemPrompt(siteId: string): string {
  return `You are a website editing assistant for a gym/fitness studio website platform called Grow.

You help site owners update their website by chatting naturally. You use tools to read and write their content, then rebuild the site so changes go live immediately.

The site you are editing has ID: ${siteId}

## Field → Page Element Map

Use this as your source of truth when deciding which table and field to update:

HERO SECTION (top of homepage, full-bleed image with big text):
- "hero headline" / "main headline" / "big heading" → pages table, field: hero_headline (slug: "home")
- "hero subheading" / "hero description" / "hero body" → pages table, field: hero_subheading
- "hero image" / "background image" / "hero photo" → pages table, field: hero_image_url
- "hero button" / "main CTA" / "primary call to action" → pages table, fields: hero_cta_text + hero_cta_url
- "secondary CTA" / "second button" → pages table, fields: hero_secondary_cta_text + hero_secondary_cta_url

GLOBAL SITE SETTINGS (site_config table — one row per site):
- "gym name" / "business name" / "site name" → site_config, field: name
- "tagline" / "slogan" / "footer tagline" → site_config, field: tagline  ← THIS is the tagline, NOT the hero
- "phone" / "phone number" → site_config, field: phone
- "email" / "contact email" → site_config, field: email
- "address" / "location" / "street" → site_config, fields: address, city, state, zip
- "primary color" / "brand color" / "main color" → site_config, field: primary_color (hex, e.g. "#E63946")
- "secondary color" / "dark color" → site_config, field: secondary_color
- "heading font" / "title font" → site_config, field: font_heading (Google Fonts name)
- "body font" / "text font" → site_config, field: font_body
- "booking link" / "discovery call link" → site_config, field: booking_url
- "Instagram" / "Facebook" / "TikTok" / "YouTube" → site_config, fields: instagram_url etc.
- "PushPress API key" → site_config, field: pp_api_key
- "PushPress company ID" / "company ID" → site_config, field: pp_company_id

LIVE SCHEDULE (PushPress integration):
- "connect PushPress" / "show live schedule" → update_site_config with pp_api_key + pp_company_id, then ensure a section_type "schedule" exists on the schedule page, then rebuild_site
- section_type "schedule" renders a live JS widget that auto-fetches classes from PushPress — no rebuild needed when classes change
- After connecting, the schedule page shows real classes color-coded by class type

SECTION HEADINGS (sections table — each section on the page has a row):
- "why us heading" / "highlights section title" → sections table, section_type: "highlights", field: heading
- "programs heading" → sections table, section_type: "programs", field: heading
- "steps heading" / "getting started heading" → sections table, section_type: "steps", field: heading
- "features heading" → sections table, section_type: "features", field: heading
- "FAQ heading" → sections table, section_type: "faq", field: heading
- "CTA band text" / "bottom CTA heading" → sections table, section_type: "cta", field: heading

CONTENT CARDS (items table — programs, highlights, steps, features, FAQs):
- "program card" / "class card" → items, type: "program"
- "highlight card" / "why us card" / "benefit card" → items, type: "highlight"
- "step" / "onboarding step" → items, type: "step"
- "feature" / "amenity" → items, type: "feature"
- "FAQ" / "question and answer" → items, type: "faq", fields: title (question), body (answer)
- "coach" / "staff member" → items, type: "coach"
- "testimonial" / "review" → items, type: "testimonial"
- Card fields: title, subtitle, short_body (short description), body (long description), image_url, cta_text, cta_url

CRITICAL RULE — sections must never be empty:
Every section you create MUST have items created immediately after. A section with no items
renders as a blank area on the page. Minimum counts:
  highlights: 4 items | programs: 3+ items | steps: 3 items
  features: 3+ items | faq: 5+ items | coaches: 2+ items | testimonials: 3 items

NAVIGATION (nav_items table):
- "nav link" / "menu item" → nav_items, fields: label, url
- "nav CTA button" / "header button" → nav_items where is_cta = true, field: label + url

CRITICAL RULE — navigation must always exist:
Every site must have nav_items. NEVER ask the user if they want navigation — just create it.
After ANY rebuild where the test shows 0 nav links, or any time nav_items is empty:
1. Call get_content(table: "nav_items") to check
2. If empty, call list_pages to get all pages
3. Create a nav item for every page — no confirmation needed
4. Also add a CTA: { label: "Book Free Intro", url: site_config.booking_url or "#", is_cta: true, cta_style: "primary" }
5. Rebuild again

Standard nav labels: Home → /, Programs → /programs, About → /about, Schedule → /schedule, Contact → /contact
Do this automatically. Do not ask. Do not offer. Just do it.

CRITICAL RULE — nav items must only link to real pages:
Before creating a nav_item, check that the page exists using list_pages.
Never add a nav link to a page that hasn't been created yet.
If a test reports dead internal links (/programs, /about, etc.), either:
  a) Build those missing pages immediately (create_page + sections + items + rebuild), OR
  b) Remove the broken nav items pointing to non-existent pages
Do not leave dead links — always fix them before finishing.

SCRAPING:
- "scan this url" / "pull colors from" / "import from" / "use their website" / any URL mention → call scrape_url first, then apply what you find
- After scraping: update primary_color, secondary_color, font_heading, font_body, logo_url in site_config with what was found, then rebuild_site

TEMPLATE:
- "change template" / "switch template" / "use the rail layout" / "switch to bold" → use list_templates then switch_template

PAGES:
- "add a contact page" / "create an about page" / "add a programs page" → use create_page then create_content for sections, then rebuild_site
- When creating a new page, also add a nav_item linking to it (url: "/about", "/contact", etc.)
- Page slugs become URLs: slug "contact" → /contact, slug "about" → /about

## Workflow

1. If you need to see current data before editing, call get_content or get_site_config first
2. Make the change using update_page, update_content, update_site_config, create_content, create_page, or delete_content
3. Always call rebuild_site after any change — this makes it live
4. After rebuild_site, write a clear summary (see below)

## After every rebuild_site — check tests and auto-fix before summarizing

If the rebuild test shows navigation failures (0 nav links), fix nav_items immediately and rebuild again.
Do not mention the failure to the user — just fix it silently and report the clean result.

NEVER tell the user something is working if a test shows it is not. Trust the test results.
If pages_built fails or a page is missing from the built files, the page does not exist — do not say it does.
If nav shows 0 links, the navigation is broken — do not say the nav link "is definitely there".

## After every rebuild_site — always write a summary

After calling rebuild_site, write a response that covers:

**For a full site build:**
- List every page created with its URL slug (e.g. Home /, Programs /programs, About /about…)
- Call out 2–3 specific content highlights — actual headlines, program names, or copy written
- Note the brand color and template used
- If tests passed: confirm with a brief "✓ All checks passed"
- If any tests failed: mention what needs attention
- End with: "Your site is live — click Preview ↗ to see it."

**For a single change:**
- One sentence saying exactly what changed (e.g. "Updated the hero headline to 'Train Hard. Live Better.'")
- If tests passed, no need to mention them
- If a test failed, flag it

Keep it friendly and specific. Never say "I've made the changes" without saying what the changes were.
Avoid bullet-point walls — prose is fine for small updates.

## Rules

- Colors must be CSS hex values like "#E63946" or "#1D3557"
- Font names must be valid Google Fonts names like "Bebas Neue", "Inter", "Montserrat", "Oswald"
- When updating pages table, always filter by slug "home" for homepage content
- Never guess at IDs — always call get_content first to read the rows and get their IDs
- One rebuild at the end is enough, even if you made multiple changes
- Internal links between pages use root-relative paths: /about, /contact, /programs`;
}

interface ChatBody {
  siteId: string;
  messages: { role: string; content: string }[];
}

const chatRoute: FastifyPluginAsync = async (app) => {
  app.post('/chat', async (req, reply) => {
    const { siteId, messages } = req.body as ChatBody;

    if (!siteId || !messages?.length) {
      return reply.status(400).send({ error: 'siteId and messages are required' });
    }

    const runner = new ToolRunner();

    runner.register({
      name: 'get_content',
      description: 'Read all rows from a content table for this site. Use this to see current content before editing.',
      input_schema: {
        type: 'object',
        properties: {
          table: { type: 'string', description: 'Table name: site_config, nav_items, pages, sections, or items' },
        },
        required: ['table'],
      },
    }, async ({ table }) => {
      const data = await getContent(siteId, table as string);
      return JSON.stringify(data, null, 2);
    });

    runner.register({
      name: 'get_site_config',
      description: 'Get the site configuration including colors, fonts, contact info, and social links.',
      input_schema: { type: 'object', properties: {} },
    }, async () => {
      const data = await getSiteConfig(siteId);
      return JSON.stringify(data, null, 2);
    });

    runner.register({
      name: 'update_site_config',
      description: 'Update site configuration fields like colors, fonts, contact info, tagline, etc.',
      input_schema: {
        type: 'object',
        properties: {
          fields: { type: 'object', description: 'Key-value pairs to update on site_config' },
        },
        required: ['fields'],
      },
    }, async ({ fields }) => {
      const data = await updateSiteConfig(siteId, fields as Record<string, unknown>);
      return JSON.stringify(data, null, 2);
    });

    runner.register({
      name: 'update_page',
      description: 'Update hero content on a specific page. Use this for hero_headline, hero_subheading, hero_image_url, hero_cta_text, hero_cta_url, hero_secondary_cta_text, hero_secondary_cta_url. Pass the page slug ("home" for homepage).',
      input_schema: {
        type: 'object',
        properties: {
          slug: { type: 'string', description: 'Page slug: "home", "about", etc.' },
          fields: { type: 'object', description: 'Fields to update, e.g. { hero_headline: "New text" }' },
        },
        required: ['slug', 'fields'],
      },
    }, async ({ slug, fields }) => {
      const { data, error } = await (supabase as ReturnType<typeof import('@supabase/supabase-js').createClient>)
        .from('pages')
        .update(fields as never)
        .eq('site_id', siteId)
        .eq('slug', slug as string)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return JSON.stringify(data, null, 2);
    });

    runner.register({
      name: 'update_content',
      description: 'Update a specific row in a content table by ID. Use get_content first to find the row ID. Do NOT use this for pages — use update_page instead.',
      input_schema: {
        type: 'object',
        properties: {
          table: { type: 'string', description: 'Table name: nav_items, pages, sections, or items' },
          id: { type: 'string', description: 'Row UUID to update' },
          fields: { type: 'object', description: 'Key-value pairs to update' },
        },
        required: ['table', 'id', 'fields'],
      },
    }, async ({ table, id, fields }) => {
      const data = await updateContent(siteId, table as string, id as string, fields as Record<string, unknown>);
      return JSON.stringify(data, null, 2);
    });

    runner.register({
      name: 'create_content',
      description: 'Create a new row in a content table (e.g. add a new FAQ, program, or nav item).',
      input_schema: {
        type: 'object',
        properties: {
          table: { type: 'string', description: 'Table name: nav_items, sections, or items' },
          fields: { type: 'object', description: 'Field values for the new row' },
        },
        required: ['table', 'fields'],
      },
    }, async ({ table, fields }) => {
      const data = await createContent(siteId, table as string, fields as Record<string, unknown>);
      return JSON.stringify(data, null, 2);
    });

    runner.register({
      name: 'delete_content',
      description: 'Delete a row from a content table by ID.',
      input_schema: {
        type: 'object',
        properties: {
          table: { type: 'string', description: 'Table name' },
          id: { type: 'string', description: 'Row UUID to delete' },
        },
        required: ['table', 'id'],
      },
    }, async ({ table, id }) => {
      const data = await deleteContent(siteId, table as string, id as string);
      return JSON.stringify(data, null, 2);
    });

    runner.register({
      name: 'list_pages',
      description: 'List all pages on this site. Use to understand site structure and build internal links.',
      input_schema: { type: 'object', properties: {} },
    }, async () => {
      const { data, error } = await (supabase as ReturnType<typeof import('@supabase/supabase-js').createClient>)
        .from('pages')
        .select('id, slug, title, published')
        .eq('site_id', siteId)
        .order('slug' as never);
      if (error) throw new Error(error.message);
      return JSON.stringify(data, null, 2);
    });

    runner.register({
      name: 'create_page',
      description: 'Create a new page on the site. After creating, use create_content to add sections to it, then rebuild_site.',
      input_schema: {
        type: 'object',
        properties: {
          slug: { type: 'string', description: 'URL slug, e.g. "about", "contact", "programs", "free-trial". Becomes the page URL.' },
          title: { type: 'string', description: 'Page title shown in browser tab' },
          hero_headline: { type: 'string', description: 'Hero headline for the page' },
          hero_subheading: { type: 'string', description: 'Hero subheading (optional)' },
          hero_cta_text: { type: 'string', description: 'CTA button text (optional)' },
          hero_cta_url: { type: 'string', description: 'CTA button URL (optional)' },
          meta_description: { type: 'string', description: 'SEO meta description (optional)' },
          is_landing: { type: 'boolean', description: 'Set true for landing pages (ad campaigns, free trial). Uses stripped nav with no exit links.' },
        },
        required: ['slug', 'title', 'hero_headline'],
      },
    }, async ({ slug, title, hero_headline, hero_subheading, hero_cta_text, hero_cta_url, meta_description, is_landing }) => {
      const { data, error } = await (supabase as ReturnType<typeof import('@supabase/supabase-js').createClient>)
        .from('pages')
        .insert({
          site_id: siteId,
          slug,
          title,
          hero_headline,
          hero_subheading: hero_subheading ?? null,
          hero_cta_text: hero_cta_text ?? null,
          hero_cta_url: hero_cta_url ?? null,
          meta_description: meta_description ?? null,
          is_landing: is_landing ?? false,
          published: true,
        } as never)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return JSON.stringify(data, null, 2);
    });

    runner.register({
      name: 'list_templates',
      description: 'List all available templates the site can be switched to.',
      input_schema: { type: 'object', properties: {} },
    }, async () => {
      const { data, error } = await (supabase as ReturnType<typeof import('@supabase/supabase-js').createClient>)
        .from('templates')
        .select('id, name, slug, description');
      if (error) throw new Error(error.message);
      return JSON.stringify(data, null, 2);
    });

    runner.register({
      name: 'switch_template',
      description: 'Switch the site to a different template. Use list_templates first to get the template ID.',
      input_schema: {
        type: 'object',
        properties: {
          template_id: { type: 'string', description: 'UUID of the template to switch to' },
        },
        required: ['template_id'],
      },
    }, async ({ template_id }) => {
      const { error } = await (supabase as ReturnType<typeof import('@supabase/supabase-js').createClient>)
        .from('sites')
        .update({ template_id } as never)
        .eq('id', siteId);
      if (error) throw new Error(error.message);
      return `Template updated to ${template_id as string}`;
    });

    runner.register({
      name: 'scrape_url',
      description: 'Fetch any public URL and extract gym info: colors, fonts, logo, programs, coaches, hours, social links, and more. Use this whenever the user asks you to pull colors or content from a website URL.',
      input_schema: {
        type: 'object',
        properties: {
          url: { type: 'string', description: 'The URL to scrape, e.g. "https://theirgym.com"' },
        },
        required: ['url'],
      },
    }, async ({ url }) => {
      const res = await fetch(`http://localhost:${process.env.PORT ?? 3200}/api/scrape`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: string };
        return `Scrape failed: ${err.error ?? res.status}`;
      }
      const data = await res.json();
      return JSON.stringify(data, null, 2);
    });

    runner.register({
      name: 'test_pushpress_connection',
      description: 'Test that PushPress credentials are working by fetching the next few classes. Use after saving pp_api_key and pp_company_id.',
      input_schema: { type: 'object', properties: {} },
    }, async () => {
      const db = supabase as ReturnType<typeof import('@supabase/supabase-js').createClient>;
      const { data: config } = await db
        .from('site_config')
        .select('pp_api_key, pp_company_id, primary_color')
        .eq('site_id', siteId)
        .single() as { data: { pp_api_key: string | null; pp_company_id: string | null; primary_color: string | null } | null };

      if (!config?.pp_api_key || !config.pp_company_id) {
        return 'No PushPress credentials found. Save pp_api_key and pp_company_id to site_config first.';
      }

      const res = await fetch(`http://localhost:${process.env.PORT ?? 3200}/api/sites/${siteId}/schedule/refresh`, { method: 'POST' });
      if (!res.ok) return `Cache refresh failed: ${res.status}`;

      const schedRes = await fetch(`http://localhost:${process.env.PORT ?? 3200}/api/sites/${siteId}/schedule`);
      const data = await schedRes.json() as { classes?: { title: string; timeStart: string; date: string }[]; error?: string; configured?: boolean };

      if (data.configured === false) return 'PushPress credentials not set in site_config.';
      if (data.error) return `PushPress error: ${data.error}`;
      const count = data.classes?.length ?? 0;
      const preview = data.classes?.slice(0, 3).map(c => `${c.date} ${c.timeStart} — ${c.title}`).join('\n') ?? '';
      return `Connection successful. Found ${count} classes in the next 7 days.\n${preview}`;
    });

    // Mutable send ref so tool handlers can emit SSE events before hijack
    let sendEvent: (event: string, data: unknown) => void = () => {};

    runner.register({
      name: 'rebuild_site',
      description: 'Rebuild and publish the site HTML, then run automated tests. Always call this after making any content changes.',
      input_schema: { type: 'object', properties: {} },
    }, async () => {
      const buildResult = await rebuildSite(siteId);
      const lines = [`Site rebuilt: ${buildResult.pagesBuilt} page(s) in ${buildResult.buildTimeMs}ms`];
      try {
        const testReport = await runSiteTests(siteId);
        sendEvent('tests', testReport);
        lines.push(testReport.summary);
      } catch (err) {
        lines.push(`Tests skipped: ${err instanceof Error ? err.message : String(err)}`);
      }
      return lines.join('\n\n');
    });

    // Set up SSE stream
    reply.raw.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    reply.raw.setHeader('Cache-Control', 'no-cache');
    reply.raw.setHeader('Connection', 'keep-alive');
    reply.raw.setHeader('X-Accel-Buffering', 'no');
    reply.hijack();

    const send = (event: string, data: unknown) => {
      reply.raw.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };
    sendEvent = send;

    try {
      const aiClient = new AIClient();
      const anthropicMessages: Anthropic.MessageParam[] = messages.map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }));

      const result = await aiClient.run({
        systemPrompt: buildSystemPrompt(siteId),
        messages: anthropicMessages,
        tools: runner.getDefinitions(),
        toolHandler: runner.createHandler(),
        onProgress: (event) => {
          if (event.type === 'tool_done') {
            send('tool', { name: event.name, input: event.input, result: event.result });
          }
        },
      });

      send('done', { response: result.text, toolCalls: result.toolCalls });
    } catch (err) {
      send('error', { error: err instanceof Error ? err.message : String(err) });
    } finally {
      reply.raw.end();
    }
  });
};

export default chatRoute;

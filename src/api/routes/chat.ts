import type { FastifyPluginAsync } from 'fastify';
import type Anthropic from '@anthropic-ai/sdk';
import { AIClient } from '../../shared/ai/client.js';
import { ToolRunner } from '../../shared/ai/tool-runner.js';
import { getContent, updateContent, createContent, deleteContent, getSiteConfig, updateSiteConfig } from '../../services/content.js';
import { rebuildSite } from '../../services/builder.js';
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
- Card fields: title, subtitle, short_body (short description), body (long description), image_url, cta_text, cta_url

NAVIGATION (nav_items table):
- "nav link" / "menu item" → nav_items, fields: label, url
- "nav CTA button" / "header button" → nav_items where is_cta = true, field: label + url

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
4. Confirm what changed in plain language

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
      name: 'rebuild_site',
      description: 'Rebuild and publish the site HTML. Always call this after making any content changes.',
      input_schema: { type: 'object', properties: {} },
    }, async () => {
      const result = await rebuildSite(siteId);
      return `Site rebuilt: ${result.pagesBuilt} page(s) in ${result.buildTimeMs}ms`;
    });

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
    });

    return { response: result.text, toolCalls: result.toolCalls };
  });
};

export default chatRoute;

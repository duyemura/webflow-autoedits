import path from 'node:path';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import type { FastifyPluginAsync } from 'fastify';
import { supabase } from '../../services/supabase/client.js';
import { rebuildSite } from '../../services/builder.js';

function toSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

interface CreateSiteBody {
  name: string;
  tagline?: string;
  city?: string;
  state?: string;
  phone?: string;
  email?: string;
  primary_color?: string;
  template_slug?: string;
  pp_api_key?: string;
  pp_company_id?: string;
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST_SITES = path.join(__dirname, '..', '..', '..', 'dist', 'sites');

const sitesRoute: FastifyPluginAsync = async (app) => {
  // Create a new site (onboarding flow)
  app.post('/sites', async (req, reply) => {
    const body = req.body as CreateSiteBody;
    const { name, tagline, city, state, phone, email, primary_color, template_slug, pp_api_key, pp_company_id } = body;

    if (!name?.trim()) return reply.status(400).send({ error: 'name is required' });

    const db = supabase as ReturnType<typeof import('@supabase/supabase-js').createClient>;

    // Resolve template
    const slug = template_slug ?? 'bold';
    const { data: template } = await db.from('templates').select('id').eq('slug', slug).single() as { data: { id: string } | null };
    if (!template) return reply.status(400).send({ error: `Template "${slug}" not found` });

    // Generate unique subdomain
    const base = toSlug(name);
    const suffix = Math.random().toString(36).slice(2, 6);
    const subdomain = `${base}-${suffix}`;

    // Create site
    const { data: site, error: siteErr } = await db.from('sites').insert({
      name,
      slug: subdomain,
      subdomain,
      template_id: template.id,
      published: true,
    } as never).select().single() as { data: { id: string } | null; error: unknown };

    if (siteErr || !site) {
      app.log.error(siteErr);
      return reply.status(500).send({ error: 'Failed to create site' });
    }

    const primary = primary_color ?? '#E63946';

    // Create site_config
    await db.from('site_config').insert({
      site_id: site.id,
      name,
      tagline: tagline ?? null,
      city: city ?? null,
      state: state ?? null,
      phone: phone ?? null,
      email: email ?? null,
      primary_color: primary,
      secondary_color: '#1a1a2e',
      accent_color: primary,
      bg_color: '#ffffff',
      text_color: '#333333',
      font_heading: 'Bebas Neue',
      font_body: 'Inter',
      pp_api_key: pp_api_key ?? null,
      pp_company_id: pp_company_id ?? null,
    } as never);

    // Create home page placeholder (AI will fill in content)
    await db.from('pages').insert({
      site_id: site.id,
      slug: 'home',
      title: name,
      hero_headline: `Welcome to ${name}`,
      hero_subheading: tagline ?? (city ? `${city}'s premier fitness community.` : 'Where strength is built.'),
      hero_cta_text: 'Book a Free Intro',
      hero_cta_url: '#',
      published: true,
    } as never);

    return reply.status(201).send({ siteId: site.id, subdomain });
  });

  // List all sites
  app.get('/sites', async (_req, reply) => {
    const { data, error } = await supabase
      .from('sites')
      .select('*, site_config(name, tagline, primary_color), templates(name, slug)')
      .order('created_at');
    if (error) return reply.status(500).send({ error: error.message });
    return data;
  });

  // Rebuild a site
  app.post('/sites/:siteId/rebuild', async (req, reply) => {
    const { siteId } = req.params as { siteId: string };
    try {
      const result = await rebuildSite(siteId);
      return result;
    } catch (err) {
      return reply.status(500).send({ error: (err as Error).message });
    }
  });

  // Preview a site (serves built HTML directly — no subdomain needed)
  app.get('/sites/:siteId/preview', async (req, reply) => {
    const { siteId } = req.params as { siteId: string };
    const filePath = path.join(DIST_SITES, siteId, 'index.html');
    try {
      const html = await fs.readFile(filePath, 'utf-8');
      return reply.type('text/html').send(html);
    } catch {
      // Not built yet — build it now
      try {
        await rebuildSite(siteId);
        const html = await fs.readFile(filePath, 'utf-8');
        return reply.type('text/html').send(html);
      } catch (err) {
        return reply.status(404).send({ error: (err as Error).message });
      }
    }
  });
};

export default sitesRoute;

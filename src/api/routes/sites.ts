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
  secondary_color?: string;
  font_heading?: string;
  font_body?: string;
  logo_url?: string;
  template_slug?: string;
  pp_api_key?: string;
  pp_company_id?: string;
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST_SITES = path.join(__dirname, '..', '..', '..', 'dist', 'sites');

const BUILDING_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Site Building...</title>
  <style>
    body { font-family: system-ui, sans-serif; display: flex; align-items: center; justify-content: center;
           min-height: 100vh; margin: 0; background: #f9fafb; color: #374151; }
    .card { text-align: center; padding: 3rem 2rem; }
    .spinner { width: 40px; height: 40px; border: 3px solid #e5e7eb; border-top-color: #3b82f6;
               border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto 1.5rem; }
    @keyframes spin { to { transform: rotate(360deg); } }
    h1 { font-size: 1.25rem; font-weight: 600; margin: 0 0 0.5rem; }
    p { color: #9ca3af; font-size: 0.875rem; margin: 0; }
  </style>
  <meta http-equiv="refresh" content="5">
</head>
<body>
  <div class="card">
    <div class="spinner"></div>
    <h1>Building your site...</h1>
    <p>This page will refresh automatically when it's ready.</p>
  </div>
</body>
</html>`;

const sitesRoute: FastifyPluginAsync = async (app) => {
  // Create a new site (onboarding flow)
  app.post('/sites', async (req, reply) => {
    const body = req.body as CreateSiteBody;
    const { name, tagline, city, state, phone, email, primary_color, secondary_color, font_heading, font_body, logo_url, template_slug, pp_api_key, pp_company_id } = body;

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

    // Create site_config — fail fast if this doesn't work
    const { error: configErr } = await db.from('site_config').insert({
      site_id: site.id,
      name,
      tagline: tagline ?? null,
      city: city ?? null,
      state: state ?? null,
      phone: phone ?? null,
      email: email ?? null,
      primary_color: primary,
      secondary_color: secondary_color ?? '#1a1a2e',
      accent_color: primary,
      bg_color: '#ffffff',
      text_color: '#333333',
      font_heading: font_heading ?? 'Bebas Neue',
      font_body: font_body ?? 'Inter',
      logo_url: logo_url ?? null,
      pp_api_key: pp_api_key ?? null,
      pp_company_id: pp_company_id ?? null,
    } as never);

    if (configErr) {
      app.log.error(configErr);
      // Clean up the site row so we don't leave orphans
      await db.from('sites').delete().eq('id', site.id);
      return reply.status(500).send({ error: 'Failed to create site config' });
    }

    // Create home page placeholder (AI will fill in content)
    const { error: pageErr } = await db.from('pages').insert({
      site_id: site.id,
      slug: 'home',
      title: name,
      hero_headline: `Welcome to ${name}`,
      hero_subheading: tagline ?? (city ? `${city}'s premier fitness community.` : 'Where strength is built.'),
      hero_cta_text: 'Book a Free Intro',
      hero_cta_url: '#',
      published: true,
    } as never);

    if (pageErr) {
      app.log.error(pageErr);
      await db.from('site_config').delete().eq('site_id', site.id);
      await db.from('sites').delete().eq('id', site.id);
      return reply.status(500).send({ error: 'Failed to create home page' });
    }

    // Seed a minimal nav so the site renders with at least a Home link
    await db.from('nav_items').insert([
      { site_id: site.id, label: 'Home', url: '/', order: 0, visible: true, is_cta: false },
    ] as never);

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

  // Delete a site and all its data
  app.delete('/sites/:siteId', async (req, reply) => {
    const { siteId } = req.params as { siteId: string };
    const db = supabase as ReturnType<typeof import('@supabase/supabase-js').createClient>;

    // Verify site exists first
    const { data: site } = await db.from('sites').select('id').eq('id', siteId).single() as { data: { id: string } | null };
    if (!site) return reply.status(404).send({ error: 'Site not found' });

    // Delete child records (cascade may handle some, but be explicit)
    await db.from('items').delete().eq('site_id', siteId);
    await db.from('sections').delete().eq('site_id', siteId);
    await db.from('nav_items').delete().eq('site_id', siteId);
    await db.from('pages').delete().eq('site_id', siteId);
    await db.from('site_config').delete().eq('site_id', siteId);
    await db.from('sites').delete().eq('id', siteId);

    // Remove built files
    const siteDir = path.join(DIST_SITES, siteId);
    await fs.rm(siteDir, { recursive: true, force: true }).catch(() => {});

    return reply.status(204).send();
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

  // Repair a site that has an incomplete data record (re-creates missing site_config/pages)
  app.post('/sites/:siteId/repair', async (req, reply) => {
    const { siteId } = req.params as { siteId: string };
    const db = supabase as ReturnType<typeof import('@supabase/supabase-js').createClient>;

    const { data: site } = await db.from('sites')
      .select('*, templates:template_id(slug)')
      .eq('id', siteId).single() as { data: { id: string; name: string; templates: { slug: string } | null } | null };

    if (!site) return reply.status(404).send({ error: 'Site not found' });

    const repairs: string[] = [];

    // Repair site_config if missing
    const { data: config } = await db.from('site_config').select('site_id').eq('site_id', siteId).maybeSingle();
    if (!config) {
      await db.from('site_config').insert({
        site_id: siteId,
        name: site.name,
        primary_color: '#E63946',
        secondary_color: '#1a1a2e',
        accent_color: '#E63946',
        bg_color: '#ffffff',
        text_color: '#333333',
        font_heading: 'Bebas Neue',
        font_body: 'Inter',
      } as never);
      repairs.push('created site_config');
    }

    // Repair home page if missing
    const { data: homePage } = await db.from('pages')
      .select('id').eq('site_id', siteId).eq('slug', 'home').maybeSingle();
    if (!homePage) {
      await db.from('pages').insert({
        site_id: siteId,
        slug: 'home',
        title: site.name,
        hero_headline: `Welcome to ${site.name}`,
        hero_subheading: 'Where strength is built.',
        hero_cta_text: 'Book a Free Intro',
        hero_cta_url: '#',
        published: true,
      } as never);
      repairs.push('created home page');
    }

    // Repair nav_items if completely empty
    const { count: navCount } = await db.from('nav_items')
      .select('id', { count: 'exact', head: true }).eq('site_id', siteId) as { count: number | null };
    if (!navCount) {
      // Seed with all published pages as nav items
      const { data: sitePages } = await db.from('pages')
        .select('slug, title').eq('site_id', siteId).eq('published', true) as { data: { slug: string; title: string | null }[] | null };
      const navRows = (sitePages ?? []).map((p, i) => ({
        site_id: siteId,
        label: p.title ?? p.slug.charAt(0).toUpperCase() + p.slug.slice(1),
        url: p.slug === 'home' ? '/' : `/${p.slug}`,
        order: i,
        visible: true,
        is_cta: false,
      }));
      if (navRows.length > 0) {
        await db.from('nav_items').insert(navRows as never);
        repairs.push(`created ${navRows.length} nav item(s)`);
      }
    }

    if (repairs.length === 0) {
      return reply.send({ message: 'Site data looks complete — no repairs needed' });
    }

    return reply.send({ message: `Repaired: ${repairs.join(', ')}. Run a site build in chat to populate content.` });
  });

  // Preview a site — serves any page, rewrites internal links to stay in preview context
  // Matches /sites/:siteId/preview and /sites/:siteId/preview/*
  const servePreview = async (req: import('fastify').FastifyRequest, reply: import('fastify').FastifyReply, siteId: string, pagePath: string) => {
    const noCache = () => {
      reply.header('Cache-Control', 'no-cache, no-store, must-revalidate');
      reply.header('Pragma', 'no-cache');
      reply.header('Expires', '0');
    };

    // Resolve file path: "home" or "" → index.html, "schedule" → schedule/index.html
    const slug = pagePath.replace(/^\//, '').replace(/\/$/, '') || 'home';
    const fileDir = slug === 'home'
      ? path.join(DIST_SITES, siteId)
      : path.join(DIST_SITES, siteId, ...slug.split('/'));
    const filePath = path.join(fileDir, 'index.html');

    const rewriteLinks = (html: string) =>
      // Rewrite root-relative internal links so they stay in the preview context
      html.replace(/href="(\/(?!api\/)[^"]*?)"/g, (_, href) => {
        const slug2 = href === '/' ? '' : href.replace(/^\//, '');
        return `href="/api/sites/${siteId}/preview${slug2 ? '/' + slug2 : ''}"`;
      });

    const tryServe = async () => {
      const html = await fs.readFile(filePath, 'utf-8');
      noCache();
      return reply.type('text/html').send(rewriteLinks(html));
    };

    try {
      return await tryServe();
    } catch {
      // Not built yet — try building
    }

    try {
      await rebuildSite(siteId);
      return await tryServe();
    } catch (err) {
      app.log.error({ siteId, err }, 'Preview build failed');
      noCache();
      return reply.type('text/html').send(BUILDING_HTML);
    }
  };

  app.get('/sites/:siteId/preview', async (req, reply) => {
    const { siteId } = req.params as { siteId: string };
    return servePreview(req, reply, siteId, '');
  });

  app.get('/sites/:siteId/preview/*', async (req, reply) => {
    const { siteId, '*': pagePath } = req.params as { siteId: string; '*': string };
    return servePreview(req, reply, siteId, pagePath);
  });
};

export default sitesRoute;

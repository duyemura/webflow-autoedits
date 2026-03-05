import Handlebars from 'handlebars';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { supabase } from './supabase/client.js';
import type { SiteConfig, NavItem, Page, Section, Item } from './supabase/types.js';
import { logger } from '../shared/logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATES_DIR = path.join(__dirname, '..', 'templates');
const DIST_DIR = path.join(__dirname, '..', '..', 'dist', 'sites');

// ── Handlebars helpers ──────────────────────────────────────────
Handlebars.registerHelper('eq', function (this: unknown, a: string, b: string, options: Handlebars.HelperOptions) {
  return a === b ? options.fn(this) : options.inverse(this);
});

Handlebars.registerHelper('stepNumber', (index: number) => index + 1);

Handlebars.registerHelper('year', () => new Date().getFullYear());

// ── Load and cache templates ────────────────────────────────────
const templateCache = new Map<string, HandlebarsTemplateDelegate>();

async function loadTemplate(templateSlug: string, page: string): Promise<HandlebarsTemplateDelegate> {
  const cacheKey = `${templateSlug}/${page}`;
  if (templateCache.has(cacheKey)) return templateCache.get(cacheKey)!;

  const templateDir = path.join(TEMPLATES_DIR, templateSlug);
  const partialsDir = path.join(templateDir, 'partials');

  // Register partials
  const partialFiles = await fs.readdir(partialsDir).catch(() => [] as string[]);
  for (const file of partialFiles) {
    if (!file.endsWith('.hbs')) continue;
    const name = file.replace('.hbs', '');
    const src = await fs.readFile(path.join(partialsDir, file), 'utf-8');
    Handlebars.registerPartial(name, src);
  }

  const src = await fs.readFile(path.join(templateDir, `${page}.hbs`), 'utf-8');
  const compiled = Handlebars.compile(src);
  templateCache.set(cacheKey, compiled);
  return compiled;
}

// ── Fetch all site data from Supabase ───────────────────────────
async function fetchSiteData(siteId: string, pageSlug: string) {
  const db = supabase as ReturnType<typeof import('@supabase/supabase-js').createClient>;

  const [
    { data: config },
    { data: navItems },
    { data: page },
    { data: sections },
  ] = await Promise.all([
    db.from('site_config').select('*').eq('site_id', siteId).single(),
    db.from('nav_items').select('*').eq('site_id', siteId).eq('visible', true).order('order'),
    db.from('pages').select('*').eq('site_id', siteId).eq('slug', pageSlug).single(),
    db.from('sections').select('*').eq('site_id', siteId).eq('page_slug', pageSlug).eq('visible', true).order('order'),
  ]) as [
    { data: SiteConfig | null },
    { data: NavItem[] | null },
    { data: Page | null },
    { data: Section[] | null },
  ];

  if (!config || !page) throw new Error(`Site data not found for site=${siteId} page=${pageSlug}`);

  // Fetch items for each section
  const sectionsWithItems = await Promise.all(
    (sections ?? []).map(async (section: Section) => {
      const { data: items } = await db
        .from('items')
        .select('*')
        .eq('section_id', section.id)
        .eq('visible', true)
        .order('order') as { data: Item[] | null };
      return { ...section, items: items ?? [] };
    })
  );

  return { config, nav_items: navItems ?? [], page, sections: sectionsWithItems };
}

// ── Build a single page ─────────────────────────────────────────
async function buildPage(siteId: string, templateSlug: string, pageSlug: string): Promise<string> {
  const [template, data] = await Promise.all([
    loadTemplate(templateSlug, pageSlug === 'home' ? 'home' : 'home'), // expand for inner pages later
    fetchSiteData(siteId, pageSlug),
  ]);

  return template({ ...data, year: new Date().getFullYear() });
}

// ── Main: rebuild all pages for a site ─────────────────────────
export async function rebuildSite(siteId: string): Promise<{ pagesBuilt: number; buildTimeMs: number }> {
  const start = Date.now();

  const { data: site } = await supabase
    .from('sites')
    .select('id, name, template_id, templates:template_id(slug)')
    .eq('id', siteId)
    .single() as { data: { id: string; name: string; template_id: string | null; templates: { slug: string } | null } | null };

  if (!site) throw new Error(`Site not found: ${siteId}`);

  const tpl = site.templates;
  const templateSlug = tpl?.slug ?? 'bold';

  const { data: pages } = await supabase
    .from('pages')
    .select('slug')
    .eq('site_id', siteId)
    .eq('published', true) as { data: { slug: string }[] | null };

  const outDir = path.join(DIST_DIR, siteId);
  await fs.mkdir(outDir, { recursive: true });

  let pagesBuilt = 0;
  for (const page of pages ?? []) {
    const html = await buildPage(siteId, templateSlug, page.slug);
    const pageDir = page.slug === 'home'
      ? outDir
      : path.join(outDir, ...page.slug.split('/'));
    await fs.mkdir(pageDir, { recursive: true });
    await fs.writeFile(path.join(pageDir, 'index.html'), html, 'utf-8');
    pagesBuilt++;
  }

  const buildTimeMs = Date.now() - start;
  logger.info({ siteId, pagesBuilt, buildTimeMs }, 'Site rebuilt');
  return { pagesBuilt, buildTimeMs };
}

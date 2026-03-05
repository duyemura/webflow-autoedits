import path from 'node:path';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { supabase } from './supabase/client.js';
import { logger } from '../shared/logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST_SITES = path.join(__dirname, '..', '..', 'dist', 'sites');

// ── Types ─────────────────────────────────────────────────────────

export interface TestResult {
  name: string;
  passed: boolean;
  message: string;
  durationMs: number;
}

export interface TestReport {
  siteId: string;
  passed: number;
  failed: number;
  total: number;
  results: TestResult[];
  durationMs: number;
  summary: string;
}

// ── Helper ────────────────────────────────────────────────────────

async function runTest(name: string, fn: () => Promise<string>): Promise<TestResult> {
  const start = Date.now();
  try {
    const message = await fn();
    return { name, passed: true, message, durationMs: Date.now() - start };
  } catch (err) {
    return { name, passed: false, message: err instanceof Error ? err.message : String(err), durationMs: Date.now() - start };
  }
}

function readHtml(siteId: string, slug: string): Promise<string> {
  const file = slug === 'home'
    ? path.join(DIST_SITES, siteId, 'index.html')
    : path.join(DIST_SITES, siteId, ...slug.split('/'), 'index.html');
  return fs.readFile(file, 'utf-8');
}

// ── Programmatic tests ────────────────────────────────────────────

/** All published pages have a built HTML file on disk */
async function testPagesBuilt(siteId: string): Promise<TestResult> {
  return runTest('pages_built', async () => {
    const db = supabase as ReturnType<typeof import('@supabase/supabase-js').createClient>;
    const { data: pages } = await db
      .from('pages').select('slug').eq('site_id', siteId).eq('published', true) as { data: { slug: string }[] | null };

    if (!pages?.length) throw new Error('No published pages in database');

    const missing: string[] = [];
    for (const { slug } of pages) {
      const file = slug === 'home'
        ? path.join(DIST_SITES, siteId, 'index.html')
        : path.join(DIST_SITES, siteId, ...slug.split('/'), 'index.html');
      try { await fs.access(file); } catch { missing.push(`/${slug}`); }
    }
    if (missing.length) throw new Error(`Built files missing: ${missing.join(', ')}`);
    return `${pages.length} page(s) built`;
  });
}

/** Homepage has a non-empty, non-placeholder <h1> */
async function testHeroContent(siteId: string): Promise<TestResult> {
  return runTest('hero_content', async () => {
    const html = await readHtml(siteId, 'home').catch(() => { throw new Error('Homepage not built yet'); });
    const h1 = html.match(/<h1[^>]*>\s*([\s\S]*?)\s*<\/h1>/i)?.[1]?.replace(/<[^>]+>/g, '').trim();
    if (!h1) throw new Error('No <h1> found on homepage');
    if (h1.toLowerCase().startsWith('welcome to')) throw new Error(`Hero headline looks like a placeholder: "${h1}"`);
    if (h1.length < 4) throw new Error(`Hero headline too short: "${h1}"`);
    return `"${h1.slice(0, 60)}"`;
  });
}

/** Nav has at least 3 links */
async function testNavPopulated(siteId: string): Promise<TestResult> {
  return runTest('nav_populated', async () => {
    const html = await readHtml(siteId, 'home').catch(() => { throw new Error('Homepage not built yet'); });
    // Count <a href links in the nav/header area (first 5000 chars usually covers nav)
    const navChunk = html.slice(0, 8000);
    const links = (navChunk.match(/<a\s[^>]*href="[^"#][^"]*"/gi) ?? []).length;
    if (links < 3) throw new Error(`Only ${links} nav link(s) found — expected at least 3`);
    return `${links} navigation links`;
  });
}

/** Nav links that are internal ("/foo") should have a built file */
async function testInternalLinks(siteId: string): Promise<TestResult> {
  return runTest('internal_links', async () => {
    const html = await readHtml(siteId, 'home').catch(() => { throw new Error('Homepage not built yet'); });
    const navChunk = html.slice(0, 8000);
    const hrefs = [...navChunk.matchAll(/href="(\/[^"?#]+)"/gi)].map(m => m[1]);
    const unique = [...new Set(hrefs)].filter(h => h !== '/');

    const broken: string[] = [];
    for (const href of unique) {
      const slug = href.replace(/^\//, '').replace(/\/$/, '') || 'home';
      const file = path.join(DIST_SITES, siteId, ...slug.split('/'), 'index.html');
      try { await fs.access(file); } catch { broken.push(href); }
    }
    if (broken.length) throw new Error(`Dead internal links: ${broken.join(', ')}`);
    return `${unique.length} internal link(s) valid`;
  });
}

/** site_config has key fields filled in */
async function testConfigComplete(siteId: string): Promise<TestResult> {
  return runTest('config_complete', async () => {
    const db = supabase as ReturnType<typeof import('@supabase/supabase-js').createClient>;
    const { data } = await db
      .from('site_config').select('name, primary_color, phone, email').eq('site_id', siteId).single() as
      { data: { name: string | null; primary_color: string | null; phone: string | null; email: string | null } | null };

    if (!data) throw new Error('site_config not found');
    const missing = (['name', 'primary_color'] as const).filter(k => !data[k]);
    if (missing.length) throw new Error(`Missing required config: ${missing.join(', ')}`);

    const contact = [data.phone, data.email].filter(Boolean);
    if (!contact.length) throw new Error('No phone or email set in site_config');
    return `name="${data.name}", color=${data.primary_color}`;
  });
}

// ── E2E tests (Playwright) ────────────────────────────────────────

async function runE2eTests(siteId: string, baseUrl: string): Promise<TestResult[]> {
  let chromium: typeof import('playwright').chromium;
  try {
    ({ chromium } = await import('playwright'));
  } catch {
    logger.warn('playwright not available — skipping E2E tests');
    return [{
      name: 'e2e_skipped',
      passed: true,
      message: 'playwright not installed',
      durationMs: 0,
    }];
  }

  const browser = await chromium.launch();
  const results: TestResult[] = [];

  try {
    /** Homepage loads: title present, no uncaught JS errors */
    results.push(await runTest('e2e_homepage_loads', async () => {
      const page = await browser.newPage();
      const errors: string[] = [];
      page.on('pageerror', (e) => errors.push(e.message));

      await page.goto(`${baseUrl}/api/sites/${siteId}/preview`, { waitUntil: 'domcontentloaded', timeout: 15000 });

      const title = await page.title();
      if (!title) throw new Error('Page has no <title>');

      const h1 = await page.textContent('h1').catch(() => null);
      if (!h1?.trim()) throw new Error('No visible <h1> on homepage');

      if (errors.length) throw new Error(`JS errors: ${errors[0]}`);
      await page.close();
      return `title="${title}", h1="${h1.trim().slice(0, 40)}"`;
    }));

    /** Mobile viewport: no horizontal overflow */
    results.push(await runTest('e2e_mobile_no_overflow', async () => {
      const page = await browser.newPage();
      await page.setViewportSize({ width: 375, height: 812 });
      await page.goto(`${baseUrl}/api/sites/${siteId}/preview`, { waitUntil: 'domcontentloaded', timeout: 15000 });

      const overflow = await page.evaluate(() =>
        document.documentElement.scrollWidth > document.documentElement.clientWidth
      );
      if (overflow) throw new Error('Horizontal overflow detected on 375px viewport');
      await page.close();
      return 'No horizontal overflow at 375px';
    }));

    /** CTA buttons are present */
    results.push(await runTest('e2e_cta_buttons', async () => {
      const page = await browser.newPage();
      await page.goto(`${baseUrl}/api/sites/${siteId}/preview`, { waitUntil: 'domcontentloaded', timeout: 15000 });

      const ctaCount = await page.locator('a.btn, .btn, [class*="cta"], [class*="btn"]').count();
      if (ctaCount === 0) throw new Error('No CTA buttons found on homepage');
      await page.close();
      return `${ctaCount} CTA element(s) found`;
    }));

  } finally {
    await browser.close();
  }

  return results;
}

// ── Main export ───────────────────────────────────────────────────

export async function runSiteTests(siteId: string): Promise<TestReport> {
  const start = Date.now();
  const baseUrl = `http://localhost:${process.env.PORT ?? 3200}`;

  logger.info({ siteId }, 'Running site tests');

  const results = await Promise.all([
    testPagesBuilt(siteId),
    testHeroContent(siteId),
    testNavPopulated(siteId),
    testInternalLinks(siteId),
    testConfigComplete(siteId),
  ]);

  // E2E runs after programmatic (needs built site)
  const e2eResults = await runE2eTests(siteId, baseUrl);
  results.push(...e2eResults);

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const durationMs = Date.now() - start;

  const lines = results.map(r =>
    `${r.passed ? '✓' : '✗'} ${r.name} (${r.durationMs}ms)${r.passed ? '' : ': ' + r.message}`
  );
  const summary = `Tests: ${passed}/${results.length} passed in ${durationMs}ms\n${lines.join('\n')}`;

  logger.info({ siteId, passed, failed, durationMs }, 'Site tests complete');
  return { siteId, passed, failed, total: results.length, results, durationMs, summary };
}

/**
 * Per-client site validator.
 * Reads the client's actual DB data and asserts it appears correctly in their built HTML.
 * Run after every rebuild: npm run test:site <siteId>
 *
 * Tests are generated from the client's own data — if their content changes,
 * the assertions automatically reflect the new expected values.
 */
import 'dotenv/config';
import fs from 'node:fs/promises';
import path from 'node:path';
import { supabase } from '../src/services/supabase/client.js';

const siteId = process.argv[2];
if (!siteId) {
  console.error('Usage: npm run test:site <siteId>');
  process.exit(1);
}

// ── Test runner ─────────────────────────────────────────────────
let passed = 0;
let failed = 0;
const failures: string[] = [];

function assert(label: string, condition: boolean, detail?: string) {
  if (condition) {
    console.log(`  ✓ ${label}`);
    passed++;
  } else {
    console.log(`  ✗ ${label}${detail ? ` — ${detail}` : ''}`);
    failures.push(label);
    failed++;
  }
}

// ── Load data ───────────────────────────────────────────────────
const { data: site } = await supabase.from('sites').select('*').eq('id', siteId).single();
if (!site) { console.error(`Site not found: ${siteId}`); process.exit(1); }

const { data: config } = await supabase.from('site_config').select('*').eq('site_id', siteId).single();
const { data: sections } = await supabase.from('sections').select('*').eq('site_id', siteId).eq('page_slug', 'home').eq('visible', true);
const { data: page } = await supabase.from('pages').select('*').eq('site_id', siteId).eq('slug', 'home').single();
const { data: navItems } = await supabase.from('nav_items').select('*').eq('site_id', siteId).eq('visible', true);

const htmlPath = path.resolve('dist/sites', siteId, 'index.html');
let html: string;
try {
  html = await fs.readFile(htmlPath, 'utf-8');
} catch {
  console.error(`No built HTML found at ${htmlPath}. Run rebuild first.`);
  process.exit(1);
}

// ── Run assertions ──────────────────────────────────────────────
console.log(`\nSite: ${site.name} (${siteId})\n`);

console.log('── Structure ──');
assert('Valid HTML document', html.includes('<!DOCTYPE html>') && html.includes('</html>'));
assert('No Handlebars syntax leaks', !/\{\{[^!]/.test(html), 'Found {{ in output');

console.log('\n── Sections ──');
const requiredSections = ['navbar', 'hero', 'highlights', 'programs', 'steps', 'features', 'faq', 'cta', 'footer'];
for (const s of requiredSections) {
  assert(`data-section="${s}" present`, html.includes(`data-section="${s}"`));
}

console.log('\n── Design Tokens ──');
assert('CSS :root block present', html.includes(':root {'));
if (config?.primary_color) {
  assert(`Primary color compiled (${config.primary_color})`, html.includes(config.primary_color));
}
if (config?.font_heading) {
  assert(`Heading font referenced (${config.font_heading})`, html.includes(config.font_heading));
}

console.log('\n── Site Config Content ──');
if (config?.name) {
  assert(`Site name present (${config.name})`, html.includes(config.name));
}
if (config?.tagline) {
  assert(`Tagline present`, html.includes(config.tagline));
}
if (config?.phone) {
  assert(`Phone number present (${config.phone})`, html.includes(config.phone));
}
if (config?.city && config?.state) {
  assert(`Location present (${config.city}, ${config.state})`, html.includes(config.city) && html.includes(config.state));
}

console.log('\n── Hero ──');
if (page?.hero_headline) {
  assert(`Hero headline present`, html.includes(page.hero_headline));
}
if (page?.hero_cta_text) {
  assert(`Hero CTA present (${page.hero_cta_text})`, html.includes(page.hero_cta_text));
}

console.log('\n── Navigation ──');
if (navItems?.length) {
  assert(`Nav has ${navItems.length} items`, (html.match(/class="navbar__link"/g) ?? []).length + (html.match(/class="btn btn--/g) ?? []).length >= navItems.filter(n => n.visible).length);
  for (const nav of navItems.slice(0, 3)) {
    assert(`Nav item "${nav.label}" present`, html.includes(nav.label));
  }
}

console.log('\n── Section Content ──');
for (const section of sections ?? []) {
  if (section.heading) {
    assert(`Section "${section.section_type}" heading present`, html.includes(section.heading));
  }
}

// ── Summary ─────────────────────────────────────────────────────
console.log(`\n${'─'.repeat(40)}`);
console.log(`${passed + failed} tests: ${passed} passed, ${failed} failed`);

if (failures.length > 0) {
  console.log('\nFailed:');
  failures.forEach(f => console.log(`  • ${f}`));
  process.exit(1);
} else {
  console.log('\nAll checks passed ✓');
}

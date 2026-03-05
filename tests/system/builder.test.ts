import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import { rebuildSite } from '../../src/services/builder.js';

const IRON_FORGE_ID = '00000000-0000-0000-0001-000000000001';
const PEAK_ID       = '00000000-0000-0000-0001-000000000002';
const DIST          = path.resolve('dist/sites');

let ironForgeHtml: string;
let peakHtml: string;

beforeAll(async () => {
  await rebuildSite(IRON_FORGE_ID);
  await rebuildSite(PEAK_ID);
  ironForgeHtml = await fs.readFile(path.join(DIST, IRON_FORGE_ID, 'index.html'), 'utf-8');
  peakHtml      = await fs.readFile(path.join(DIST, PEAK_ID, 'index.html'), 'utf-8');
}, 30_000);

describe('builder — output is valid HTML', () => {
  it('produces an HTML file for Iron Forge', () => {
    expect(ironForgeHtml).toContain('<!DOCTYPE html>');
    expect(ironForgeHtml).toContain('</html>');
  });

  it('produces an HTML file for Peak Performance', () => {
    expect(peakHtml).toContain('<!DOCTYPE html>');
    expect(peakHtml).toContain('</html>');
  });

  it('does not leak Handlebars syntax', () => {
    expect(ironForgeHtml).not.toMatch(/\{\{[^!]/);
    expect(peakHtml).not.toMatch(/\{\{[^!]/);
  });
});

describe('builder — required sections present', () => {
  const sections = ['navbar', 'hero', 'highlights', 'programs', 'steps', 'features', 'faq', 'cta', 'footer'];

  for (const section of sections) {
    it(`Iron Forge has data-section="${section}"`, () => {
      expect(ironForgeHtml).toContain(`data-section="${section}"`);
    });

    it(`Peak Performance has data-section="${section}"`, () => {
      expect(peakHtml).toContain(`data-section="${section}"`);
    });
  }
});

describe('builder — CSS design tokens compiled', () => {
  it('Iron Forge has correct primary color in :root', () => {
    expect(ironForgeHtml).toContain('--color-primary:   #C0392B');
  });

  it('Peak Performance has correct primary color in :root', () => {
    expect(peakHtml).toContain('--color-primary:   #2980B9');
  });

  it('CSS uses var() references (not hardcoded values)', () => {
    expect(ironForgeHtml).toContain('background: var(--color-primary)');
  });
});

describe('builder — sites are independent', () => {
  it('Iron Forge does not contain Peak Performance content', () => {
    expect(ironForgeHtml).not.toContain('Peak Performance');
    expect(ironForgeHtml).not.toContain('Train High');
  });

  it('Peak Performance does not contain Iron Forge content', () => {
    expect(peakHtml).not.toContain('Iron Forge');
    expect(peakHtml).not.toContain('Forged in Austin');
  });
});

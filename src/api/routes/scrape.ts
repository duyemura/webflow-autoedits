import type { FastifyPluginAsync } from 'fastify';
import { AIClient } from '../../shared/ai/client.js';

export interface ScrapeResult {
  name?: string;
  tagline?: string;
  city?: string;
  state?: string;
  zip?: string;
  phone?: string;
  email?: string;
  address?: string;
  primary_color?: string;
  secondary_color?: string;
  logo_url?: string;
  font_heading?: string;
  font_body?: string;
  instagram_url?: string;
  facebook_url?: string;
  tiktok_url?: string;
  youtube_url?: string;
  booking_url?: string;
  hours?: Record<string, string>;
  programs?: { name: string; description: string }[];
  coaches?: { name: string; role: string; bio?: string }[];
  icp?: string;
  raw_summary?: string;
}

// ── HTML helpers ─────────────────────────────────────────────────

function extractMeta(html: string): string {
  const tags: string[] = [];
  const patterns = [
    /og:title.*?content="([^"]+)"/i,
    /og:description.*?content="([^"]+)"/i,
    /og:site_name.*?content="([^"]+)"/i,
    /<title[^>]*>([^<]+)<\/title>/i,
    /<meta name="description".*?content="([^"]+)"/i,
  ];
  for (const p of patterns) {
    const m = html.match(p);
    if (m?.[1]) tags.push(m[1].trim());
  }
  return tags.join('\n');
}

/** Pull JSON-LD structured data — often contains address, phone, hours */
function extractStructuredData(html: string): string {
  const blocks: string[] = [];
  const matches = html.matchAll(/<script[^>]+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi);
  for (const m of matches) {
    try {
      const obj = JSON.parse(m[1].trim());
      blocks.push(JSON.stringify(obj, null, 2));
    } catch { /* skip malformed */ }
  }
  return blocks.join('\n\n').slice(0, 6000);
}

/** Regex-extract phones, emails, addresses from raw HTML (works on JS-heavy sites) */
function extractContactPatterns(html: string): string {
  const found: string[] = [];

  // Phone numbers
  const phones = [...new Set(
    (html.match(/(\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]\d{3}[-.\s]\d{4}/g) ?? [])
      .filter(p => !p.match(/^1234|0000|5555/)) // skip obvious placeholders
  )];
  if (phones.length) found.push(`Phones found: ${phones.slice(0, 5).join(', ')}`);

  // Emails
  const emails = [...new Set(
    (html.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) ?? [])
      .filter(e => !e.match(/example\.|test\.|noreply@/i))
  )];
  if (emails.length) found.push(`Emails found: ${emails.slice(0, 5).join(', ')}`);

  // Street addresses (simple pattern)
  const addrs = html.match(/\d{2,5}\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\s+(?:Street|St|Avenue|Ave|Road|Rd|Blvd|Boulevard|Drive|Dr|Lane|Ln|Way|Court|Ct|Circle|Cir)/g) ?? [];
  if (addrs.length) found.push(`Addresses found: ${[...new Set(addrs)].slice(0, 3).join(', ')}`);

  return found.join('\n');
}

function extractColors(html: string): string {
  const cssBlocks = (html.match(/<style[^>]*>([\s\S]*?)<\/style>/gi) ?? [])
    .join('\n')
    .slice(0, 6000);
  const colorVars = cssBlocks.match(/--[a-z-]*(?:color|primary|secondary|brand)[^:]*:\s*#[0-9a-fA-F]{3,8}/gi) ?? [];
  const primaryColors = cssBlocks.match(/(?:primary|brand|accent|main)[^:]*:\s*#[0-9a-fA-F]{3,8}/gi) ?? [];
  // Also look for button/CTA background colors
  const btnColors = cssBlocks.match(/(?:\.btn|button|\.cta)[^{]*\{[^}]*background(?:-color)?:\s*(#[0-9a-fA-F]{3,8})/gi) ?? [];
  return [...new Set([...colorVars, ...primaryColors, ...btnColors])].slice(0, 20).join('\n');
}

function extractFonts(html: string): string {
  const fonts: string[] = [];
  const gfMatches = html.matchAll(/fonts\.googleapis\.com\/css[^"']*[?&]family=([^"'&]+)/gi);
  for (const m of gfMatches) {
    fonts.push(decodeURIComponent(m[1]).replace(/\+/g, ' ').replace(/:[^|,]*/g, '').split('|').join(', '));
  }
  const cssBlocks = (html.match(/<style[^>]*>([\s\S]*?)<\/style>/gi) ?? []).join('\n').slice(0, 4000);
  const families = cssBlocks.match(/font-family\s*:\s*['"]?([A-Za-z][^;,'"]{2,30})/gi) ?? [];
  for (const f of families.slice(0, 6)) fonts.push(f.replace(/font-family\s*:\s*/i, '').replace(/['"]/g, '').trim());
  return [...new Set(fonts)].slice(0, 8).join('\n');
}

function extractLogoUrl(html: string, baseUrl: string): string {
  const patterns = [
    /<img[^>]+class="[^"]*logo[^"]*"[^>]+src="([^"]+)"/i,
    /<img[^>]+src="([^"]+)"[^>]+class="[^"]*logo[^"]*"/i,
    /<img[^>]+alt="[^"]*logo[^"]*"[^>]+src="([^"]+)"/i,
    /<img[^>]+src="([^"]*logo[^"]*\.(png|svg|webp|jpg))"/i,
    /<img[^>]+src="([^"]*brand[^"]*\.(png|svg|webp|jpg))"/i,
  ];
  for (const p of patterns) {
    const m = html.match(p);
    if (m?.[1]) {
      const src = m[1];
      if (src.startsWith('http')) return src;
      try { return new URL(src, baseUrl).href; } catch { return src; }
    }
  }
  const og = html.match(/<meta[^>]+property="og:image"[^>]+content="([^"]+)"/i)?.[1];
  return og ?? '';
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#[0-9]+;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 22000);
}

async function fetchPage(url: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; GrowSites/1.0; site-import)', Accept: 'text/html' },
      redirect: 'follow',
    });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const ct = res.headers.get('content-type') ?? '';
    if (!ct.includes('html')) return null;
    return res.text();
  } catch {
    return null;
  }
}

// ── Extraction prompt ─────────────────────────────────────────────

const SYSTEM_PROMPT = `You extract structured gym/fitness studio information from website content.

Return ONLY valid JSON matching this schema — no markdown, no explanation:
{
  "name": "Business name (string or null)",
  "tagline": "Slogan or short description (string or null)",
  "city": "City name (string or null)",
  "state": "2-letter state code (string or null)",
  "zip": "ZIP code (string or null)",
  "phone": "Phone number as shown (string or null)",
  "email": "Contact email (string or null)",
  "address": "Street address only, no city/state (string or null)",
  "primary_color": "Main brand color as hex #rrggbb (string or null)",
  "secondary_color": "Secondary brand color as hex #rrggbb (string or null)",
  "logo_url": "Full URL to logo image — use LOGO_URL hint if provided (string or null)",
  "font_heading": "Heading font as Google Fonts name e.g. 'Bebas Neue', 'Oswald' (string or null)",
  "font_body": "Body font as Google Fonts name e.g. 'Inter', 'Open Sans' (string or null)",
  "instagram_url": "Full Instagram URL (string or null)",
  "facebook_url": "Full Facebook URL (string or null)",
  "tiktok_url": "Full TikTok URL (string or null)",
  "youtube_url": "Full YouTube URL (string or null)",
  "booking_url": "URL to book classes or appointments (string or null)",
  "hours": { "Monday": "5:30am-8pm", ... } or null,
  "programs": [ { "name": "CrossFit", "description": "..." }, ... ] or [],
  "coaches": [ { "name": "Jane", "role": "Head Coach", "bio": "..." }, ... ] or [],
  "icp": "One sentence: who is this gym for? fitness level, goals, demographics.",
  "raw_summary": "2-4 sentence plain English summary of the gym"
}

Rules:
- CONTACT HINTS section has pre-extracted phone/email/address — trust these over guessing
- STRUCTURED DATA section has JSON-LD schema data — mine it for address, phone, hours
- primary_color: prefer CSS custom property values, then dominant button/CTA color
- logo_url: prefer the LOGO_URL hint value exactly as given
- programs: list every class type, service, or training format mentioned
- coaches: list every staff member or coach mentioned by name
- Extract real values only — do not invent or guess content
- raw_summary: write in second person ("You offer...", "Your gym...")`;

// ── Route ─────────────────────────────────────────────────────────

const scrapeRoute: FastifyPluginAsync = async (app) => {
  app.post('/scrape', async (req, reply) => {
    const { url } = req.body as { url: string };
    if (!url?.trim()) return reply.status(400).send({ error: 'url is required' });

    let targetUrl = url.trim();
    if (!/^https?:\/\//i.test(targetUrl)) targetUrl = `https://${targetUrl}`;

    // Fetch homepage
    let html: string | null;
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 12000);
      const res = await fetch(targetUrl, {
        signal: controller.signal,
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; GrowSites/1.0; site-import)', Accept: 'text/html,application/xhtml+xml' },
        redirect: 'follow',
      });
      clearTimeout(timeout);
      if (!res.ok) return reply.status(422).send({ error: `Site returned ${res.status}. Check the URL and try again.` });
      const ct = res.headers.get('content-type') ?? '';
      if (!ct.includes('html')) return reply.status(422).send({ error: 'URL did not return an HTML page.' });
      html = await res.text();
    } catch (err: unknown) {
      if ((err as { name?: string }).name === 'AbortError')
        return reply.status(422).send({ error: 'Site took too long to respond.' });
      return reply.status(422).send({ error: "Could not reach that URL. Make sure it's publicly accessible." });
    }

    // Also fetch /contact and /about for richer content (best-effort)
    const base = new URL(targetUrl).origin;
    const [contactHtml, aboutHtml] = await Promise.all([
      fetchPage(`${base}/contact`),
      fetchPage(`${base}/about`),
    ]);
    const extraHtml = [contactHtml, aboutHtml].filter(Boolean).join('\n');

    // Build all signals
    const allHtml = html + '\n' + extraHtml;
    const meta = extractMeta(html);
    const structured = extractStructuredData(allHtml);
    const contact = extractContactPatterns(allHtml);
    const colors = extractColors(html);
    const fonts = extractFonts(html);
    const logoUrl = extractLogoUrl(html, targetUrl);
    const text = stripHtml(allHtml);

    const userContent = [
      meta && `META TAGS:\n${meta}`,
      structured && `STRUCTURED DATA (JSON-LD):\n${structured}`,
      contact && `CONTACT HINTS (pre-extracted):\n${contact}`,
      colors && `CSS COLOR HINTS:\n${colors}`,
      fonts && `FONT HINTS:\n${fonts}`,
      logoUrl && `LOGO_URL: ${logoUrl}`,
      `PAGE TEXT:\n${text}`,
    ].filter(Boolean).join('\n\n---\n\n');

    let result: ScrapeResult;
    try {
      const ai = new AIClient();
      const { text: raw } = await ai.complete(SYSTEM_PROMPT, userContent);
      const cleaned = raw.replace(/^```json\s*/i, '').replace(/\s*```$/, '').trim();
      result = JSON.parse(cleaned) as ScrapeResult;
    } catch {
      return reply.status(500).send({ error: 'Could not parse site content. Try filling in manually.' });
    }

    if (!result.logo_url && logoUrl) result.logo_url = logoUrl;

    return reply.send(result);
  });
};

export default scrapeRoute;

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
  raw_summary?: string; // free-text for injecting into build prompt
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

function extractColors(html: string): string {
  // Pull CSS custom properties and color values as hints
  const cssBlocks = (html.match(/<style[^>]*>([\s\S]*?)<\/style>/gi) ?? [])
    .join('\n')
    .slice(0, 4000);
  const colorVars = cssBlocks.match(/--[a-z-]*color[^:]*:\s*#[0-9a-fA-F]{3,8}/gi) ?? [];
  const primaryColors = cssBlocks.match(/primary[^:]*:\s*#[0-9a-fA-F]{3,8}/gi) ?? [];
  return [...new Set([...colorVars, ...primaryColors])].slice(0, 20).join('\n');
}

function extractFonts(html: string): string {
  const fonts: string[] = [];
  // Google Fonts links
  const gfMatches = html.matchAll(/fonts\.googleapis\.com\/css[^"']*[?&]family=([^"'&]+)/gi);
  for (const m of gfMatches) {
    fonts.push(decodeURIComponent(m[1]).replace(/\+/g, ' ').replace(/:[^|,]*/g, '').split('|').join(', '));
  }
  // CSS font-family declarations
  const cssBlocks = (html.match(/<style[^>]*>([\s\S]*?)<\/style>/gi) ?? []).join('\n').slice(0, 4000);
  const families = cssBlocks.match(/font-family\s*:\s*['"]?([A-Za-z][^;,'"]{2,30})/gi) ?? [];
  for (const f of families.slice(0, 6)) fonts.push(f.replace(/font-family\s*:\s*/i, '').replace(/['"]/g, '').trim());
  return [...new Set(fonts)].slice(0, 8).join('\n');
}

function extractLogoUrl(html: string, baseUrl: string): string {
  // Look for logo in common patterns: img with "logo" in src/alt/class, or SVG with logo class
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
      try {
        return new URL(src, baseUrl).href;
      } catch {
        return src;
      }
    }
  }
  // og:image as fallback
  const og = html.match(/<meta[^>]+property="og:image"[^>]+content="([^"]+)"/i)?.[1];
  return og ?? '';
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[\s\S]*?<\/nav>/gi, ' ') // nav is usually low-signal
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#[0-9]+;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 18000);
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
  "address": "Street address (string or null)",
  "primary_color": "Main brand color as hex #rrggbb (string or null — look in CSS vars, buttons, headers, nav background)",
  "secondary_color": "Secondary/accent brand color as hex #rrggbb (string or null — look for a second dominant color used for backgrounds, text, or accents)",
  "logo_url": "Full URL to the gym's logo image — use the LOGO_URL hint if provided (string or null)",
  "font_heading": "Heading/display font name as a valid Google Fonts name (string or null — e.g. 'Bebas Neue', 'Oswald', 'Montserrat'. Use FONT HINTS if provided)",
  "font_body": "Body text font name as a valid Google Fonts name (string or null — e.g. 'Inter', 'Open Sans', 'Roboto')",
  "instagram_url": "Full Instagram URL (string or null)",
  "facebook_url": "Full Facebook URL (string or null)",
  "tiktok_url": "Full TikTok URL (string or null)",
  "youtube_url": "Full YouTube URL (string or null)",
  "booking_url": "URL to book classes or appointments (string or null)",
  "hours": { "Monday": "5:30am-8pm", ... } or null,
  "programs": [ { "name": "CrossFit", "description": "..." }, ... ] or [],
  "coaches": [ { "name": "Jane", "role": "Head Coach", "bio": "..." }, ... ] or [],
  "icp": "One sentence describing the ideal member: fitness level, goals, demographics. E.g. 'Competitive CrossFit athletes and fitness-focused adults, 25–40, who want structured coaching.'",
  "raw_summary": "2-4 sentence plain English summary of the gym: what they offer, who they serve, what makes them different"
}

Rules:
- Extract real values only — do not invent or guess content
- primary_color: prefer CSS custom property values, then dominant button/CTA color, then nav background
- secondary_color: look for a second strong color (often used for dark backgrounds or accent text)
- logo_url: prefer the LOGO_URL hint; otherwise look for <img> tags with "logo" in class/alt/src
- font_heading: match to the closest Google Fonts equivalent — if you see "Bebas", return "Bebas Neue"
- font_body: common body fonts — Inter, Open Sans, Roboto, Lato, Source Sans Pro
- programs: list every class type, service, or training format mentioned
- coaches: list every staff member or coach mentioned by name
- icp: synthesize from the language, programs, and tone of the site — who is this gym really for?
- raw_summary: write this in second person ("You offer...", "Your gym is...")`;

// ── Route ─────────────────────────────────────────────────────────

const scrapeRoute: FastifyPluginAsync = async (app) => {
  app.post('/scrape', async (req, reply) => {
    const { url } = req.body as { url: string };

    if (!url?.trim()) return reply.status(400).send({ error: 'url is required' });

    // Normalize URL
    let targetUrl = url.trim();
    if (!/^https?:\/\//i.test(targetUrl)) targetUrl = `https://${targetUrl}`;

    // Fetch with timeout
    let html: string;
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 12000);

      const res = await fetch(targetUrl, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; GrowSites/1.0; site-import)',
          'Accept': 'text/html,application/xhtml+xml',
        },
        redirect: 'follow',
      });
      clearTimeout(timeout);

      if (!res.ok) {
        return reply.status(422).send({ error: `Site returned ${res.status}. Check the URL and try again.` });
      }

      const contentType = res.headers.get('content-type') ?? '';
      if (!contentType.includes('html')) {
        return reply.status(422).send({ error: 'URL did not return an HTML page.' });
      }

      html = await res.text();
    } catch (err: unknown) {
      const name = (err as { name?: string }).name;
      if (name === 'AbortError') {
        return reply.status(422).send({ error: 'Site took too long to respond. Try a faster page or fill in manually.' });
      }
      return reply.status(422).send({ error: 'Could not reach that URL. Make sure it\'s publicly accessible.' });
    }

    // Build content for Claude
    const meta = extractMeta(html);
    const colors = extractColors(html);
    const fonts = extractFonts(html);
    const logoUrl = extractLogoUrl(html, targetUrl);
    const text = stripHtml(html);

    const userContent = [
      meta && `META TAGS:\n${meta}`,
      colors && `CSS COLOR HINTS:\n${colors}`,
      fonts && `FONT HINTS:\n${fonts}`,
      logoUrl && `LOGO_URL: ${logoUrl}`,
      `PAGE TEXT:\n${text}`,
    ].filter(Boolean).join('\n\n---\n\n');

    // Extract with Claude
    let result: ScrapeResult;
    try {
      const ai = new AIClient();
      const { text: raw } = await ai.complete(SYSTEM_PROMPT, userContent);

      // Strip markdown fences if present
      const cleaned = raw.replace(/^```json\s*/i, '').replace(/\s*```$/, '').trim();
      result = JSON.parse(cleaned) as ScrapeResult;
    } catch {
      return reply.status(500).send({ error: 'Could not parse site content. Try filling in manually.' });
    }

    // Override logo_url with our extracted value if Claude didn't find one
    if (!result.logo_url && logoUrl) result.logo_url = logoUrl;

    return reply.send(result);
  });
};

export default scrapeRoute;

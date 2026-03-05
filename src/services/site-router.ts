import { supabase } from './supabase/client.js';
import type { Site } from './supabase/types.js';

const PLATFORM_DOMAIN = process.env.PLATFORM_DOMAIN ?? 'growsites.io';

// Cache site lookups for 30s to avoid hammering Supabase on every request
const cache = new Map<string, { site: Site | null; expiresAt: number }>();
const CACHE_TTL = 30_000;

export async function siteFromHost(host: string): Promise<Site | null> {
  // Strip port if present
  const hostname = host.split(':')[0].toLowerCase();

  // Never route platform domains — these serve the dashboard SPA
  if (hostname === PLATFORM_DOMAIN || hostname === `app.${PLATFORM_DOMAIN}` || hostname === 'localhost') {
    return null;
  }

  const cached = cache.get(hostname);
  if (cached && cached.expiresAt > Date.now()) return cached.site;

  let site: Site | null = null;

  // Check subdomain first (e.g. ironforge.growsites.io)
  if (hostname.endsWith(`.${PLATFORM_DOMAIN}`)) {
    const subdomain = hostname.slice(0, -(PLATFORM_DOMAIN.length + 1));
    const { data } = await supabase.from('sites').select('*').eq('subdomain', subdomain).single();
    site = data ?? null;
  } else {
    // Custom domain
    const { data } = await supabase.from('sites').select('*').eq('custom_domain', hostname).single();
    site = data ?? null;
  }

  cache.set(hostname, { site, expiresAt: Date.now() + CACHE_TTL });
  return site;
}

import type { FastifyPluginAsync } from 'fastify';
import { supabase } from '../../services/supabase/client.js';
import { getSchedule } from '../../services/pushpress/client.js';
import type { ScheduleClass } from '../../services/pushpress/types.js';
import type { SiteConfig } from '../../services/supabase/types.js';

// Simple in-process cache: siteId → { data, expiresAt }
const cache = new Map<string, { classes: ScheduleClass[]; expiresAt: number }>();
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

const scheduleRoute: FastifyPluginAsync = async (app) => {
  app.get('/sites/:siteId/schedule', async (req, reply) => {
    const { siteId } = req.params as { siteId: string };

    // Serve from cache if fresh
    const cached = cache.get(siteId);
    if (cached && Date.now() < cached.expiresAt) {
      return reply.send({ classes: cached.classes, cached: true });
    }

    // Read PP credentials from site_config
    const db = supabase as ReturnType<typeof import('@supabase/supabase-js').createClient>;
    const { data: config, error } = await db
      .from('site_config')
      .select('pp_api_key, pp_company_id, primary_color')
      .eq('site_id', siteId)
      .single() as { data: Pick<SiteConfig, 'pp_api_key' | 'pp_company_id' | 'primary_color'> | null; error: unknown };

    if (error || !config) {
      return reply.status(404).send({ error: 'Site not found' });
    }

    if (!config.pp_api_key || !config.pp_company_id) {
      return reply.send({ classes: [], configured: false });
    }

    try {
      const classes = await getSchedule(
        config.pp_api_key,
        config.pp_company_id,
        config.primary_color ?? '#000000',
        7
      );

      cache.set(siteId, { classes, expiresAt: Date.now() + CACHE_TTL_MS });
      return reply.send({ classes, cached: false });
    } catch (err) {
      app.log.error({ err, siteId }, 'PushPress schedule fetch failed');
      // Return stale cache if available
      if (cached) return reply.send({ classes: cached.classes, cached: true, stale: true });
      return reply.status(502).send({ error: 'Could not fetch schedule from PushPress' });
    }
  });

  // Force-refresh cache for a site
  app.post('/sites/:siteId/schedule/refresh', async (req, reply) => {
    const { siteId } = req.params as { siteId: string };
    cache.delete(siteId);
    return reply.send({ ok: true });
  });
};

export default scheduleRoute;

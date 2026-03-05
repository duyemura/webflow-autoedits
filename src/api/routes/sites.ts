import path from 'node:path';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import type { FastifyPluginAsync } from 'fastify';
import { supabase } from '../../services/supabase/client.js';
import { rebuildSite } from '../../services/builder.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST_SITES = path.join(__dirname, '..', '..', '..', 'dist', 'sites');

const sitesRoute: FastifyPluginAsync = async (app) => {
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

import path from 'node:path';
import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import Fastify from 'fastify';
import fastifyAutoload from '@fastify/autoload';
import fastifyCors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import { siteFromHost } from './services/site-router.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST_SITES = path.join(__dirname, '..', 'dist', 'sites');

export async function buildApp() {
  const app = Fastify({
    logger: {
      level: process.env.LOG_LEVEL ?? 'info',
      transport: process.env.NODE_ENV !== 'production'
        ? { target: 'pino-pretty', options: { colorize: true } }
        : undefined,
    },
  });

  await app.register(fastifyCors, {
    origin: process.env.NODE_ENV !== 'production'
      ? ['http://localhost:5173', 'http://localhost:3200']
      : true,
    credentials: true,
  });

  // ── API routes (dashboard + agent) ──────────────────────────
  await app.register(fastifyAutoload, {
    dir: path.join(__dirname, 'api/routes'),
    options: { prefix: '/api' },
    dirNameRoutePrefix: false,
  });

  // ── Serve client sites by Host header ───────────────────────
  // Requests coming in on a client subdomain/domain get their
  // pre-built HTML served from dist/sites/{siteId}/
  app.addHook('onRequest', async (req, reply) => {
    const host = req.headers.host ?? '';
    const url = req.url;

    // Only intercept non-API requests
    if (url.startsWith('/api')) return;

    const site = await siteFromHost(host);
    if (!site) return; // not a client domain — fall through to SPA

    const siteDir = path.join(DIST_SITES, site.id);

    // Resolve the requested path to an index.html file
    let filePath: string;
    if (url === '/' || url === '') {
      filePath = path.join(siteDir, 'index.html');
    } else {
      const cleanPath = url.split('?')[0].replace(/\/$/, '');
      filePath = path.join(siteDir, ...cleanPath.split('/'), 'index.html');
    }

    try {
      const html = await fs.readFile(filePath, 'utf-8');
      return reply.type('text/html').send(html);
    } catch {
      // Page not built yet — trigger a build? For now return 404
      return reply.status(404).send(`<h1>Page not found</h1><p>Try rebuilding this site.</p>`);
    }
  });

  // ── Dashboard SPA (production) ───────────────────────────────
  const spaDistPath = path.join(__dirname, '..', 'spa', 'dist');
  if (existsSync(spaDistPath)) {
    await app.register(fastifyStatic, {
      root: spaDistPath,
      prefix: '/',
      wildcard: false,
    });
    app.setNotFoundHandler((_req, reply) => {
      return reply.sendFile('index.html', spaDistPath);
    });
  }

  return app;
}

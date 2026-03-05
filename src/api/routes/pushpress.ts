import type { FastifyPluginAsync } from 'fastify';

// Production PP API — different base from the dev docs (api.pushpressdev.com)
const PP_BASE = 'https://api.pushpress.com/v3';

interface PPCompany {
  id: string;
  name: string;
  subdomain: string;
  defaultTimezone: string;
  phone: string | null;
  email: string | null;
  url: string | null;
  address: {
    line1: string | null;
    line2: string | null;
    city: string | null;
    state: string | null;
    postalCode: string | null;
    country: { name: string; iso: string } | null;
  } | null;
}

const pushpressRoute: FastifyPluginAsync = async (app) => {
  // Verify a PushPress API key and return company info
  app.post('/pushpress/verify', async (req, reply) => {
    const { apiKey } = req.body as { apiKey: string };

    if (!apiKey?.trim()) {
      return reply.status(400).send({ error: 'apiKey is required' });
    }

    let res: Response;
    try {
      res = await fetch(`${PP_BASE}/company`, {
        headers: { 'API-KEY': apiKey.trim() },
      });
    } catch {
      return reply.status(502).send({ error: 'Could not reach PushPress API' });
    }

    if (res.status === 401) {
      return reply.status(401).send({ error: 'Invalid API key — check your PushPress settings' });
    }
    if (res.status === 404) {
      return reply.status(404).send({ error: 'Company not found for this API key' });
    }
    if (!res.ok) {
      return reply.status(502).send({ error: `PushPress returned ${res.status}` });
    }

    const company = await res.json() as PPCompany;

    // Return normalized company info
    return {
      id: company.id,
      name: company.name,
      subdomain: company.subdomain,
      timezone: company.defaultTimezone,
      phone: company.phone ?? null,
      email: company.email ?? null,
      city: company.address?.city ?? null,
      state: company.address?.state ?? null,
      address: company.address?.line1 ?? null,
      zip: company.address?.postalCode ?? null,
    };
  });
};

export default pushpressRoute;

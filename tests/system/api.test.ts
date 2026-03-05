import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawn } from 'node:child_process';
import path from 'node:path';

const IRON_FORGE_ID = '00000000-0000-0000-0001-000000000001';
const PORT = 3299; // dedicated test port to avoid conflicts
const BASE = `http://localhost:${PORT}`;

let server: ReturnType<typeof spawn>;

beforeAll(async () => {
  server = spawn('npx', ['tsx', 'src/app-server.ts'], {
    cwd: path.resolve('.'),
    env: { ...process.env, PORT: String(PORT) },
    stdio: 'pipe',
  });

  // Wait for the server to be ready
  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Server startup timed out')), 15_000);
    server.stdout?.on('data', (data: Buffer) => {
      if (data.toString().includes('listening') || data.toString().includes(String(PORT))) {
        clearTimeout(timeout);
        resolve();
      }
    });
    server.stderr?.on('data', (data: Buffer) => {
      if (data.toString().includes(String(PORT))) {
        clearTimeout(timeout);
        resolve();
      }
    });
    server.on('error', reject);
  });
}, 20_000);

afterAll(() => {
  server?.kill();
});

describe('GET /api/health', () => {
  it('returns 200', async () => {
    const res = await fetch(`${BASE}/api/health`);
    expect(res.status).toBe(200);
  });
});

describe('GET /api/sites', () => {
  it('returns both demo sites', async () => {
    const res = await fetch(`${BASE}/api/sites`);
    expect(res.status).toBe(200);
    const body = await res.json() as Array<{ name: string }>;
    expect(Array.isArray(body)).toBe(true);
    const names = body.map(s => s.name);
    expect(names).toContain('Iron Forge CrossFit');
    expect(names).toContain('Peak Performance');
  });
});

describe('POST /api/sites/:siteId/rebuild', () => {
  it('rebuilds Iron Forge and returns page count', async () => {
    const res = await fetch(`${BASE}/api/sites/${IRON_FORGE_ID}/rebuild`, { method: 'POST' });
    expect(res.status).toBe(200);
    const body = await res.json() as { pagesBuilt: number; buildTimeMs: number };
    expect(body.pagesBuilt).toBeGreaterThanOrEqual(1);
    expect(typeof body.buildTimeMs).toBe('number');
  });
}, 15_000);

describe('POST /api/chat', () => {
  it('rejects missing siteId', async () => {
    const res = await fetch(`${BASE}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: [{ role: 'user', content: 'hello' }] }),
    });
    expect(res.status).toBe(400);
  });

  it('rejects empty messages', async () => {
    const res = await fetch(`${BASE}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ siteId: IRON_FORGE_ID, messages: [] }),
    });
    expect(res.status).toBe(400);
  });
});

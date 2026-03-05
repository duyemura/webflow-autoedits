import { describe, it, expect } from 'vitest';
import { siteFromHost } from '../../src/services/site-router.js';

describe('domain routing', () => {
  it('resolves Iron Forge by subdomain', async () => {
    const site = await siteFromHost('ironforge.growsites.io');
    expect(site).not.toBeNull();
    expect(site!.name).toBe('Iron Forge CrossFit');
  });

  it('resolves Peak Performance by subdomain', async () => {
    const site = await siteFromHost('peakperformance.growsites.io');
    expect(site).not.toBeNull();
    expect(site!.name).toBe('Peak Performance');
  });

  it('returns null for localhost (platform domain)', async () => {
    const site = await siteFromHost('localhost');
    expect(site).toBeNull();
  });

  it('returns null for unknown subdomain', async () => {
    const site = await siteFromHost('unknown-gym.growsites.io');
    expect(site).toBeNull();
  });

  it('strips port from host header', async () => {
    const site = await siteFromHost('ironforge.growsites.io:3200');
    expect(site).not.toBeNull();
    expect(site!.subdomain).toBe('ironforge');
  });
});

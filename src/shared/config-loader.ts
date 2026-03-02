import { readFile, readdir, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import type { SiteConfig, AgentConfig } from "../types/index.js";
import { logger } from "./logger.js";

const CONFIG_DIR = join(process.cwd(), "config");

/**
 * In-memory site registry. Loads from JSON files on startup,
 * also supports runtime registration via API.
 */
const siteRegistry = new Map<string, SiteConfig>();
let initialized = false;

async function ensureInitialized(): Promise<void> {
  if (initialized) return;
  const dir = join(CONFIG_DIR, "sites");
  try {
    const files = await readdir(dir);
    for (const file of files) {
      if (!file.endsWith(".json")) continue;
      const data = await readFile(join(dir, file), "utf-8");
      const config = JSON.parse(data) as SiteConfig;
      siteRegistry.set(config.id, config);
    }
  } catch {
    // No config dir yet, that's fine
  }
  initialized = true;
  logger.info({ count: siteRegistry.size }, "Site configs loaded");
}

export async function loadSiteConfig(siteId: string): Promise<SiteConfig> {
  await ensureInitialized();
  const config = siteRegistry.get(siteId);
  if (!config) throw new Error(`Site config not found: ${siteId}`);
  return config;
}

export async function loadAllSiteConfigs(): Promise<SiteConfig[]> {
  await ensureInitialized();
  return Array.from(siteRegistry.values());
}

/**
 * Register a site at runtime (in-memory + optionally persist to disk).
 */
export async function registerSite(config: SiteConfig, persist = true): Promise<void> {
  await ensureInitialized();
  siteRegistry.set(config.id, config);
  logger.info({ siteId: config.id, name: config.name }, "Site registered");

  if (persist) {
    const dir = join(CONFIG_DIR, "sites");
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, `${config.id}.json`), JSON.stringify(config, null, 2));
  }
}

export async function loadAgentConfig(agentName: string): Promise<AgentConfig> {
  const filePath = join(CONFIG_DIR, "agents", `${agentName}.json`);
  const data = await readFile(filePath, "utf-8");
  return JSON.parse(data) as AgentConfig;
}

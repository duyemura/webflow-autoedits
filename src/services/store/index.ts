import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, "..", "..", "..", "data");

async function ensureDataDir() {
  await mkdir(DATA_DIR, { recursive: true });
}

export async function readJsonFile<T>(filename: string, fallback: T): Promise<T> {
  try {
    const content = await readFile(path.join(DATA_DIR, filename), "utf-8");
    return JSON.parse(content) as T;
  } catch {
    return fallback;
  }
}

export async function writeJsonFile(filename: string, data: unknown): Promise<void> {
  await ensureDataDir();
  await writeFile(path.join(DATA_DIR, filename), JSON.stringify(data, null, 2) + "\n");
}

// OAuth token storage
export interface OAuthToken {
  accessToken: string;
  workspaceId?: string;
  createdAt: string;
}

export async function getOAuthToken(): Promise<OAuthToken | null> {
  const data = await readJsonFile<{ token?: OAuthToken }>("oauth-tokens.json", {});
  return data.token ?? null;
}

export async function saveOAuthToken(token: OAuthToken): Promise<void> {
  await writeJsonFile("oauth-tokens.json", { token });
}

// Sites config storage
export interface SiteConfig {
  templates: string[];
  clients: Record<string, { name: string; clonedFrom?: string; createdAt: string }>;
}

export async function getSitesConfig(): Promise<SiteConfig> {
  return readJsonFile<SiteConfig>("sites.json", { templates: [], clients: {} });
}

export async function saveSitesConfig(config: SiteConfig): Promise<void> {
  await writeJsonFile("sites.json", config);
}

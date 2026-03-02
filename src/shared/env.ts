import { logger } from "./logger.js";

interface EnvConfig {
  ANTHROPIC_API_KEY: string;
  LINEAR_API_KEY: string;
  LINEAR_WEBHOOK_SECRET: string;
  WEBFLOW_API_TOKEN: string;
  PORT: number;
  NODE_ENV: string;
  LOG_LEVEL: string;
  MAX_COST_PER_RUN: number;
}

/**
 * Validate required environment variables on startup.
 * Fails fast with a clear message if anything critical is missing.
 */
export function validateEnv(): EnvConfig {
  const missing: string[] = [];

  const required = ["ANTHROPIC_API_KEY", "LINEAR_API_KEY"] as const;
  for (const key of required) {
    if (!process.env[key]) missing.push(key);
  }

  const warned: string[] = [];
  if (!process.env.LINEAR_WEBHOOK_SECRET) warned.push("LINEAR_WEBHOOK_SECRET (webhook signature verification disabled)");

  if (missing.length > 0) {
    const msg = `Missing required environment variables: ${missing.join(", ")}. Copy .env.example to .env and fill in values.`;
    logger.fatal(msg);
    throw new Error(msg);
  }

  if (warned.length > 0) {
    logger.warn(`Optional env vars not set (some features will be limited): ${warned.join(", ")}`);
  }

  return {
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY!,
    LINEAR_API_KEY: process.env.LINEAR_API_KEY!,
    LINEAR_WEBHOOK_SECRET: process.env.LINEAR_WEBHOOK_SECRET || "",
    WEBFLOW_API_TOKEN: process.env.WEBFLOW_API_TOKEN || "",
    PORT: parseInt(process.env.PORT || "3100", 10),
    NODE_ENV: process.env.NODE_ENV || "development",
    LOG_LEVEL: process.env.LOG_LEVEL || "info",
    MAX_COST_PER_RUN: parseFloat(process.env.MAX_COST_PER_RUN || "5.0"),
  };
}

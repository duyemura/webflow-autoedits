import { logger } from './logger.js';

export function validateEnv() {
  const required = ['ANTHROPIC_API_KEY', 'SUPABASE_URL', 'SUPABASE_SECRET_KEY'] as const;
  const missing = required.filter((k) => !process.env[k]);

  if (missing.length > 0) {
    const msg = `Missing required environment variables: ${missing.join(', ')}`;
    logger.fatal(msg);
    throw new Error(msg);
  }

  return {
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY!,
    SUPABASE_URL: process.env.SUPABASE_URL!,
    SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY!,
    PORT: parseInt(process.env.PORT ?? '3200', 10),
    NODE_ENV: process.env.NODE_ENV ?? 'development',
  };
}

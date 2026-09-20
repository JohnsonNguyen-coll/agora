import { config } from 'dotenv';
import { resolve } from 'node:path';
import { z } from 'zod';
export const projectRoot = process.cwd().endsWith('backend') ? resolve(process.cwd(), '..') : process.cwd();
config({ path: resolve(projectRoot, '.env') });
const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3001),
  APP_ORIGIN: z.string().url().default('http://localhost:5173'),
  DATABASE_URL: z.string().default('file:./data/gavel.db'),
  SESSION_SECRET: z.string().min(32), TOKEN_ENCRYPTION_KEY: z.string().regex(/^[a-fA-F0-9]{64}$/),
  LATCH_PROXY_BASE: z.string().url().default('https://onlatch.com/proxy')
});
export const env = schema.parse(process.env);
if (env.NODE_ENV === 'production' && !env.DATABASE_URL.startsWith('postgres'))
  throw new Error('Production requires a Postgres DATABASE_URL.');
if (new URL(env.LATCH_PROXY_BASE).protocol !== 'https:') throw new Error('Latch requires HTTPS.');

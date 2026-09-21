import { config } from 'dotenv';
import { resolve } from 'node:path';
import { z } from 'zod';
export const projectRoot = process.cwd().endsWith('backend') ? resolve(process.cwd(), '..') : process.cwd();
config({ path: resolve(projectRoot, '.env') });
const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  HOST: z.string().default('127.0.0.1'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3001),
  APP_ORIGIN: z.string().url().default('http://localhost:5173'),
  DATABASE_URL: z.string().min(1).default('file:./data/gavel.db'),
  DATABASE_SSL: z.enum(['true', 'false']).default('true'),
  DATABASE_SSL_CA: z.string().optional(),
  DATABASE_POOL_MAX: z.coerce.number().int().min(1).max(20).default(5),
  SERVE_FRONTEND: z.enum(['true', 'false']).default('true'),
  SESSION_SECRET: z.string().min(32), TOKEN_ENCRYPTION_KEY: z.string().regex(/^[a-fA-F0-9]{64}$/),
  LATCH_PROXY_BASE: z.string().url().default('https://onlatch.com/proxy')
});
export const env = schema.parse(process.env);
if (new URL(env.APP_ORIGIN).origin !== env.APP_ORIGIN) throw new Error('APP_ORIGIN must be an origin without a path or trailing slash.');
if (env.NODE_ENV === 'production') {
  if (!/^postgres(ql)?:\/\//.test(env.DATABASE_URL)) throw new Error('Production requires a Postgres DATABASE_URL.');
  if (env.DATABASE_SSL !== 'true') throw new Error('Production database connections require verified TLS.');
  if (!env.APP_ORIGIN.startsWith('https://')) throw new Error('Production APP_ORIGIN requires HTTPS.');
}
if (new URL(env.LATCH_PROXY_BASE).protocol !== 'https:') throw new Error('Latch requires HTTPS.');

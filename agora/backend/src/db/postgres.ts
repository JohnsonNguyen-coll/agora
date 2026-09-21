import type { PoolConfig } from 'pg';
import { env } from '../config/env.js';
export function postgresConfig(): PoolConfig {
  const url = new URL(env.DATABASE_URL);
  // node-postgres URL SSL options override the explicit ssl object.
  // Centralize TLS here so URL parameters cannot disable certificate verification.
  for (const key of ['ssl', 'sslmode', 'sslrootcert', 'sslcert', 'sslkey', 'uselibpqcompat', 'options'])
    url.searchParams.delete(key);
  return {
    connectionString: url.toString(), max: env.DATABASE_POOL_MAX,
    connectionTimeoutMillis: 10000, idleTimeoutMillis: 30000,
    options: '-c search_path=agora',
    ssl: env.DATABASE_SSL === 'true' ? {
      rejectUnauthorized: true,
      ...(env.DATABASE_SSL_CA?.trim() ? { ca: env.DATABASE_SSL_CA.replace(/\\n/g, '\n') } : {})
    } : false
  };
}

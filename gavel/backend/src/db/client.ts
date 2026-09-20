import Database from 'better-sqlite3';
import { SQLiteSyncDialect } from 'drizzle-orm/sqlite-core';
import { drizzle as sqliteDrizzle } from 'drizzle-orm/better-sqlite3';
import { drizzle as pgDrizzle } from 'drizzle-orm/node-postgres';
import { sql, type SQL } from 'drizzle-orm';
import pg from 'pg';
import { mkdirSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { env, projectRoot } from '../config/env.js';
export type Query = <T extends object>(statement: SQL) => Promise<T[]>;
const isPostgres = env.DATABASE_URL.startsWith('postgres');
const pool = isPostgres ? new pg.Pool({ connectionString: env.DATABASE_URL }) : null;
const sqlitePath = resolve(projectRoot, env.DATABASE_URL.replace(/^file:/, ''));
if (!isPostgres) mkdirSync(dirname(sqlitePath), { recursive: true });
const sqlite = isPostgres ? null : new Database(sqlitePath);
sqlite?.pragma('journal_mode = WAL');
sqlite?.pragma('foreign_keys = ON');
const local = sqlite ? sqliteDrizzle(sqlite) : null;
const remote = pool ? pgDrizzle(pool) : null;
export const query: Query = async <T extends object>(statement: SQL): Promise<T[]> => {
  if (local) { const compiled = new SQLiteSyncDialect().sqlToQuery(statement); if (sqlite!.prepare(compiled.sql).reader) return local.all(statement) as T[]; local.run(statement); return []; }
  if (remote) return (await remote.execute(statement)).rows as T[];
  throw new Error('Database is unavailable.');
};
let pending: Promise<unknown> = Promise.resolve();
export function transaction<T>(action: (execute: Query) => Promise<T>): Promise<T> {
  const task = pending.then(async () => {
    const connection = pool ? await pool.connect() : null;
    const db = connection ? pgDrizzle(connection) : null;
    const execute: Query = db ? async <R extends object>(s: SQL) => (await db.execute(s)).rows as R[] : query;
    try {
      if (connection) await connection.query('BEGIN'); else sqlite!.exec('BEGIN IMMEDIATE');
      const result = await action(execute);
      if (connection) await connection.query('COMMIT'); else sqlite!.exec('COMMIT');
      return result;
    } catch (error) {
      if (connection) await connection.query('ROLLBACK'); else sqlite!.exec('ROLLBACK');
      throw error;
    } finally { connection?.release(); }
  });
  pending = task.catch(() => undefined);
  return task;
}
export async function migrate() {
  const migration = readFileSync(resolve(projectRoot, 'backend/src/db/migrations/0001_initial.sql'), 'utf8');
  await transaction(async execute => {
    for (const statement of migration.split(';').filter(value => value.trim())) await execute(sql.raw(statement));
  });
}
export async function closeDb() { await pending; sqlite?.close(); await pool?.end(); }

import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { sql } from 'drizzle-orm';
import { query, transaction } from '../../db/client.js';
import { AppError } from '../../lib/errors.js';
interface Access { id: string; session_id: string; name: string; token_hash: string; created_at: string; expires_at: string; revoked_at: string | null; }
const hash = (token: string) => createHash('sha256').update(token).digest('hex');
export async function authenticate(header: string | undefined) {
  if (!header || !/^Bearer agora_[a-f0-9]{64}$/.test(header))
    throw new AppError(401, 'access_required', 'A valid Agora access token is required.');
  const tokenHash = hash(header.slice(7));
  const row = (await query<Access>(sql`SELECT * FROM agent_access WHERE token_hash=${tokenHash}`))[0];
  if (!row) throw new AppError(401, 'access_invalid', 'The Agora access token is invalid.');
  if (row.revoked_at) throw new AppError(401, 'access_revoked', 'The Agora access token was revoked.');
  if (Date.parse(row.expires_at) <= Date.now()) throw new AppError(401, 'access_expired', 'The Agora access token expired.');
  return row.session_id;
}
export async function listAccess(session: string) {
  const rows = await query<Access>(sql`SELECT * FROM agent_access WHERE session_id=${session} ORDER BY created_at DESC`);
  return rows.map(r => ({ id: r.id, name: r.name, createdAt: r.created_at, expiresAt: r.expires_at, revokedAt: r.revoked_at }));
}
export async function issue(session: string, name: string) {
  return transaction(async execute => {
    const now = new Date().toISOString();
    const active = await execute<Access>(sql`SELECT id FROM agent_access WHERE session_id=${session} AND revoked_at IS NULL AND expires_at>${now}`);
    if (active.length >= 5) throw new AppError(409, 'access_limit', 'Revoke an access token before creating another. The limit is five active tokens.');
    const token = 'agora_' + randomBytes(32).toString('hex'), id = randomUUID();
    const expiresAt = new Date(Date.now() + 30 * 86400000).toISOString();
    await execute(sql`INSERT INTO agent_access (id,session_id,name,token_hash,created_at,expires_at)
      VALUES (${id},${session},${name},${hash(token)},${now},${expiresAt})`);
    return { id, token, expiresAt };
  });
}
export async function revoke(session: string, id: string) {
  return transaction(async execute => {
    const own = await execute<Access>(sql`SELECT id FROM agent_access WHERE id=${id} AND session_id=${session}`);
    if (!own.length) throw new AppError(404, 'access_not_found', 'Access token not found.');
    await execute(sql`UPDATE agent_access SET revoked_at=${new Date().toISOString()} WHERE id=${id} AND revoked_at IS NULL`);
    return { revoked: true };
  });
}

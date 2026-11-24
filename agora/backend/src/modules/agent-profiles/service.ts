import { randomUUID } from 'node:crypto';
import { sql } from 'drizzle-orm';
import { query, transaction, type Query } from '../../db/client.js';
import { requireAccount } from '../auth/service.js';
import { seal, unseal } from '../../lib/crypto.js';
import { AppError } from '../../lib/errors.js';
import type { AgentProfile, ParticipantInput } from '../../../../shared/src/types.js';

interface ProfileRecord {
  id: string; user_id: string; name: string; model: string; strategy: string;
  latch_token: string; created_at: string; updated_at: string;
}
function publicProfile(row: ProfileRecord): AgentProfile {
  return { id: row.id, name: row.name, model: row.model, strategy: unseal(row.strategy),
    createdAt: row.created_at, updatedAt: row.updated_at };
}
async function owned(id: string, userId: string, execute: Query = query) {
  const row = (await execute<ProfileRecord>(sql`SELECT * FROM agent_profiles WHERE id=${id} AND user_id=${userId}`))[0];
  if (!row) throw new AppError(404, 'agent_profile_not_found', 'This saved agent could not be found. Choose another agent.');
  return row;
}
export async function list(session: string) {
  const account = await requireAccount(session);
  const rows = await query<ProfileRecord>(sql`SELECT * FROM agent_profiles WHERE user_id=${account.id} ORDER BY created_at DESC,id DESC`);
  return rows.map(publicProfile);
}
export async function save(session: string, input: Omit<ParticipantInput, 'latchToken'> & { latchToken?: string }, id?: string) {
  const account = await requireAccount(session);
  return transaction(async execute => {
    const now = new Date().toISOString();
    if (id) {
      // Serialize edits/deletion before reading the retained credential.
      await execute(sql`UPDATE agent_profiles SET updated_at=updated_at WHERE id=${id} AND user_id=${account.id}`);
      const previous = await owned(id, account.id, execute);
      await execute(sql`UPDATE agent_profiles SET name=${input.name},model=${input.model},
        strategy=${seal(input.strategy)},latch_token=${input.latchToken ? seal(input.latchToken) : previous.latch_token},
        updated_at=${now} WHERE id=${id} AND user_id=${account.id}`);
      return publicProfile(await owned(id, account.id, execute));
    }
    if (!input.latchToken) throw new AppError(400, 'latch_token_required', 'A Latch token is required to save a new agent.');
    const profileId = randomUUID();
    await execute(sql`INSERT INTO agent_profiles (id,user_id,name,model,strategy,latch_token,created_at,updated_at)
      VALUES (${profileId},${account.id},${input.name},${input.model},${seal(input.strategy)},${seal(input.latchToken)},${now},${now})`);
    return publicProfile(await owned(profileId, account.id, execute));
  });
}
export async function remove(session: string, id: string) {
  const account = await requireAccount(session);
  await query(sql`DELETE FROM agent_profiles WHERE id=${id} AND user_id=${account.id}`);
  return { removed: true };
}
export async function participantFromProfile(id: string, session: string): Promise<ParticipantInput> {
  const account = await requireAccount(session);
  const row = await owned(id, account.id);
  return { name: row.name, model: row.model, strategy: unseal(row.strategy), latchToken: unseal(row.latch_token) };
}

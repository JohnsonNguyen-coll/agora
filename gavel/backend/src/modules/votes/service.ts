import { randomUUID } from 'node:crypto';
import { sql } from 'drizzle-orm';
import { transaction } from '../../db/client.js';
import { AppError } from '../../lib/errors.js';
import { append } from '../audit/service.js';
import { findRoom } from '../rooms/service.js';
import type { Side } from '../../../../shared/src/types.js';
export async function vote(id: string, session: string, side: Side) {
  await transaction(async execute => {
    const room = await findRoom(id, execute);
    if (room.status !== 'voting' || !room.voting_ends_at || Date.parse(room.voting_ends_at) <= Date.now())
      throw new AppError(409, 'voting_closed', 'Voting is not open for this match.');
    const previous = await execute<{ id: string }>(sql`SELECT id FROM votes WHERE room_id=${id} AND session_id=${session}`);
    if (previous.length) throw new AppError(409, 'already_voted', 'You have already voted in this room.');
    await execute(sql`INSERT INTO votes (id,room_id,session_id,side,created_at)
      VALUES (${randomUUID()},${id},${session},${side},${new Date().toISOString()})`);
    await append(execute, id, 'vote.cast', { side });
  });
}

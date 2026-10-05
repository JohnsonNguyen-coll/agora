import { requireAccount } from '../auth/service.js';
import { randomUUID } from 'node:crypto';
import { sql } from 'drizzle-orm';
import { transaction } from '../../db/client.js';
import { AppError } from '../../lib/errors.js';
import { append } from '../audit/service.js';
import { findRoom, roomAgents } from '../rooms/service.js';
import type { Side } from '../../../../shared/src/types.js';
export async function vote(id: string, session: string, side: Side) {
  const account = await requireAccount(session);
  await transaction(async execute => {
    await execute(sql`UPDATE rooms SET status=status WHERE id=${id}`);
    const room = await findRoom(id, execute);
    if (room.status !== 'voting' || !room.voting_ends_at || Date.parse(room.voting_ends_at) <= Date.now())
      throw new AppError(409, 'voting_closed', 'Voting is not open for this match.');
    if (!room.starts_at || Date.parse(account.created_at) >= Date.parse(room.starts_at))
      throw new AppError(403, 'account_too_new', 'Your account must have been created before this match began to cast an audience vote.');
    if ((await roomAgents(id, execute)).some(a => a.session_id === session))
      throw new AppError(403, 'participant_vote', 'Match participants cannot cast an audience vote.');
    const tournamentEntry = await execute(sql`SELECT e.id FROM tournament_matches m JOIN tournament_entries e ON e.tournament_id=m.tournament_id WHERE m.room_id=${id} AND e.session_id=${session}`);
    if (tournamentEntry.length) throw new AppError(403, 'tournament_entrant_vote', 'Tournament entrants cannot cast audience votes in their tournament.');
    const previous = await execute<{ id: string }>(sql`SELECT id FROM votes WHERE room_id=${id} AND session_id=${session}`);
    if (previous.length) throw new AppError(409, 'already_voted', 'You have already voted in this room.');
    const voteId = randomUUID();
    await execute(sql`INSERT INTO votes (id,room_id,session_id,side,created_at)
      VALUES (${voteId},${id},${session},${side},${new Date().toISOString()})`);
    await execute(sql`INSERT INTO verified_votes (vote_id,user_id) VALUES (${voteId},${account.id})`);
    await append(execute, id, 'vote.cast', { side, eligibility: 'verified-account-before-match' });
  });
}

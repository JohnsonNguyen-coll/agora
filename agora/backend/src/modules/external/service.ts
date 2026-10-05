import { assertTournamentReady } from '../tournaments/service.js';
import { enqueueJudge } from '../judging/service.js';
import { randomUUID } from 'node:crypto';
import { sql } from 'drizzle-orm';
import { z } from 'zod';
import { transaction, type Query } from '../../db/client.js';
import { AppError } from '../../lib/errors.js';
import { append } from '../audit/service.js';
import { findRoom, roomAgents } from '../rooms/service.js';
import { settleRoom } from './lifecycle.js';
import { externalCreate, externalParticipant, submission } from './schema.js';
import type { Side } from '../../../../shared/src/types.js';
import type { TurnRecord } from '../../db/records.js';
async function add(execute: Query, id: string, session: string, side: Side, input: z.infer<typeof externalParticipant>) {
  await execute(sql`INSERT INTO external_agents (id,room_id,session_id,side,name,model)
    VALUES (${randomUUID()},${id},${session},${side},${input.name},${input.model})`);
  await append(execute, id, 'agent.joined', { side, name: input.name, model: input.model, mode: 'external', modelVerified: false });
}
export async function create(input: z.infer<typeof externalCreate>, session: string) {
  return transaction(async execute => {
    const active = await execute(sql`SELECT a.id FROM external_agents a JOIN rooms r ON r.id=a.room_id
      WHERE a.session_id=${session} AND r.status IN ('waiting','live')`);
    if (active.length >= 5) throw new AppError(409, 'room_limit', 'You already have five open external rooms.');
    const id = randomUUID();
    await execute(sql`INSERT INTO rooms (id,topic,duration_minutes,status,created_at)
      VALUES (${id},${input.topic},${input.durationMinutes},'waiting',${new Date().toISOString()})`);
    await execute(sql`INSERT INTO external_rooms (room_id) VALUES (${id})`);
    await execute(sql`INSERT INTO room_vote_rules (room_id,version) VALUES (${id},'verified-account-v1') ON CONFLICT(room_id) DO NOTHING`);
    await append(execute, id, 'room.created', { topic: input.topic, durationMinutes: input.durationMinutes, mode: 'external' });
    await add(execute, id, session, input.side, input);
    return id;
  });
}
export async function join(id: string, session: string, input: z.infer<typeof externalParticipant>) {
  await transaction(async execute => {
    const room = await settleRoom(id, execute), agents = await roomAgents(id, execute);
    if (room.mode !== 'external') throw new AppError(409, 'wrong_mode', 'This room requires a Latch-hosted agent.');
    if (room.status !== 'waiting') throw new AppError(409, 'room_locked', 'The match is no longer accepting agents.');
    if (agents.some(a => a.session_id === session)) throw new AppError(409, 'already_joined', 'You already occupy a side.');
    if (agents.length >= 2) throw new AppError(409, 'room_full', 'Both seats have been taken.');
    await add(execute, id, session, agents.some(a => a.side === 'FOR') ? 'AGAINST' : 'FOR', input);
  });
}
export async function ready(id: string, session: string) {
  await transaction(async execute => {
    const room = await settleRoom(id, execute), agents = await roomAgents(id, execute);
    if (room.mode !== 'external') throw new AppError(409, 'wrong_mode', 'MCP cannot start Latch-hosted matches.');
    await assertTournamentReady(id, execute);
    const me = agents.find(a => a.session_id === session);
    if (!me) throw new AppError(403, 'spectator', 'Only a participant can ready up.');
    if (room.status !== 'waiting') throw new AppError(409, 'room_locked', 'The match has already started.');
    if (!me.ready) {
      await execute(sql`UPDATE external_agents SET ready=1 WHERE id=${me.id}`);
      await append(execute, id, 'agent.ready', { side: me.side });
      me.ready = 1;
    }
    if (agents.length === 2 && agents.every(a => a.ready)) {
      const startsAt = new Date().toISOString(), endsAt = new Date(Date.now() + room.duration_minutes * 60000).toISOString();
      await execute(sql`UPDATE rooms SET status='live',starts_at=${startsAt},ends_at=${endsAt} WHERE id=${id}`);
      await enqueueJudge(id, execute);
      await append(execute, id, 'match.started', { mode: 'external', startsAt, endsAt, firstSide: 'FOR' });
    }
  });
}
export async function submit(id: string, session: string, input: z.infer<typeof submission>) {
  // Settle first, so rejecting an expired submission does not roll back the deadline transition.
  await transaction(execute => settleRoom(id, execute));
  return transaction(async execute => {
    await execute(sql`UPDATE rooms SET status=status WHERE id=${id}`);
    const room = await findRoom(id, execute), agents = await roomAgents(id, execute);
    if (room.mode !== 'external') throw new AppError(409, 'wrong_mode', 'Only external rooms accept submitted arguments.');
    const me = agents.find(a => a.session_id === session);
    if (!me) throw new AppError(403, 'spectator', 'Only a participant can submit an argument.');
    const previous = (await execute<TurnRecord>(sql`SELECT t.* FROM turns t JOIN external_submissions s ON s.turn_id=t.id
      WHERE s.room_id=${id} AND s.agent_id=${me.id} AND s.id=${input.submissionId}`))[0];
    if (previous) {
      if (previous.content !== input.content || previous.turn_index !== input.expectedTurnIndex)
        throw new AppError(409, 'submission_conflict', 'This submission ID was already used for a different argument.');
      return { turnId: previous.id, turnIndex: previous.turn_index, replayed: true };
    }
    await assertTournamentReady(id, execute);
    if (room.status !== 'live' || !room.ends_at || Date.parse(room.ends_at) <= Date.now())
      throw new AppError(409, 'match_not_live', 'The match is not accepting arguments.');
    const turns = await execute<TurnRecord>(sql`SELECT * FROM turns WHERE room_id=${id} ORDER BY turn_index DESC`);
    const next = (turns[0]?.turn_index ?? -1) + 1, side = next % 2 === 0 ? 'FOR' : 'AGAINST';
    if (input.expectedTurnIndex !== next || me.side !== side)
      throw new AppError(409, 'wrong_turn', 'Read the room again and wait for your turn.', { nextTurnIndex: next, nextSide: side });
    const last = turns.find(t => t.side === me.side);
    if (last && Date.parse(last.completed_at!) + 30000 > Date.now())
      throw new AppError(429, 'turn_cooldown', 'Wait 30 seconds between your submissions.',
        { retryAt: new Date(Date.parse(last.completed_at!) + 30000).toISOString() });
    const turnId = randomUUID(), now = new Date().toISOString();
    await execute(sql`INSERT INTO turns (id,room_id,side,turn_index,content,tokens_used,started_at,completed_at,status)
      VALUES (${turnId},${id},${me.side},${next},${input.content},NULL,${now},${now},'completed')`);
    await execute(sql`INSERT INTO external_submissions (id,room_id,agent_id,turn_id)
      VALUES (${input.submissionId},${id},${me.id},${turnId})`);
    await execute(sql`UPDATE tournament_match_pauses SET turn_extension_ms=0 WHERE match_id IN (SELECT id FROM tournament_matches WHERE room_id=${id})`);
    await append(execute, id, 'turn.completed', { turnId, turnIndex: next, side: me.side, mode: 'external', usage: null });
    return { turnId, turnIndex: next, replayed: false };
  });
}

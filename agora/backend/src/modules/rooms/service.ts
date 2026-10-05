import { control, turnDeadline } from '../tournaments/deadlines.js';
import { tallyVotes } from '../votes/tally.js';
import { finalVerdict } from '../../../../shared/src/judging.js';
import { getJudgement } from '../judging/service.js';
import { randomUUID } from 'node:crypto';
import { sql } from 'drizzle-orm';
import { query, transaction, type Query } from '../../db/client.js';
import type { AgentRecord, RoomRecord, TurnRecord } from '../../db/records.js';
import { seal } from '../../lib/crypto.js';
import { AppError } from '../../lib/errors.js';
import { append } from '../audit/service.js';
import type { Agent, CreateRoomInput, ParticipantInput, Room, RoomSummary, Side } from '../../../../shared/src/types.js';
const safeAgent = (a: AgentRecord): Agent => ({ id: a.id, name: a.name, model: a.model, side: a.side,
  ready: Boolean(a.ready), status: a.status, latchId: a.latch_id });
export async function findRoom(id: string, execute: Query = query) {
  const room = (await execute<RoomRecord>(sql`SELECT r.*, CASE WHEN e.room_id IS NULL THEN 'latch' ELSE 'external' END AS mode FROM rooms r LEFT JOIN external_rooms e ON e.room_id=r.id WHERE r.id=${id}`))[0];
  if (!room) throw new AppError(404, 'room_not_found', 'This room could not be found.');
  return room;
}
export async function roomAgents(id: string, execute: Query = query) {
  return execute<AgentRecord>(sql`SELECT * FROM agents WHERE room_id=${id} UNION ALL SELECT id,room_id,session_id,side,name,model,NULL AS strategy,NULL AS latch_token,NULL AS latch_id,ready,status FROM external_agents WHERE room_id=${id} ORDER BY side DESC`);
}
function summary(row: RoomRecord, agents: AgentRecord[], turns: number): RoomSummary {
  return { id: row.id, mode: row.mode, topic: row.topic, status: row.status, durationMinutes: row.duration_minutes,
    createdAt: row.created_at, startsAt: row.starts_at, endsAt: row.ends_at, agents: agents.map(safeAgent), turns };
}
export async function listRooms() {
  const rows = await query<RoomRecord>(sql`SELECT r.*, CASE WHEN e.room_id IS NULL THEN 'latch' ELSE 'external' END AS mode FROM rooms r LEFT JOIN external_rooms e ON e.room_id=r.id ORDER BY r.created_at DESC LIMIT 100`);
  return Promise.all(rows.map(async row => {
    const count = (await query<{ count: number | string }>(sql`SELECT COUNT(*) AS count FROM turns WHERE room_id=${row.id}`))[0];
    return summary(row, await roomAgents(row.id), Number(count?.count ?? 0));
  }));
}
export async function detail(id: string, session: string): Promise<Room> {
  const row = await findRoom(id), agents = await roomAgents(id);
  const transcript = await query<TurnRecord>(sql`SELECT * FROM turns WHERE room_id=${id} ORDER BY turn_index`);
  const mine = (await query<{ side: Side }>(sql`SELECT side FROM votes WHERE room_id=${id} AND session_id=${session}`))[0];
  const tournamentMatch = (await query<{ id: string; title: string; round_index: number; attempt: number }>(sql`SELECT t.id,t.title,m.round_index,m.attempt FROM tournament_matches m JOIN tournaments t ON t.id=m.tournament_id WHERE m.room_id=${id}`))[0];
  const tournamentEntrant = tournamentMatch ? (await query(sql`SELECT id FROM tournament_entries WHERE tournament_id=${tournamentMatch.id} AND session_id=${session}`)).length > 0 : false;
  const tournament = tournamentMatch ? { id: tournamentMatch.id, title: tournamentMatch.title, round: tournamentMatch.round_index, attempt: tournamentMatch.attempt, isEntrant: tournamentEntrant } : null;
  const deadlines = await control(id, query);
  const due = deadlines && !deadlines.paused_at && deadlines.tournament_status==='active' && row.status === 'live' ? await turnDeadline(row, deadlines.turn_seconds, query, deadlines.turn_extension_ms) : null;
  const tournamentControl = deadlines ? { paused: Boolean(deadlines.paused_at) || deadlines.tournament_status==='blocked', readyDeadline: deadlines.ready_deadline, turnDeadline: due?.at ?? null, nextSide: due?.side ?? null, outcome: deadlines.outcome, reason: deadlines.reason } : null;
  const judgement = await getJudgement(id);
  const tallies = await tallyVotes(id);
  const votingRule = (await query(sql`SELECT version FROM room_vote_rules WHERE room_id=${id}`)).length ? 'verified-account-v1' : 'legacy-session';
  return { tournamentControl, votingRule, tournament, judgement, verdict: row.status === 'closed' ? finalVerdict(tallies, judgement) : null, ...summary(row, agents, transcript.length), nextTurnIndex: transcript.length, nextSide: row.mode === 'external' && row.status === 'live' ? (transcript.length % 2 === 0 ? 'FOR' : 'AGAINST') : null, mySide: agents.find(a => a.session_id === session)?.side ?? null,
    myVote: mine?.side ?? null, votingEndsAt: row.voting_ends_at, endReason: row.end_reason,
    votes: tallies,
    transcript: transcript.map(t => ({ id: t.id, roomId: t.room_id, side: t.side, turnIndex: t.turn_index,
      content: t.content, tokensUsed: t.tokens_used, startedAt: t.started_at, completedAt: t.completed_at, status: t.status })) };
}
async function addAgent(execute: Query, roomId: string, session: string, side: Side, input: ParticipantInput) {
  await execute(sql`INSERT INTO agents (id,room_id,session_id,side,name,model,strategy,latch_token)
    VALUES (${randomUUID()},${roomId},${session},${side},${input.name},${input.model},${seal(input.strategy)},${seal(input.latchToken)})`);
  await append(execute, roomId, 'agent.joined', { side, name: input.name, model: input.model });
}
export async function create(input: CreateRoomInput, session: string) {
  return transaction(async execute => {
    const existing = await execute<{ id: string }>(sql`SELECT a.id FROM agents a JOIN rooms r ON r.id=a.room_id
      WHERE a.session_id=${session} AND r.status IN ('waiting','live')`);
    if (existing.length >= 5) throw new AppError(409, 'room_limit', 'You already have five open rooms.');
    const id = randomUUID(), now = new Date().toISOString();
    await execute(sql`INSERT INTO rooms (id,topic,duration_minutes,status,created_at)
      VALUES (${id},${input.topic},${input.durationMinutes},'waiting',${now})`);
    await execute(sql`INSERT INTO room_vote_rules (room_id,version) VALUES (${id},'verified-account-v1') ON CONFLICT(room_id) DO NOTHING`);
    await append(execute, id, 'room.created', { topic: input.topic, durationMinutes: input.durationMinutes });
    await addAgent(execute, id, session, input.side, input);
    return id;
  });
}
export async function join(id: string, session: string, input: ParticipantInput) {
  await transaction(async execute => {
    const room = await findRoom(id, execute), agents = await roomAgents(id, execute);
    if (room.mode !== 'latch') throw new AppError(409, 'wrong_mode', 'Join this external room through MCP.');
    if (room.status !== 'waiting') throw new AppError(409, 'room_locked', 'This match is no longer accepting players.');
    if (agents.some(a => a.session_id === session)) throw new AppError(409, 'already_joined', 'You already occupy a side in this room.');
    if (agents.length >= 2) throw new AppError(409, 'room_full', 'Both sides have been taken.');
    const side = agents.some(a => a.side === 'FOR') ? 'AGAINST' : 'FOR';
    await addAgent(execute, id, session, side, input);
  });
}
export async function ready(id: string, session: string) {
  await transaction(async execute => {
    const room = await findRoom(id, execute);
    if (room.status !== 'waiting') throw new AppError(409, 'room_locked', 'The match has already started.');
    const agent = (await roomAgents(id, execute)).find(a => a.session_id === session);
    if (!agent) throw new AppError(403, 'spectator', 'Only a participant can ready up.');
    if (agent.ready) return;
    await execute(sql`UPDATE agents SET ready=1 WHERE id=${agent.id}`);
    await append(execute, id, 'agent.ready', { side: agent.side });
  });
}

import { tallyVotes } from '../votes/tally.js';
import { createHash, randomInt, randomUUID } from 'node:crypto';
import { sql } from 'drizzle-orm';
import { z } from 'zod';
import { query, transaction, type Query } from '../../db/client.js';
import { env } from '../../config/env.js';
import { AppError } from '../../lib/errors.js';
import { append } from '../audit/service.js';
import { judgeAvailability } from '../judging/availability.js';
import { judgeSystem, rubricVersion } from '../judging/rubric.js';
import { finalVerdict, type Judgement, type JudgePass } from '../../../../shared/src/judging.js';
import type { Side } from '../../../../shared/src/types.js';
import type { Tournament, TournamentSummary } from '../../../../shared/src/tournaments.js';
import { tournamentInput } from './schema.js';
import { externalParticipant } from '../external/schema.js';
interface Row { id: string; owner_session: string; title: string; topic: string; capacity: 4 | 8; duration_minutes: number;
  status: Tournament['status']; created_at: string; started_at: string | null; completed_at: string | null;
  champion_id: string | null; blocked_reason: string | null; rules_version: string; }
interface Entry { id: string; tournament_id: string; session_id: string; name: string; model: string; registered_at: string; seed: number | null; }
interface Match { id: string; tournament_id: string; round_index: number; match_index: number; attempt: number;
  room_id: string; for_entry: string; against_entry: string; winner_entry: string | null; resolved_at: string | null;
  room_status: 'waiting' | 'live' | 'voting' | 'closed'; judge_status: string | null; }
const rulesVersion = 'agora-knockout-v2';
const rubricHash = () => createHash('sha256').update(judgeSystem).digest('hex');
async function find(id: string, execute: Query = query) {
  const row = (await execute<Row>(sql`SELECT * FROM tournaments WHERE id=${id}`))[0];
  if (!row) throw new AppError(404, 'tournament_not_found', 'This tournament could not be found.');
  return row;
}
async function lock(id: string, execute: Query) { await execute(sql`UPDATE tournaments SET status=status WHERE id=${id}`); return find(id, execute); }
async function event(execute: Query, id: string, type: string, payload: unknown) {
  const previous = (await execute<{ sequence: number }>(sql`SELECT sequence FROM tournament_events WHERE tournament_id=${id} ORDER BY sequence DESC LIMIT 1`))[0];
  await execute(sql`INSERT INTO tournament_events (id,tournament_id,sequence,type,payload_json,created_at)
    VALUES (${randomUUID()},${id},${(previous?.sequence ?? 0) + 1},${type},${JSON.stringify(payload)},${new Date().toISOString()})`);
}
const summary = (row: Row, registered: number): TournamentSummary => ({ id: row.id, title: row.title, topic: row.topic,
  capacity: row.capacity, durationMinutes: row.duration_minutes, status: row.status, createdAt: row.created_at, registered });
export async function list() {
  const rows = await query<Row & { registered: number | string }>(sql`SELECT t.*, (SELECT COUNT(*) FROM tournament_entries e WHERE e.tournament_id=t.id) AS registered FROM tournaments t ORDER BY created_at DESC LIMIT 100`);
  return rows.map(r => summary(r, Number(r.registered)));
}
export async function detail(id: string, session: string): Promise<Tournament> {
  const row = await find(id);
  const entries = await query<Entry>(sql`SELECT * FROM tournament_entries WHERE tournament_id=${id} ORDER BY seed,registered_at,id`);
  const matches = await query<Match>(sql`SELECT m.*,r.status AS room_status,j.status AS judge_status FROM tournament_matches m JOIN rooms r ON r.id=m.room_id LEFT JOIN judgements j ON j.room_id=r.id WHERE tournament_id=${id} ORDER BY round_index,match_index,attempt`);
  const events = await query<{ id: string; sequence: number; type: string; payload_json: string; created_at: string }>(sql`SELECT * FROM tournament_events WHERE tournament_id=${id} ORDER BY sequence`);
  const judgingReason = judgeAvailability();
  const policy = (await query<{ ready_seconds: number; turn_seconds: number }>(sql`SELECT * FROM tournament_policies WHERE tournament_id=${id}`))[0];
  const controls = await query<{ match_id: string; ready_deadline: string; outcome: string | null; reason: string | null; judge_retries: number }>(sql`SELECT c.* FROM tournament_match_controls c JOIN tournament_matches m ON m.id=c.match_id WHERE m.tournament_id=${id}`);
  const consents = await query<{ match_id: string; entry_id: string }>(sql`SELECT c.* FROM tournament_rematch_consents c JOIN tournament_matches m ON m.id=c.match_id WHERE m.tournament_id=${id}`);
  return { policy: policy ? { readySeconds: policy.ready_seconds, turnSeconds: policy.turn_seconds, maxJudgeRetries: 1, maxAttempts: 2 } : null, judgingAvailable: !judgingReason, judgingReason, ...summary(row, entries.length), isOwner: row.owner_session === session, myEntry: entries.find(e => e.session_id === session)?.id ?? null,
    startedAt: row.started_at, completedAt: row.completed_at, championId: row.champion_id, blockedReason: row.blocked_reason, rulesVersion: row.rules_version,
    entries: entries.map(e => ({ id: e.id, name: e.name, model: e.model, registeredAt: e.registered_at, seed: e.seed })),
    matches: matches.map(m => ({ id: m.id, round: m.round_index, position: m.match_index, attempt: m.attempt, roomId: m.room_id,
      forEntry: m.for_entry, againstEntry: m.against_entry, winnerEntry: m.winner_entry, roomStatus: m.room_status, judgeStatus: m.judge_status, recovery: (() => { const c=controls.find(c=>c.match_id===m.id); return c ? { readyDeadline: c.ready_deadline, outcome: c.outcome, reason: c.reason, judgeRetries: c.judge_retries, rematchConsents: consents.filter(a=>a.match_id===m.id).map(a=>a.entry_id) } : null; })() })),
    events: events.map(e => ({ id: e.id, sequence: e.sequence, type: e.type, payload: JSON.parse(e.payload_json) as unknown, createdAt: e.created_at })) };
}
export async function create(input: z.infer<typeof tournamentInput>, session: string) {
  return transaction(async execute => {
    const active = await execute(sql`SELECT id FROM tournaments WHERE owner_session=${session} AND status IN ('registration','active','blocked')`);
    if (active.length >= 3) throw new AppError(409, 'tournament_limit', 'You already have three open tournaments.');
    const id = randomUUID();
    await execute(sql`INSERT INTO tournaments (id,owner_session,title,topic,capacity,duration_minutes,created_at,rules_version)
      VALUES (${id},${session},${input.title},${input.topic},${input.capacity},${input.durationMinutes},${new Date().toISOString()},${rulesVersion})`);
    await execute(sql`INSERT INTO tournament_policies (tournament_id,ready_seconds,turn_seconds) VALUES (${id},300,45)`);
    await event(execute, id, 'tournament.created', { ...input, readySeconds: 300, turnSeconds: 45, maxJudgeRetries: 1, maxAttempts: 2 });
    return id;
  });
}
export async function register(id: string, session: string, input: z.infer<typeof externalParticipant>) {
  await transaction(async execute => {
    const row = await lock(id, execute);
    if (row.status !== 'registration') throw new AppError(409, 'registration_closed', 'Tournament registration is closed.');
    const entries = await execute<Entry>(sql`SELECT * FROM tournament_entries WHERE tournament_id=${id}`);
    if (entries.some(e => e.session_id === session)) throw new AppError(409, 'already_registered', 'Your account already has an agent in this tournament.');
    if (entries.length >= row.capacity) throw new AppError(409, 'tournament_full', 'All tournament places are taken.');
    const active = await execute(sql`SELECT e.id FROM tournament_entries e JOIN tournaments t ON t.id=e.tournament_id WHERE e.session_id=${session} AND t.status IN ('registration','active','blocked')`);
    if (active.length >= 3) throw new AppError(409, 'entry_limit', 'Your account already participates in three open tournaments.');
    const entryId = randomUUID();
    await execute(sql`INSERT INTO tournament_entries (id,tournament_id,session_id,name,model,registered_at)
      VALUES (${entryId},${id},${session},${input.name},${input.model},${new Date().toISOString()})`);
    await event(execute, id, 'entry.registered', { entryId, ...input });
  });
}
export async function withdraw(id: string, session: string) {
  await transaction(async execute => {
    const row = await lock(id, execute);
    if (row.status !== 'registration') throw new AppError(409, 'registration_closed', 'Withdrawal is only available before the bracket is drawn.');
    const entry = (await execute<Entry>(sql`SELECT * FROM tournament_entries WHERE tournament_id=${id} AND session_id=${session}`))[0];
    if (!entry) throw new AppError(404, 'entry_not_found', 'You have no entry in this tournament.');
    await execute(sql`DELETE FROM tournament_entries WHERE id=${entry.id}`);
    await event(execute, id, 'entry.withdrawn', { entryId: entry.id });
  });
}
async function newMatch(execute: Query, tournament: Row, round: number, position: number, players: [Entry, Entry], attempt = 1, swap = false) {
  const [a,b] = players, forPlayer = swap ? b : a, againstPlayer = swap ? a : b, roomId = randomUUID(), matchId = randomUUID();
  await execute(sql`INSERT INTO rooms (id,topic,duration_minutes,status,created_at) VALUES (${roomId},${tournament.topic},${tournament.duration_minutes},'waiting',${new Date().toISOString()})`);
  await execute(sql`INSERT INTO room_vote_rules (room_id,version) VALUES (${roomId},'verified-account-v1') ON CONFLICT(room_id) DO NOTHING`);
  await execute(sql`INSERT INTO external_rooms (room_id) VALUES (${roomId})`);
  await append(execute, roomId, 'room.created', { topic: tournament.topic, durationMinutes: tournament.duration_minutes, mode: 'external', tournamentId: tournament.id, round, position, attempt });
  for (const [entry, side] of [[forPlayer, 'FOR'], [againstPlayer, 'AGAINST']] as const) {
    await execute(sql`INSERT INTO external_agents (id,room_id,session_id,side,name,model) VALUES (${randomUUID()},${roomId},${entry.session_id},${side},${entry.name},${entry.model})`);
    await append(execute, roomId, 'agent.joined', { side, name: entry.name, model: entry.model, mode: 'external', modelVerified: false, entryId: entry.id });
  }
  await execute(sql`INSERT INTO tournament_matches (id,tournament_id,round_index,match_index,attempt,room_id,for_entry,against_entry)
    VALUES (${matchId},${tournament.id},${round},${position},${attempt},${roomId},${forPlayer.id},${againstPlayer.id})`);
  const policy = (await execute<{ ready_seconds: number }>(sql`SELECT ready_seconds FROM tournament_policies WHERE tournament_id=${tournament.id}`))[0];
  if (policy) await execute(sql`INSERT INTO tournament_match_controls (match_id,ready_deadline) VALUES (${matchId},${new Date(Date.now()+policy.ready_seconds*1000).toISOString()})`);
  await event(execute, tournament.id, attempt === 1 ? 'match.created' : 'match.rematch', { matchId, roomId, round, position, attempt, forEntry: forPlayer.id, againstEntry: againstPlayer.id });
}
export async function start(id: string, session: string) {
  await transaction(async execute => {
    const row = await lock(id, execute);
    if (row.owner_session !== session) throw new AppError(403, 'organizer_required', 'Only the organizer can draw and start this tournament.');
    if (row.status !== 'registration') throw new AppError(409, 'tournament_started', 'This tournament is no longer accepting a bracket draw.');
    const unavailable = judgeAvailability();
    if (unavailable) throw new AppError(503, 'judge_unavailable', unavailable);
    const entries = await execute<Entry>(sql`SELECT * FROM tournament_entries WHERE tournament_id=${id} ORDER BY registered_at,id`);
    if (entries.length !== row.capacity) throw new AppError(409, 'incomplete_field', 'Fill every tournament place before drawing the bracket.');
    for (let i = entries.length - 1; i > 0; i--) { const j = randomInt(i + 1); [entries[i], entries[j]] = [entries[j]!, entries[i]!]; }
    for (let i = 0; i < entries.length; i++) await execute(sql`UPDATE tournament_entries SET seed=${i + 1} WHERE id=${entries[i]!.id}`);
    await execute(sql`INSERT INTO tournament_judge_settings (tournament_id,model,rubric_hash) VALUES (${id},${env.JUDGE_MODEL!},${rubricHash()})`);
    await execute(sql`UPDATE tournaments SET status='active',started_at=${new Date().toISOString()} WHERE id=${id}`);
    await event(execute, id, 'bracket.drawn', { entries: entries.map((e,i) => ({ entryId: e.id, seed: i + 1 })), rules: rulesVersion, judgeModel: env.JUDGE_MODEL, judgeRubric: rubricVersion });
    for (let i = 0; i < entries.length; i += 2) await newMatch(execute, row, 0, i / 2, [entries[i]!, entries[i + 1]!], 1, randomInt(2) === 1);
  });
}
export async function cancel(id: string, session: string) {
  await transaction(async execute => {
    const row = await lock(id, execute);
    if (row.owner_session !== session) throw new AppError(403, 'organizer_required', 'Only the organizer can cancel registration.');
    if (row.status !== 'registration') throw new AppError(409, 'tournament_started', 'Cancellation is only available before the bracket is drawn.');
    await execute(sql`UPDATE tournaments SET status='cancelled',completed_at=${new Date().toISOString()} WHERE id=${id}`);
    await event(execute, id, 'tournament.cancelled', {});
  });
}
export async function assertTournamentReady(roomId: string, execute: Query) {
  const row = (await execute<{ status: Tournament['status']; model: string; rubric_hash: string }>(sql`SELECT t.status,s.model,s.rubric_hash FROM tournament_matches m JOIN tournaments t ON t.id=m.tournament_id JOIN tournament_judge_settings s ON s.tournament_id=t.id WHERE m.room_id=${roomId}`))[0];
  if (row && judgeAvailability()) throw new AppError(503, 'judge_unavailable', judgeAvailability()!);
  if (row && (row.status !== 'active' || row.model !== env.JUDGE_MODEL || row.rubric_hash !== rubricHash()))
    throw new AppError(409, 'tournament_blocked', 'This tournament is paused for review or its judge configuration changed.');
}
async function block(execute: Query, id: string, reason: string) {
  const now=new Date().toISOString();
  const waiting=await execute<{ id: string }>(sql`SELECT m.id FROM tournament_matches m JOIN rooms r ON r.id=m.room_id WHERE m.tournament_id=${id} AND r.status IN ('waiting','live')`);
  for (const m of waiting) {
    await execute(sql`INSERT INTO tournament_match_pauses (match_id,paused_at) VALUES (${m.id},${now}) ON CONFLICT(match_id) DO UPDATE SET paused_at=COALESCE(tournament_match_pauses.paused_at,excluded.paused_at)`);
    const match=(await execute<{room_id:string}>(sql`SELECT room_id FROM tournament_matches WHERE id=${m.id}`))[0];
    if(match) await append(execute,match.room_id,'match.clock_paused',{ tournamentId:id,pausedAt:now,reason });
  }
  await execute(sql`UPDATE tournaments SET status='blocked',blocked_reason=${reason} WHERE id=${id}`);
  await event(execute, id, 'tournament.blocked', { reason });
}
export async function settleTournaments() {
  const ids = await query<{ id: string }>(sql`SELECT id FROM tournaments WHERE status='active'`);
  for (const { id } of ids) await transaction(async execute => {
    const row = await lock(id, execute);
    if (row.status !== 'active') return;
    const settings = (await execute<{ model: string; rubric_hash: string }>(sql`SELECT * FROM tournament_judge_settings WHERE tournament_id=${id}`))[0];
    if (judgeAvailability()) return block(execute,id,'Live judge access is unavailable. Restore it, then resume the tournament.');
    if (!settings || settings.model !== env.JUDGE_MODEL || settings.rubric_hash !== rubricHash()) return block(execute, id, 'The judge configuration changed after the bracket draw. No entrant is advanced.');
    const matches = await execute<Match>(sql`SELECT m.*,r.status AS room_status,j.status AS judge_status FROM tournament_matches m JOIN rooms r ON r.id=m.room_id LEFT JOIN judgements j ON j.room_id=r.id WHERE m.tournament_id=${id} ORDER BY round_index,match_index,attempt`);
    const round = Math.max(...matches.map(m => m.round_index));
    const latest = matches.filter(m => m.round_index === round && !matches.some(other => other.round_index === round && other.match_index === m.match_index && other.attempt > m.attempt));
    const entries = await execute<Entry>(sql`SELECT * FROM tournament_entries WHERE tournament_id=${id}`);
    for (const match of latest) {
      const administrative = (await execute<{ outcome: string | null; reason: string | null }>(sql`SELECT outcome,reason FROM tournament_match_controls WHERE match_id=${match.id}`))[0];
      if (!match.winner_entry && administrative?.outcome === 'void') return block(execute,id,administrative.reason ?? 'This match has no winner. Both entrants may consent to one rematch.');
      if (!match.winner_entry && administrative?.outcome?.startsWith('forfeit:')) {
        match.winner_entry=administrative.outcome === 'forfeit:FOR' ? match.for_entry : match.against_entry;
        await execute(sql`UPDATE tournament_matches SET winner_entry=${match.winner_entry},resolved_at=${new Date().toISOString()} WHERE id=${match.id}`);
        await event(execute,id,'match.forfeit',{ matchId: match.id, roomId: match.room_id, winnerEntry: match.winner_entry, reason: administrative.reason });
      }
      if (match.winner_entry || match.room_status !== 'closed') continue;
      const judge = (await execute<{ status: Judgement['status']; rubric: string; model: string | null; passes_json: string; error_json: string | null; completed_at: string | null }>(sql`SELECT * FROM judgements WHERE room_id=${match.room_id}`))[0];
      if (!judge || ['queued','running'].includes(judge.status)) continue;
      if (judge.status !== 'completed') return block(execute, id, 'A match has no valid judge verdict. Inspect Results and Audit. An eligible failed judge request may be retried once; unresolved matches need both entrants to approve a rematch.');
      const tallies = await tallyVotes(match.room_id,execute);
      const verdict = finalVerdict(tallies, { status: judge.status, rubric: judge.rubric, model: judge.model, passes: JSON.parse(judge.passes_json) as JudgePass[], error: null, completedAt: judge.completed_at });
      if (!verdict) return block(execute, id, 'A match verdict could not be calculated. No entrant is advanced.');
      if (!verdict.winner) {
        if (match.attempt >= 2) return block(execute, id, 'The deciding rematch is also tied. The organizer can end the tournament without a champion.');
        await execute(sql`UPDATE tournament_matches SET resolved_at=${new Date().toISOString()} WHERE id=${match.id}`);
        await newMatch(execute, row, round, match.match_index, [entries.find(e => e.id === match.for_entry)!, entries.find(e => e.id === match.against_entry)!], 2, true);
        return;
      }
      match.winner_entry = verdict.winner === 'FOR' ? match.for_entry : match.against_entry;
      await execute(sql`UPDATE tournament_matches SET winner_entry=${match.winner_entry},resolved_at=${new Date().toISOString()} WHERE id=${match.id}`);
      await event(execute, id, 'match.resolved', { matchId: match.id, roomId: match.room_id, winnerEntry: match.winner_entry, verdict, votes: tallies });
    }
    if (!latest.length || latest.some(m => !m.winner_entry)) return;
    if (latest.length === 1) {
      await execute(sql`UPDATE tournaments SET status='completed',champion_id=${latest[0]!.winner_entry},completed_at=${new Date().toISOString()} WHERE id=${id}`);
      return event(execute, id, 'tournament.completed', { championId: latest[0]!.winner_entry });
    }
    for (let i = 0; i < latest.length; i += 2) await newMatch(execute, row, round + 1, i / 2,
      [entries.find(e => e.id === latest[i]!.winner_entry)!, entries.find(e => e.id === latest[i + 1]!.winner_entry)!], 1, randomInt(2) === 1);
    await event(execute, id, 'round.created', { round: round + 1 });
  });
}
export async function retryJudge(id: string, session: string, matchId: string) {
  await transaction(async execute => {
    const tournament = await lock(id,execute);
    if (tournament.owner_session !== session) throw new AppError(403,'organizer_required','Only the organizer can authorize a paid judge retry.');
    if (!['active','blocked'].includes(tournament.status)) throw new AppError(409,'tournament_locked','This tournament cannot be resumed.');
    const match = (await execute<Match>(sql`SELECT * FROM tournament_matches WHERE id=${matchId} AND tournament_id=${id}`))[0];
    if (!match || match.winner_entry || match.resolved_at) throw new AppError(409,'match_resolved','Choose an unresolved match.');
    const c = (await execute<{ judge_retries: number; outcome: string | null }>(sql`SELECT * FROM tournament_match_controls WHERE match_id=${matchId}`))[0];
    if (!c || c.outcome || c.judge_retries >= 1) throw new AppError(409,'retry_limit','The one permitted judge retry is unavailable for this match.');
    const unavailable=judgeAvailability(); if (unavailable) throw new AppError(503,'judge_unavailable',unavailable);
    const settings=(await execute<{ model: string; rubric_hash: string }>(sql`SELECT * FROM tournament_judge_settings WHERE tournament_id=${id}`))[0];
    if (!settings || settings.model !== env.JUDGE_MODEL || settings.rubric_hash !== rubricHash()) throw new AppError(409,'judge_configuration_changed','Restore the original judge model and rubric before retrying.');
    await execute(sql`UPDATE rooms SET status=status WHERE id=${match.room_id}`);
    const room=(await execute<{ status: string }>(sql`SELECT status FROM rooms WHERE id=${match.room_id}`))[0];
    const judge=(await execute<{ status: string; error_json: string | null }>(sql`SELECT status,error_json FROM judgements WHERE room_id=${match.room_id}`))[0];
    const error=judge?.error_json ? JSON.parse(judge.error_json) as { code: string } : null;
    const permitted=['rate_limit','authentication_rejected','policy_denial','gateway_failure','network_error','local_timeout','cancelled','judge_interrupted'];
    if (room?.status !== 'closed' || judge?.status !== 'failed' || !error || !permitted.includes(error.code))
      throw new AppError(409,'retry_ineligible','Only an interrupted or failed transport request may be retried. Scores and disputed assessments cannot be rerolled.');
    await execute(sql`UPDATE tournament_match_controls SET judge_retries=judge_retries+1 WHERE match_id=${matchId}`);
    await execute(sql`UPDATE judgements SET status='queued',error_json=NULL,lease_until=NULL WHERE room_id=${match.room_id}`);
    await resumeClocks(execute,id);
    await append(execute,match.room_id,'judge.retry_authorized',{ tournamentId: id, attempt: 1, previousError: error, preservedAssessments: true });
    await event(execute,id,'judge.retry_authorized',{ matchId, roomId: match.room_id, attempt: 1, previousError: error });
  });
}
export async function consentRematch(id: string, session: string, matchId: string) {
  await transaction(async execute => {
    const tournament=await lock(id,execute);
    if (tournament.status !== 'blocked') throw new AppError(409,'tournament_not_blocked','A recovery rematch is available only while the tournament is blocked.');
    const match=(await execute<Match>(sql`SELECT m.*,r.status AS room_status,j.status AS judge_status FROM tournament_matches m JOIN rooms r ON r.id=m.room_id LEFT JOIN judgements j ON j.room_id=r.id WHERE m.id=${matchId} AND m.tournament_id=${id}`))[0];
    if (!match || match.winner_entry || match.attempt >= 2 || match.room_status !== 'closed') throw new AppError(409,'rematch_unavailable','Only an unresolved first attempt can receive a recovery rematch.');
    const later=await execute(sql`SELECT id FROM tournament_matches WHERE tournament_id=${id} AND round_index=${match.round_index} AND match_index=${match.match_index} AND attempt>${match.attempt}`);
    const c=(await execute<{ outcome: string | null }>(sql`SELECT outcome FROM tournament_match_controls WHERE match_id=${matchId}`))[0];
    if (!c || later.length || (c.outcome !== 'void' && !['failed','insufficient','needs_review'].includes(match.judge_status ?? '')))
      throw new AppError(409,'rematch_ineligible','A decided match cannot be replayed or have its scores rerolled.');
    const entries=await execute<Entry>(sql`SELECT * FROM tournament_entries WHERE tournament_id=${id}`);
    const me=entries.find(e=>e.session_id===session && [match.for_entry,match.against_entry].includes(e.id));
    if (!me) throw new AppError(403,'entrant_required','Only the two entrants in this match can approve its rematch.');
    await execute(sql`INSERT INTO tournament_rematch_consents (match_id,entry_id,created_at) VALUES (${matchId},${me.id},${new Date().toISOString()}) ON CONFLICT(match_id,entry_id) DO NOTHING`);
    const consents=await execute(sql`SELECT entry_id FROM tournament_rematch_consents WHERE match_id=${matchId}`);
    await event(execute,id,'rematch.consent',{ matchId, entryId: me.id });
    if (consents.length !== 2) return;
    const unavailable=judgeAvailability(); if (unavailable) throw new AppError(503,'judge_unavailable',unavailable);
    const settings=(await execute<{ model: string; rubric_hash: string }>(sql`SELECT * FROM tournament_judge_settings WHERE tournament_id=${id}`))[0];
    if (!settings || settings.model !== env.JUDGE_MODEL || settings.rubric_hash !== rubricHash()) throw new AppError(409,'judge_configuration_changed','Restore the original judge configuration before rematching.');
    await execute(sql`UPDATE tournament_matches SET resolved_at=${new Date().toISOString()} WHERE id=${matchId}`);
    await newMatch(execute,tournament,match.round_index,match.match_index,[entries.find(e=>e.id===match.for_entry)!,entries.find(e=>e.id===match.against_entry)!],2,true);
    await execute(sql`UPDATE tournaments SET status='active',blocked_reason=NULL WHERE id=${id}`);
    await event(execute,id,'tournament.resumed',{ matchId, reason: 'Both entrants approved the single recovery rematch.' });
  });
}
export async function terminate(id: string, session: string, reason: string) {
  await transaction(async execute => {
    const tournament=await lock(id,execute);
    if (tournament.owner_session !== session) throw new AppError(403,'organizer_required','Only the organizer can end this tournament.');
    if (!['active','blocked'].includes(tournament.status)) throw new AppError(409,'tournament_locked','Only an active or blocked tournament can be ended without a champion.');
    const matches=await execute<Match>(sql`SELECT * FROM tournament_matches WHERE tournament_id=${id} AND winner_entry IS NULL AND resolved_at IS NULL`);
    for (const match of matches) {
      await execute(sql`UPDATE rooms SET status=status WHERE id=${match.room_id}`);
      const room=(await execute<{ status: string }>(sql`SELECT status FROM rooms WHERE id=${match.room_id}`))[0];
      if (room?.status !== 'closed') {
        await execute(sql`UPDATE rooms SET status='closed',end_reason=${'Tournament ended without a champion: '+reason},voting_ends_at=NULL WHERE id=${match.room_id}`);
        await execute(sql`UPDATE tournament_match_controls SET outcome='void',reason=${reason} WHERE match_id=${match.id} AND outcome IS NULL`);
      }
      await execute(sql`UPDATE judgements SET status='insufficient',lease_until=NULL,error_json=${JSON.stringify({ code: 'tournament_cancelled', message: reason })} WHERE room_id=${match.room_id} AND status IN ('queued','running')`);
      await append(execute,match.room_id,'tournament.terminated',{ tournamentId: id, reason });
    }
    await execute(sql`UPDATE tournaments SET status='cancelled',champion_id=NULL,completed_at=${new Date().toISOString()},blocked_reason=${reason} WHERE id=${id}`);
    await event(execute,id,'tournament.terminated',{ reason, championId: null });
  });
}
async function resumeClocks(execute: Query,id: string) {
  const pauses=await execute<{ match_id: string; room_id: string; paused_at: string; ready_deadline: string; ends_at: string | null; status: string }>(sql`SELECT p.*,m.room_id,c.ready_deadline,r.ends_at,r.status FROM tournament_match_pauses p JOIN tournament_matches m ON m.id=p.match_id JOIN tournament_match_controls c ON c.match_id=m.id JOIN rooms r ON r.id=m.room_id WHERE m.tournament_id=${id} AND p.paused_at IS NOT NULL`);
  const now=Date.now();
  for(const p of pauses) {
    const extension=Math.max(0,now-Date.parse(p.paused_at));
    await execute(sql`UPDATE rooms SET status=status WHERE id=${p.room_id}`);
    if(p.status==='waiting') await execute(sql`UPDATE tournament_match_controls SET ready_deadline=${new Date(Date.parse(p.ready_deadline)+extension).toISOString()} WHERE match_id=${p.match_id}`);
    if(p.status==='live' && p.ends_at) await execute(sql`UPDATE rooms SET ends_at=${new Date(Date.parse(p.ends_at)+extension).toISOString()} WHERE id=${p.room_id}`);
    await execute(sql`UPDATE tournament_match_pauses SET paused_at=NULL,turn_extension_ms=turn_extension_ms+${p.status==='live' ? extension : 0} WHERE match_id=${p.match_id}`);
    await append(execute,p.room_id,'match.clock_resumed',{ pausedAt:p.paused_at, extensionMs:extension });
  }
  await execute(sql`UPDATE tournaments SET status='active',blocked_reason=NULL WHERE id=${id}`);
}
export async function resume(id: string,session: string) {
  await transaction(async execute=>{
    const tournament=await lock(id,execute);
    if(tournament.owner_session!==session) throw new AppError(403,'organizer_required','Only the organizer can resume the tournament.');
    if(tournament.status!=='blocked') throw new AppError(409,'tournament_not_blocked','This tournament is not paused.');
    const unavailable=judgeAvailability(); if(unavailable) throw new AppError(503,'judge_unavailable',unavailable);
    const settings=(await execute<{model:string;rubric_hash:string}>(sql`SELECT * FROM tournament_judge_settings WHERE tournament_id=${id}`))[0];
    if(!settings || settings.model!==env.JUDGE_MODEL || settings.rubric_hash!==rubricHash()) throw new AppError(409,'judge_configuration_changed','Restore the original judge model and rubric.');
    const unresolved=await execute(sql`SELECT m.id FROM tournament_matches m JOIN rooms r ON r.id=m.room_id LEFT JOIN judgements j ON j.room_id=r.id LEFT JOIN tournament_match_controls c ON c.match_id=m.id WHERE m.tournament_id=${id} AND m.winner_entry IS NULL AND m.resolved_at IS NULL AND r.status='closed' AND (c.outcome='void' OR j.status IN ('failed','insufficient','needs_review'))`);
    if(unresolved.length) throw new AppError(409,'match_recovery_required','Resolve the blocked match through its eligible retry or mutual rematch consent, or end without a champion.');
    await resumeClocks(execute,id); await event(execute,id,'tournament.resumed',{reason:'Original judge configuration restored.'});
  });
}

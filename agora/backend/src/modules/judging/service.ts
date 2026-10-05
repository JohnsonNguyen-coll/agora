import { tallyVotes } from '../votes/tally.js';
import { createHash } from 'node:crypto';
import { sql } from 'drizzle-orm';
import { query, transaction, type Query } from '../../db/client.js';
import { env } from '../../config/env.js';
import { append } from '../audit/service.js';
import { callModel } from '../latch/client.js';
import { LatchError } from '../latch/types.js';
import type { Side } from '../../../../shared/src/types.js';
import type { TurnRecord } from '../../db/records.js';
import { disputed, judgeShares, finalVerdict, type Judgement, type JudgePass } from '../../../../shared/src/judging.js';
import { judgeAvailability } from './availability.js';
import { judgeSystem, judgeInput, parseJudgePass, rubricVersion } from './rubric.js';
interface Row { room_id: string; status: Judgement['status']; rubric: string; model: string | null;
  lease_until: string | null; passes_json: string; error_json: string | null; completed_at: string | null; }
export async function enqueueJudge(id: string, execute: Query) {
  await execute(sql`INSERT INTO room_vote_rules (room_id,version) VALUES (${id},'verified-account-v1') ON CONFLICT(room_id) DO NOTHING`);
  await execute(sql`INSERT INTO judgements (room_id,status,rubric,model) VALUES (${id},'queued',${rubricVersion},${env.JUDGE_MODEL || null}) ON CONFLICT(room_id) DO NOTHING`);
  const rubricHash = createHash('sha256').update(judgeSystem).digest('hex');
  await execute(sql`INSERT INTO judge_rules (room_id,rubric_hash) VALUES (${id},${rubricHash}) ON CONFLICT(room_id) DO NOTHING`);
  await append(execute, id, 'judge.queued', { rubric: rubricVersion, rubricHash, weights: { audience: 0.7, judge: 0.3 }, noVotesJudgeWeight: 1 });
}
export async function getJudgement(id: string): Promise<Judgement | null> {
  const row = (await query<Row>(sql`SELECT * FROM judgements WHERE room_id=${id}`))[0];
  if (!row) return null;
  const unavailable = row.status === 'queued' ? judgeAvailability() : null;
  return { status: unavailable ? 'unavailable' : row.status, rubric: row.rubric, model: row.model,
    passes: JSON.parse(row.passes_json) as JudgePass[], completedAt: row.completed_at,
    error: unavailable ? { code: 'judge_unavailable', message: unavailable } : row.error_json ? JSON.parse(row.error_json) as Judgement['error'] : null };
}
export function startJudgeWorker(onError: () => void) {
  let busy = false, stopped = false;
  const abort = new AbortController();
  let current: Promise<void> = Promise.resolve();
  async function tick() {
    if (busy || stopped || judgeAvailability()) return;
    busy = true;
    try { await runOne(abort.signal); } catch { onError(); } finally { busy = false; }
  }
  const timer = setInterval(() => { if (!busy) current = tick(); }, 1000);
  timer.unref();
  return async () => { stopped = true; clearInterval(timer); abort.abort(); await current; };
}
async function runOne(signal: AbortSignal) {
  const now = new Date().toISOString();
  const job = await transaction(async execute => {
    await execute(sql`UPDATE judge_dispatch SET id=id WHERE id=1`);
    const expired = await execute<Row>(sql`SELECT * FROM judgements WHERE status='running' AND lease_until<=${now}`);
    for (const row of expired) {
      await execute(sql`UPDATE rooms SET status=status WHERE id=${row.room_id}`);
      const active = (await execute<Row>(sql`SELECT * FROM judgements WHERE room_id=${row.room_id}`))[0];
      if (active?.status !== 'running' || !active.lease_until || active.lease_until > now) continue;
      const error = { code: 'judge_interrupted', message: 'Judging was interrupted. No verdict is published; no automatic paid retry is made.' };
      await execute(sql`UPDATE judgements SET status='failed',error_json=${JSON.stringify(error)},lease_until=NULL WHERE room_id=${row.room_id}`);
      await append(execute, row.room_id, 'judge.failed', error);
    }
    const clock = (await execute<{ next_at: string }>(sql`SELECT next_at FROM judge_dispatch WHERE id=1`))[0];
    if (!clock || clock.next_at > now) return null;
    const row = (await execute<Row & { topic: string }>(sql`SELECT j.*,r.topic FROM judgements j JOIN rooms r ON r.id=j.room_id
      WHERE j.status='queued' AND r.status='closed' ORDER BY r.created_at LIMIT 1`))[0];
    if (!row) return null;
    await execute(sql`UPDATE rooms SET status=status WHERE id=${row.room_id}`);
    const turns = await execute<TurnRecord>(sql`SELECT * FROM turns WHERE room_id=${row.room_id} AND status='completed' ORDER BY turn_index`);
    if (!turns.some(t => t.side === 'FOR') || !turns.some(t => t.side === 'AGAINST')) {
      const error = { code: 'insufficient_transcript', message: 'Both sides must have at least one completed argument for a judge verdict.' };
      await execute(sql`UPDATE judgements SET status='insufficient',error_json=${JSON.stringify(error)} WHERE room_id=${row.room_id}`);
      await append(execute, row.room_id, 'judge.insufficient', error);
      return null;
    }
    const rules = (await execute<{ rubric_hash: string }>(sql`SELECT rubric_hash FROM judge_rules WHERE room_id=${row.room_id}`))[0];
    if (rules?.rubric_hash !== createHash('sha256').update(judgeSystem).digest('hex') || row.rubric !== rubricVersion || (row.model && row.model !== env.JUDGE_MODEL)) {
      const error = { code: 'judge_configuration_changed', message: 'The judge configuration changed after this match. A verdict requires review.' };
      await execute(sql`UPDATE judgements SET status='needs_review',error_json=${JSON.stringify(error)} WHERE room_id=${row.room_id}`);
      await append(execute, row.room_id, 'judge.needs_review', error);
      return null;
    }
    await execute(sql`UPDATE judge_dispatch SET next_at=${new Date(Date.now() + 30000).toISOString()} WHERE id=1`);
    const lease = new Date(Date.now() + 180000).toISOString();
    await execute(sql`UPDATE judgements SET status='running',model=${env.JUDGE_MODEL!},lease_until=${lease} WHERE room_id=${row.room_id}`);
    const inputHash = createHash('sha256').update(JSON.stringify([row.topic, turns.map(t => [t.turn_index,t.side,t.content]), judgeSystem])).digest('hex');
    await execute(sql`INSERT INTO judge_inputs (room_id,input_hash) VALUES (${row.room_id},${inputHash}) ON CONFLICT(room_id) DO NOTHING`);
    const snapshot = (await execute<{ input_hash: string }>(sql`SELECT input_hash FROM judge_inputs WHERE room_id=${row.room_id}`))[0];
    if (snapshot?.input_hash !== inputHash) {
      const error = { code: 'judge_input_changed', message: 'The transcript or rubric changed between assessments. No final verdict is published.' };
      await execute(sql`UPDATE judgements SET status='needs_review',error_json=${JSON.stringify(error)},lease_until=NULL WHERE room_id=${row.room_id}`);
      await append(execute, row.room_id, 'judge.needs_review', error);
      return null;
    }
    await append(execute, row.room_id, 'judge.started', { pass: (JSON.parse(row.passes_json) as JudgePass[]).length + 1, rubric: row.rubric, model: env.JUDGE_MODEL, inputHash });
    return { row, turns, lease };
  });
  if (!job) return;
  const { row, turns, lease } = job, passes = JSON.parse(row.passes_json) as JudgePass[];
  try {
    const result = await callModel(env.JUDGE_LATCH_TOKEN!, { model: env.JUDGE_MODEL!, stream: true, max_tokens: 200,
      system: judgeSystem, messages: [{ role: 'user', content: judgeInput(row.topic, turns, passes.length === 1) }] }, () => {}, {
      signal, onResponse: observation => transaction(execute => append(execute, row.room_id, 'judge.proxy_response', { pass: passes.length + 1, observation })).then(() => undefined)
    });
    if (result.text.includes(env.JUDGE_LATCH_TOKEN!)) throw new LatchError('credential_reflection', 'The model reflected a credential; output withheld.');
    passes.push(parseJudgePass(result.text, turns, passes.length === 1));
    const review = passes.length === 2 && (disputed(passes) || !judgeShares(passes));
    const status = passes.length === 1 ? 'queued' : review ? 'needs_review' : 'completed';
    const error = review ? { code: 'judge_disagreement', message: 'The two assessments strongly disagree or cannot be normalized. No final verdict is published.' } : null;
    await transaction(async execute => {
      await execute(sql`UPDATE rooms SET status=status WHERE id=${row.room_id}`);
      const active = (await execute<Row>(sql`SELECT * FROM judgements WHERE room_id=${row.room_id}`))[0];
      if (active?.status !== 'running' || active.lease_until !== lease) {
        await append(execute, row.room_id, 'judge.stale_response', { model: result.model, observation: result.observation });
        return;
      }
      await execute(sql`UPDATE judgements SET status=${status},passes_json=${JSON.stringify(passes)},error_json=${error ? JSON.stringify(error) : null},
        completed_at=${passes.length === 2 ? new Date().toISOString() : null},lease_until=NULL WHERE room_id=${row.room_id}`);
      await append(execute, row.room_id, 'judge.pass_completed', { pass: passes.length, assessment: passes[passes.length - 1], model: result.model,
        inputTokens: result.inputTokens, outputTokens: result.outputTokens, observation: result.observation });
      if (passes.length === 2) {
        await append(execute, row.room_id, 'judge.' + status, { rubric: row.rubric, shares: judgeShares(passes), error });
        if (status === 'completed') {
          const tallies = await tallyVotes(row.room_id, execute);
          const judgement: Judgement = { status, rubric: row.rubric, model: env.JUDGE_MODEL!, passes, error: null, completedAt: new Date().toISOString() };
          await append(execute, row.room_id, 'verdict.finalized', { votes: tallies, verdict: finalVerdict(tallies, judgement) });
        }
      }
    });
  } catch (error) {
    const detail = error instanceof LatchError ? { code: error.code, message: error.message } :
      { code: 'invalid_judge_output', message: 'The judge response was incomplete, invalid, too large, or referenced an absent turn. No verdict is published.' };
    await transaction(async execute => {
      await execute(sql`UPDATE rooms SET status=status WHERE id=${row.room_id}`);
      const active = (await execute<Row>(sql`SELECT * FROM judgements WHERE room_id=${row.room_id}`))[0];
      if (active?.status !== 'running' || active.lease_until !== lease) return;
      await execute(sql`UPDATE judgements SET status='failed',error_json=${JSON.stringify(detail)},lease_until=NULL WHERE room_id=${row.room_id}`);
      await append(execute, row.room_id, 'judge.failed', { ...detail, observation: error instanceof LatchError ? error.observation ?? null : null });
    });
  }
}
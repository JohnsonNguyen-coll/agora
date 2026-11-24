import { createHash } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import { sql } from 'drizzle-orm';
import { env } from '../../config/env.js';
import { transaction, type Query } from '../../db/client.js';
import { AppError } from '../../lib/errors.js';
import { append } from '../audit/service.js';
import { LatchError } from '../latch/types.js';
import type { TurnRecord } from '../../db/records.js';
import type { JudgePass } from '../../../../shared/src/judging.js';
import { assess } from './assessment.js';
import { judgeSystem, rubricVersion } from './rubric.js';
import { judgeAvailability } from './availability.js';
import { recordJudgePass } from './service.js';

interface RepairRow {
  room_id: string; topic: string; room_status: string; status: 'failed' | 'running';
  rubric: string; model: string | null; lease_until: string | null;
  passes_json: string; error_json: string | null; completed_at: string | null;
}
async function reserveCall(execute: Query) {
  await execute(sql`UPDATE judge_dispatch SET id=id WHERE id=1`);
  const clock = (await execute<{ next_at: string }>(sql`SELECT next_at FROM judge_dispatch WHERE id=1`))[0];
  if (!clock) throw new Error('Judge dispatch clock is missing.');
  const wait = Math.max(0, Date.parse(clock.next_at) - Date.now());
  if (wait) return wait;
  await execute(sql`UPDATE judge_dispatch SET next_at=${new Date(Date.now() + 30000).toISOString()} WHERE id=1`);
  return 0;
}

// Operator-only repair. Accepted scores, disputes and tournament decisions cannot be rerolled here.
export async function repairJudgeOutput(id: string) {
  const unavailable = judgeAvailability();
  if (unavailable) throw new AppError(503, 'judge_unavailable', unavailable);
  const job = await transaction(async execute => {
    await execute(sql`UPDATE rooms SET status=status WHERE id=${id}`);
    const row = (await execute<RepairRow>(sql`SELECT j.*,r.topic,r.status AS room_status FROM judgements j
      JOIN rooms r ON r.id=j.room_id WHERE j.room_id=${id}`))[0];
    const codes = ['invalid_judge_output', 'judge_output_truncated', 'judge_invalid_json', 'judge_invalid_schema'];
    const previousError = row?.error_json ? JSON.parse(row.error_json) as { code: string } : null;
    if (!row || row.room_status !== 'closed' || row.status !== 'failed' ||
        JSON.parse(row.passes_json).length !== 0 || !previousError || !codes.includes(previousError.code))
      throw new AppError(409, 'judge_repair_ineligible', 'Only failed serialization with no accepted assessment can be repaired.');
    if ((await execute(sql`SELECT id FROM tournament_matches WHERE room_id=${id}`)).length)
      throw new AppError(409, 'tournament_repair_required', 'Tournament recovery must follow its organizer authorization rules.');
    const rubricHash = createHash('sha256').update(judgeSystem).digest('hex');
    const rules = (await execute<{ rubric_hash: string }>(sql`SELECT rubric_hash FROM judge_rules WHERE room_id=${id}`))[0];
    if (row.rubric !== rubricVersion || row.model !== env.JUDGE_MODEL || rules?.rubric_hash !== rubricHash)
      throw new AppError(409, 'judge_configuration_changed', 'The original model and scoring rubric are required.');
    const turns = await execute<TurnRecord>(sql`SELECT * FROM turns WHERE room_id=${id} AND status='completed' ORDER BY turn_index`);
    const hash = createHash('sha256').update(JSON.stringify([row.topic, turns.map(t => [t.turn_index,t.side,t.content]), judgeSystem])).digest('hex');
    const snapshot = (await execute<{ input_hash: string }>(sql`SELECT input_hash FROM judge_inputs WHERE room_id=${id}`))[0];
    if (!turns.some(t => t.side === 'FOR') || !turns.some(t => t.side === 'AGAINST') || snapshot?.input_hash !== hash)
      throw new AppError(409, 'judge_input_changed', 'The original completed transcript is required.');
    const lease = new Date(Date.now() + 300000).toISOString();
    await execute(sql`UPDATE judgements SET status='running',error_json=NULL,lease_until=${lease} WHERE room_id=${id}`);
    await append(execute, id, 'judge.repair_started', {
      reason: 'Operator requested repair of truncated or invalid JSON output.',
      previousError, inputHash: hash, rubricHash, model: env.JUDGE_MODEL
    });
    return { row, turns, lease, hash };
  });
  const passes: JudgePass[] = [];
  const signal = AbortSignal.timeout(Math.max(1, Date.parse(job.lease) - Date.now()));
  try {
    for (let index = 0; index < 2; index++) {
      let wait = await transaction(reserveCall);
      while (wait) { await delay(wait, undefined, { signal }); wait = await transaction(reserveCall); }
      await transaction(execute => append(execute, id, 'judge.started', {
        pass: index + 1, repair: true, model: env.JUDGE_MODEL, rubric: job.row.rubric, inputHash: job.hash
      }));
      const { pass, result } = await assess(job.row.topic, job.turns, index === 1, {
        signal, onResponse: observation => transaction(execute => append(execute, id, 'judge.proxy_response', {
          pass: index + 1, repair: true, observation
        })).then(() => undefined)
      });
      passes.push(pass);
      if (!await recordJudgePass(job.row, job.lease, passes, result, index === 0))
        throw new AppError(409, 'judge_lease_lost', 'The judging lease expired before this response could be committed.');
    }
    return { roomId: id, assessments: passes.length };
  } catch (error) {
    const detail = error instanceof LatchError ? { code: error.code, message: error.message } :
      { code: 'judge_repair_failed', message: 'Judge repair could not finish. No final verdict was published.' };
    await transaction(async execute => {
      await execute(sql`UPDATE rooms SET status=status WHERE id=${id}`);
      const active = (await execute<{ status: string; lease_until: string | null }>(sql`SELECT status,lease_until FROM judgements WHERE room_id=${id}`))[0];
      if (active?.status !== 'running' || active.lease_until !== job.lease) return;
      await execute(sql`UPDATE judgements SET status='failed',error_json=${JSON.stringify(detail)},lease_until=NULL WHERE room_id=${id}`);
      await append(execute, id, 'judge.failed', { ...detail, repair: true, observation: error instanceof LatchError ? error.observation ?? null : null });
    });
    throw error;
  }
}

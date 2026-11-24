import { sql } from 'drizzle-orm';
import { query, transaction, closeDb, type Query } from '../src/db/client.js';
import { unseal } from '../src/lib/crypto.js';
import { append } from '../src/modules/audit/service.js';
import { judgeShares, type JudgePass } from '../../shared/src/judging.js';

interface Configuration { name: string; model: string; strategy: string; latch_token: string; }
interface LegacySeat extends Configuration { id: string; room_id: string; session_id: string; side: string; passes_json: string; }
interface Profile extends Configuration { id: string; user_id: string; }
function matches(seat: Configuration, profile: Configuration) {
  return seat.name === profile.name && seat.model === profile.model &&
    unseal(seat.strategy) === unseal(profile.strategy) && unseal(seat.latch_token) === unseal(profile.latch_token);
}
async function candidates(seat: LegacySeat, execute: Query) {
  if (!seat.session_id.startsWith('account:did:privy:')) return [];
  const rows = await execute<Profile>(sql`SELECT * FROM agent_profiles WHERE user_id=${seat.session_id.slice(8)} ORDER BY id`);
  return rows.filter(profile => matches(seat, profile));
}

async function run(apply: boolean) {
  const seats = await query<LegacySeat>(sql`SELECT a.*,j.passes_json FROM agents a
    JOIN rooms r ON r.id=a.room_id JOIN judgements j ON j.room_id=r.id
    LEFT JOIN agent_profile_seats s ON s.agent_id=a.id
    WHERE s.agent_id IS NULL AND r.status='closed' AND r.ends_at IS NOT NULL AND j.status='completed'
    ORDER BY a.room_id,a.id`);
  const report: { seatId: string; roomId: string; profileId?: string; status: string }[] = [];
  for (const seat of seats) {
    const result = await transaction(async execute => {
      // Share the room lock with audit appends and normal match lifecycle changes.
      if (apply) await execute(sql`UPDATE rooms SET status=status WHERE id=${seat.room_id}`);
      if ((await execute(sql`SELECT agent_id FROM agent_profile_seats WHERE agent_id=${seat.id}`)).length)
        return { status: 'already_linked' };
      const current = (await execute<LegacySeat>(sql`SELECT a.*,j.passes_json FROM agents a JOIN rooms r ON r.id=a.room_id
        JOIN judgements j ON j.room_id=r.id WHERE a.id=${seat.id} AND r.status='closed' AND r.ends_at IS NOT NULL AND j.status='completed'`))[0];
      if (!current || !judgeShares(JSON.parse(current.passes_json) as JudgePass[])) return { status: 'no_valid_verdict' };
      const found = await candidates(current, execute);
      if (found.length !== 1) return { status: found.length ? 'ambiguous_configuration' : 'no_exact_match' };
      const profile = found[0]!;
      if (apply) {
        // Prevent editing/deleting the selected configuration while it is linked.
        await execute(sql`UPDATE agent_profiles SET updated_at=updated_at WHERE id=${profile.id}`);
        const confirmed = await candidates(current, execute);
        if (confirmed.length !== 1 || confirmed[0]!.id !== profile.id) return { status: 'configuration_changed' };
        await execute(sql`INSERT INTO agent_profile_seats (agent_id,profile_id,user_id) VALUES (${current.id},${profile.id},${profile.user_id})`);
        await append(execute, current.room_id, 'agent.profile_linked', {
          side: current.side, profileId: profile.id, method: 'legacy_exact_configuration_v1',
          verified: ['account', 'name', 'model', 'strategy', 'latch_credential']
        });
      }
      return { profileId: profile.id, status: apply ? 'linked' : 'eligible' };
    });
    report.push({ seatId: seat.id, roomId: seat.room_id, ...result });
  }
  return { apply, linked: report.filter(row=>row.status==='linked').length,
    eligible: report.filter(row=>row.status==='eligible').length, checked: seats.length, report };
}
try {
  const args = process.argv.slice(2);
  if (args.some(arg=>arg!=='--apply')) throw new Error('Unsupported argument');
  console.log(JSON.stringify(await run(args.includes('--apply'))));
} catch {
  // Database/crypto exceptions can contain credentials; never print them.
  console.error(JSON.stringify({ code: 'agent_record_backfill_failed', message: 'Backfill stopped. The current seat transaction was rolled back.' }));
  process.exitCode = 1;
} finally { await closeDb(); }

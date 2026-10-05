import { responseWindow } from '../../../../shared/src/recovery.js';
import { sql } from 'drizzle-orm';
import type { Query } from '../../db/client.js';
import type { RoomRecord } from '../../db/records.js';
import { judgeAvailability } from '../judging/availability.js';
import { append } from '../audit/service.js';
export interface Control { match_id: string; ready_deadline: string; outcome: string | null; reason: string | null; turn_seconds: number; turn_extension_ms: number; paused_at: string | null; tournament_status: string; }
export async function control(roomId: string, execute: Query): Promise<Control | undefined> {
  return (await execute<Control>(sql`SELECT c.*,p.turn_seconds,COALESCE(pause.turn_extension_ms,0) AS turn_extension_ms,pause.paused_at,t.status AS tournament_status FROM tournament_match_controls c JOIN tournament_matches m ON m.id=c.match_id JOIN tournament_policies p ON p.tournament_id=m.tournament_id JOIN tournaments t ON t.id=m.tournament_id LEFT JOIN tournament_match_pauses pause ON pause.match_id=m.id WHERE m.room_id=${roomId}`))[0];
}
export async function turnDeadline(room: RoomRecord, seconds: number, execute: Query, extension = 0) {
  const last = (await execute<{ completed_at: string; turn_index: number }>(sql`SELECT completed_at,turn_index FROM turns WHERE room_id=${room.id} AND status='completed' ORDER BY turn_index DESC LIMIT 1`))[0];
  if (!room.starts_at || !room.ends_at) return null;
  return responseWindow(room.starts_at,room.ends_at,last?.completed_at ?? null,last?.turn_index ?? -1,seconds,extension);
}
export async function settleDeadline(room: RoomRecord, execute: Query) {
  if (!['waiting','live'].includes(room.status)) return;
  const c = await control(room.id,execute); if (!c || c.outcome || c.tournament_status !== 'active' || c.paused_at || judgeAvailability()) return;
  let outcome: string | null = null, reason = '', deadline: string | null = null;
  if (room.status === 'waiting' && Date.parse(c.ready_deadline) <= Date.now()) {
    const ready = await execute<{ side: string }>(sql`SELECT side FROM external_agents WHERE room_id=${room.id} AND ready=1`);
    deadline=c.ready_deadline;
    outcome=ready.length === 1 ? 'forfeit:'+ready[0]!.side : 'void';
    reason=ready.length === 1 ? 'Ready deadline missed. The ready entrant advances by forfeit.' : 'Neither entrant was ready before the deadline. No winner is awarded.';
  } else if (room.status === 'live') {
    const due = await turnDeadline(room,c.turn_seconds,execute,c.turn_extension_ms);
    if (due && Date.parse(due.at) <= Date.now()) {
      deadline=due.at; outcome='forfeit:'+(due.side === 'FOR' ? 'AGAINST' : 'FOR');
      reason=due.side+' missed the published turn deadline. The opponent advances by forfeit.';
    }
  }
  if (!outcome) return;
  await execute(sql`UPDATE tournament_match_controls SET outcome=${outcome},reason=${reason} WHERE match_id=${c.match_id} AND outcome IS NULL`);
  await execute(sql`UPDATE rooms SET status='closed',end_reason=${reason},voting_ends_at=NULL WHERE id=${room.id}`);
  const error = JSON.stringify({ code: 'tournament_administrative_result', message: reason });
  await execute(sql`UPDATE judgements SET status='insufficient',error_json=${error},lease_until=NULL WHERE room_id=${room.id}`);
  await append(execute, room.id, 'match.administrative_result', { outcome, reason, deadline, scoring: 'No AI or audience scores are fabricated.' });
  room.status='closed'; room.end_reason=reason; room.voting_ends_at=null;
}
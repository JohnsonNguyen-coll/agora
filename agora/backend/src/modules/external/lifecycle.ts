import { settleDeadline } from '../tournaments/deadlines.js';
import { sql } from 'drizzle-orm';
import { query, transaction, type Query } from '../../db/client.js';
import { append } from '../audit/service.js';
import { findRoom } from '../rooms/service.js';
export async function settleRoom(id: string, execute: Query) {
  // A write locks the row on Postgres; SQLite transactions already hold a write lock.
  await execute(sql`UPDATE rooms SET status=status WHERE id=${id}`);
  const room = await findRoom(id, execute);
  if (room.mode !== 'external') return room;
  const paused = (await execute(sql`SELECT p.match_id FROM tournament_match_pauses p JOIN tournament_matches m ON m.id=p.match_id WHERE m.room_id=${id} AND p.paused_at IS NOT NULL`)).length;
  if (paused) return room;
  await settleDeadline(room, execute);
  const now = Date.now();
  if (room.status === 'live' && room.ends_at && Date.parse(room.ends_at) <= now) {
    const votingEnd = new Date(Date.parse(room.ends_at) + 60000).toISOString();
    await execute(sql`UPDATE rooms SET status='voting',voting_ends_at=${votingEnd},end_reason='The match time has elapsed.' WHERE id=${id}`);
    await append(execute, id, 'match.ended', { mode: 'external', deadline: room.ends_at, votingEndsAt: votingEnd });
    room.status = 'voting'; room.voting_ends_at = votingEnd;
  }
  if (room.status === 'voting' && room.voting_ends_at && Date.parse(room.voting_ends_at) <= now) {
    await execute(sql`UPDATE rooms SET status='closed' WHERE id=${id}`);
    await append(execute, id, 'voting.closed', { deadline: room.voting_ends_at });
    room.status = 'closed';
  }
  return room;
}
export async function settleDue() {
  const now = new Date().toISOString();
  const rows = await query<{ id: string }>(sql`SELECT r.id FROM rooms r JOIN external_rooms e ON e.room_id=r.id
    WHERE (r.status='live' AND r.ends_at<=${now}) OR (r.status='voting' AND r.voting_ends_at<=${now})
    OR (r.status IN ('waiting','live') AND EXISTS (SELECT 1 FROM tournament_matches m JOIN tournament_match_controls c ON c.match_id=m.id WHERE m.room_id=r.id AND c.outcome IS NULL))`);
  for (const row of rows) await transaction(execute => settleRoom(row.id, execute));
}

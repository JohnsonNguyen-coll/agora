import { sql } from 'drizzle-orm';
import { query, type Query } from '../../db/client.js';
import type { Side } from '../../../../shared/src/types.js';
export async function tallyVotes(id: string, execute: Query = query): Promise<Record<Side, number>> {
  const rows = await execute<{ side: Side; count: number | string }>(sql`SELECT v.side,COUNT(*) AS count FROM votes v
    WHERE v.room_id=${id} AND (NOT EXISTS (SELECT 1 FROM room_vote_rules r WHERE r.room_id=v.room_id)
      OR EXISTS (SELECT 1 FROM verified_votes verified WHERE verified.vote_id=v.id)) GROUP BY v.side`);
  return { FOR: Number(rows.find(v => v.side === 'FOR')?.count ?? 0), AGAINST: Number(rows.find(v => v.side === 'AGAINST')?.count ?? 0) };
}
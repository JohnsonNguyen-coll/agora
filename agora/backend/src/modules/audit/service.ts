import { randomUUID } from 'node:crypto';
import { sql } from 'drizzle-orm';
import { query, type Query } from '../../db/client.js';
import { eventHash } from './hash-chain.js';
import type { AuditEvent, AuditResult } from '../../../../shared/src/types.js';
interface Row {
  id: string; room_id: string; sequence: number; type: string; payload_json: string;
  prev_hash: string | null; hash: string; created_at: string;
}
export async function append(execute: Query, roomId: string, type: string, payload: unknown) {
  const previous = (await execute<Row>(sql`SELECT * FROM audit_events WHERE room_id=${roomId} ORDER BY sequence DESC LIMIT 1`))[0];
  const event = { id: randomUUID(), roomId, sequence: (previous?.sequence ?? 0) + 1, type,
    payloadJson: JSON.stringify(payload), prevHash: previous?.hash ?? null, createdAt: new Date().toISOString() };
  const hash = eventHash(event);
  await execute(sql`INSERT INTO audit_events (id,room_id,sequence,type,payload_json,prev_hash,hash,created_at)
    VALUES (${event.id},${roomId},${event.sequence},${type},${event.payloadJson},${event.prevHash},${hash},${event.createdAt})`);
  return { ...event, hash };
}
export async function audit(roomId: string): Promise<AuditResult> {
  const rows = await query<Row>(sql`SELECT * FROM audit_events WHERE room_id=${roomId} ORDER BY sequence`);
  let previous: string | null = null, valid = true;
  const events: AuditEvent[] = rows.map((row, index) => {
    const hash = eventHash({ id: row.id, roomId: row.room_id, sequence: row.sequence, type: row.type,
      payloadJson: row.payload_json, prevHash: row.prev_hash, createdAt: row.created_at });
    if (hash !== row.hash || row.prev_hash !== previous || row.sequence !== index + 1) valid = false;
    previous = row.hash;
    return { id: row.id, roomId: row.room_id, sequence: row.sequence, type: row.type, payload: JSON.parse(row.payload_json) as unknown,
      prevHash: row.prev_hash, hash: row.hash, createdAt: row.created_at, source: 'gavel' };
  });
  return { events, valid, checked: events.length };
}

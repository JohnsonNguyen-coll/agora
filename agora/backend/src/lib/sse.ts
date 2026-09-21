import type { FastifyReply, FastifyRequest } from 'fastify';
import { sql } from 'drizzle-orm';
import { query } from '../db/client.js';
interface EventRow { sequence: number; type: string; payload_json: string; created_at: string; }
export async function streamRoom(id: string, request: FastifyRequest, reply: FastifyReply) {
  const header = request.headers['last-event-id'];
  let cursor = typeof header === 'string' && /^\d+$/.test(header) ? Number(header) : 0;
  let closed = false, busy = false;
  reply.hijack();
  for (const [name, value] of Object.entries(reply.getHeaders())) { if (value !== undefined) reply.raw.setHeader(name, value); }
  reply.raw.writeHead(200, {
    'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive', 'X-Accel-Buffering': 'no'
  });
  reply.raw.write('retry: 2000\n\n');
  async function poll() {
    if (closed || busy) return;
    busy = true;
    try {
      const events = await query<EventRow>(sql`SELECT sequence,type,payload_json,created_at FROM audit_events
        WHERE room_id=${id} AND sequence>${cursor} ORDER BY sequence LIMIT 200`);
      for (const event of events) {
        if (closed) break;
        const data = JSON.stringify({ type: event.type, payload: JSON.parse(event.payload_json) as unknown, createdAt: event.created_at });
        if (!reply.raw.write('id: ' + event.sequence + '\nevent: room.update\ndata: ' + data + '\n\n')) {
          // A slow client reconnects and resumes from its last delivered ID.
          reply.raw.end(); closed = true; break;
        }
        cursor = event.sequence;
      }
    } catch { reply.raw.end(); closed = true; }
    finally { busy = false; }
  }
  const timer = setInterval(() => { void poll(); }, 1000);
  const heartbeat = setInterval(() => { if (!closed) reply.raw.write(': heartbeat\n\n'); }, 15000);
  const reconnect = setTimeout(() => { reply.raw.end(); }, 55000);
  const cleanup = () => { closed = true; clearInterval(timer); clearInterval(heartbeat); clearTimeout(reconnect); };
  reply.raw.on('close', cleanup);
  await poll();
}

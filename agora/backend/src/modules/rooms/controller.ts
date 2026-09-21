import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { createRoom, participant, roomParams } from './schema.js';
import * as rooms from './service.js';
import { audit } from '../audit/service.js';
import { vote } from '../votes/service.js';
import { streamRoom } from '../../lib/sse.js';
import { runtime } from '../../config/runtime.js';
import { AppError } from '../../lib/errors.js';
export function roomRoutes(app: FastifyInstance) {
  app.get('/api/runtime', async () => runtime);
  app.get('/api/rooms', async () => ({ rooms: await rooms.listRooms() }));
  app.post('/api/rooms', { config: { rateLimit: { max: 10, timeWindow: '1 minute' } } }, async (req, reply) => {
    const id = await rooms.create(createRoom.parse(req.body), req.sessionId);
    return reply.code(201).send(await rooms.detail(id, req.sessionId));
  });
  app.get('/api/rooms/:id', async req => rooms.detail(roomParams.parse(req.params).id, req.sessionId));
  app.post('/api/rooms/:id/join', async req => {
    const { id } = roomParams.parse(req.params);
    await rooms.join(id, req.sessionId, participant.parse(req.body));
    return rooms.detail(id, req.sessionId);
  });
  app.post('/api/rooms/:id/ready', async req => {
    z.object({}).strict().parse(req.body);
    if (!runtime.debateAvailable) throw new AppError(503, 'live_verification_pending', runtime.reason!);
    const { id } = roomParams.parse(req.params);
    await rooms.ready(id, req.sessionId);
    return rooms.detail(id, req.sessionId);
  });
  app.post('/api/rooms/:id/vote', async req => {
    const { id } = roomParams.parse(req.params);
    await vote(id, req.sessionId, z.object({ side: z.enum(['FOR', 'AGAINST']) }).strict().parse(req.body).side);
    return rooms.detail(id, req.sessionId);
  });
  app.get('/api/rooms/:id/audit', async req => {
    const { id } = roomParams.parse(req.params);
    await rooms.findRoom(id);
    return audit(id);
  });
  app.get('/api/rooms/:id/stream', async (req, reply) => {
    const { id } = roomParams.parse(req.params);
    await rooms.findRoom(id);
    return streamRoom(id, req, reply);
  });
}

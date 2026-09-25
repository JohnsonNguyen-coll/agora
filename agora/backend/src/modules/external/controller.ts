import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { roomParams } from '../rooms/schema.js';
import * as access from './access.js';
import * as external from './service.js';
import * as rooms from '../rooms/service.js';
import { externalCreate, externalParticipant, submission, rules } from './schema.js';
import { audit } from '../audit/service.js';
import { runtime } from '../../config/runtime.js';
export function externalRoutes(app: FastifyInstance) {
  app.get('/api/agent-access', async req => ({ tokens: await access.listAccess(req.sessionId) }));
  app.post('/api/agent-access', { config: { rateLimit: { max: 5, timeWindow: '1 minute' } } }, async (req, reply) => {
    const input = z.object({ name: z.string().trim().min(2).max(40) }).strict().parse(req.body);
    reply.header('Cache-Control', 'no-store');
    return reply.code(201).send(await access.issue(req.sessionId, input.name));
  });
  app.delete('/api/agent-access/:id', async req => access.revoke(req.sessionId, roomParams.parse(req.params).id));
  app.get('/api/external/status', async () => ({ ...runtime, externalDebateAvailable: true, rules }));
  app.get('/api/external/rooms', async () => ({ rooms: await rooms.listRooms() }));
  app.get('/api/external/rooms/:id', async req => rooms.detail(roomParams.parse(req.params).id, req.sessionId));
  app.get('/api/external/rooms/:id/audit', async req => {
    const { id } = roomParams.parse(req.params); await rooms.findRoom(id); return audit(id);
  });
  app.post('/api/external/rooms', { config: { rateLimit: { max: 10, timeWindow: '1 minute' } } }, async (req, reply) => {
    const id = await external.create(externalCreate.parse(req.body), req.sessionId);
    return reply.code(201).send(await rooms.detail(id, req.sessionId));
  });
  app.post('/api/external/rooms/:id/join', async req => {
    const { id } = roomParams.parse(req.params);
    await external.join(id, req.sessionId, externalParticipant.parse(req.body));
    return rooms.detail(id, req.sessionId);
  });
  app.post('/api/external/rooms/:id/ready', async req => {
    z.object({}).strict().parse(req.body);
    const { id } = roomParams.parse(req.params); await external.ready(id, req.sessionId);
    return rooms.detail(id, req.sessionId);
  });
  app.post('/api/external/rooms/:id/arguments', async req => {
    const { id } = roomParams.parse(req.params);
    return external.submit(id, req.sessionId, submission.parse(req.body));
  });
}

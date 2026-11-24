import { participantFromProfile } from '../agent-profiles/service.js';
import type { FastifyInstance } from 'fastify';
import { ready as readyExternal } from '../external/service.js';
import { z } from 'zod';
import { roomCreation, roomParticipant, roomParams } from './schema.js';
import * as rooms from './service.js';
import { audit } from '../audit/service.js';
import { vote } from '../votes/service.js';
import { streamRoom } from '../../lib/sse.js';
import { judgeAvailability } from '../judging/availability.js';
import { runtime } from '../../config/runtime.js';
import { AppError } from '../../lib/errors.js';
export function roomRoutes(app: FastifyInstance) {
  app.get('/api/runtime', async () => {
    const judgeReason = judgeAvailability();
    return { ...runtime, judgeAvailable: judgeReason === null, judgeReason };
  });
  app.get('/api/rooms', async req => {
    const input = z.object({
      page: z.coerce.number().int().min(1).max(1000000).optional(),
      pageSize: z.coerce.number().int().min(1).max(50).default(6),
      status: z.enum(['all', 'waiting', 'live', 'closed']).default('all')
    }).parse(req.query);
    if (input.page === undefined) return { rooms: await rooms.listRooms() };
    return rooms.listRoomPage({ ...input, page: input.page });
  });
  app.post('/api/rooms', { config: { rateLimit: { max: 10, timeWindow: '1 minute' } } }, async (req, reply) => {
    const input = roomCreation.parse(req.body);
    const agent = 'agentProfileId' in input ? await participantFromProfile(input.agentProfileId, req.sessionId) : input;
    const id = await rooms.create({ ...input, ...agent }, req.sessionId);
    return reply.code(201).send(await rooms.detail(id, req.sessionId));
  });
  app.get('/api/rooms/:id', async req => rooms.detail(roomParams.parse(req.params).id, req.sessionId));
  app.post('/api/rooms/:id/join', async req => {
    const { id } = roomParams.parse(req.params);
    const input = roomParticipant.parse(req.body);
    const agent = 'agentProfileId' in input ? await participantFromProfile(input.agentProfileId, req.sessionId) : input;
    await rooms.join(id, req.sessionId, agent);
    return rooms.detail(id, req.sessionId);
  });
  app.post('/api/rooms/:id/ready', async req => {
    z.object({}).strict().parse(req.body);
    const params = roomParams.parse(req.params);
    if ((await rooms.findRoom(params.id)).mode === 'external') {
      await readyExternal(params.id, req.sessionId); return rooms.detail(params.id, req.sessionId);
    }
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

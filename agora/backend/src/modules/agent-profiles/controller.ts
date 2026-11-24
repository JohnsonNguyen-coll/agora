import type { FastifyInstance } from 'fastify';
import { participant, roomParams } from '../rooms/schema.js';
import * as profiles from './service.js';
const update = participant.omit({ latchToken: true }).extend({ latchToken: participant.shape.latchToken.optional() });
export function agentProfileRoutes(app: FastifyInstance) {
  app.get('/api/agent-profiles', async req => ({ profiles: await profiles.list(req.sessionId) }));
  app.post('/api/agent-profiles', { config: { rateLimit: { max: 15, timeWindow: '1 minute' } } }, async (req, reply) =>
    reply.code(201).send(await profiles.save(req.sessionId, participant.parse(req.body))));
  app.post('/api/agent-profiles/:id', async req =>
    profiles.save(req.sessionId, update.parse(req.body), roomParams.parse(req.params).id));
  app.delete('/api/agent-profiles/:id', async req =>
    profiles.remove(req.sessionId, roomParams.parse(req.params).id));
}

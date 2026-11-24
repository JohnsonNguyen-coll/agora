import { z } from 'zod';
import { leaderboard, record } from './rankings.js';
import type { FastifyInstance } from 'fastify';
import { participant, roomParams } from '../rooms/schema.js';
import * as profiles from './service.js';
const update = participant.omit({ latchToken: true }).extend({ latchToken: participant.shape.latchToken.optional() });
const rankingQuery = z.object({ season: z.string().regex(/^(all|\d{4}-(0[1-9]|1[0-2]))$/).default('all'), page: z.coerce.number().int().min(1).max(1000000).default(1) });
export function agentProfileRoutes(app: FastifyInstance) {
  app.get('/api/leaderboard', async req => { const input=rankingQuery.parse(req.query); return leaderboard(input.season,input.page); });
  app.get('/api/agent-profiles/:id/record', async req => { const input=rankingQuery.parse(req.query); return record(req.sessionId,roomParams.parse(req.params).id,input.season,input.page); });
  app.get('/api/agent-profiles', async req => ({ profiles: await profiles.list(req.sessionId) }));
  app.post('/api/agent-profiles', { config: { rateLimit: { max: 15, timeWindow: '1 minute' } } }, async (req, reply) =>
    reply.code(201).send(await profiles.save(req.sessionId, participant.parse(req.body))));
  app.post('/api/agent-profiles/:id', async req =>
    profiles.save(req.sessionId, update.parse(req.body), roomParams.parse(req.params).id));
  app.delete('/api/agent-profiles/:id', async req =>
    profiles.remove(req.sessionId, roomParams.parse(req.params).id));
}

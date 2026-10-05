import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { roomParams } from '../rooms/schema.js';
import { externalParticipant } from '../external/schema.js';
import { tournamentInput } from './schema.js';
import * as tournaments from './service.js';
export function tournamentRoutes(app: FastifyInstance) {
  for (const prefix of ['/api/tournaments', '/api/external/tournaments']) {
    app.get(prefix, async () => ({ tournaments: await tournaments.list() }));
    app.get(prefix + '/:id', async req => tournaments.detail(roomParams.parse(req.params).id, req.sessionId));
    app.post(prefix, { config: { rateLimit: { max: 5, timeWindow: '1 minute' } } }, async (req, reply) => {
      const id = await tournaments.create(tournamentInput.parse(req.body), req.sessionId);
      return reply.code(201).send(await tournaments.detail(id, req.sessionId));
    });
    app.post(prefix + '/:id/register', async req => {
      const { id } = roomParams.parse(req.params);
      await tournaments.register(id, req.sessionId, externalParticipant.parse(req.body));
      return tournaments.detail(id, req.sessionId);
    });
    for (const [path,action] of [['retry-judge',tournaments.retryJudge],['consent-rematch',tournaments.consentRematch]] as const) {
      app.post(prefix+'/:id/'+path,async req=>{
        const input=z.object({ matchId: z.string().uuid() }).strict().parse(req.body);
        const { id }=roomParams.parse(req.params); await action(id,req.sessionId,input.matchId);
        return tournaments.detail(id,req.sessionId);
      });
    }
    app.post(prefix+'/:id/terminate',async req=>{
      const input=z.object({ reason: z.string().trim().min(10).max(240) }).strict().parse(req.body);
      const { id }=roomParams.parse(req.params); await tournaments.terminate(id,req.sessionId,input.reason);
      return tournaments.detail(id,req.sessionId);
    });
    for (const [path, action] of [['withdraw', tournaments.withdraw], ['start', tournaments.start], ['cancel', tournaments.cancel], ['resume', tournaments.resume]] as const) {
      app.post(prefix + '/:id/' + path, async req => {
        z.object({}).strict().parse(req.body);
        const { id } = roomParams.parse(req.params); await action(id, req.sessionId);
        return tournaments.detail(id, req.sessionId);
      });
    }
  }
}
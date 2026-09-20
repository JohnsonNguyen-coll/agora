import { randomUUID } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { env } from '../config/env.js';
import { AppError } from './errors.js';
declare module 'fastify' { interface FastifyRequest { sessionId: string; } }
export function sessions(app: FastifyInstance) {
  app.decorateRequest('sessionId', '');
  app.addHook('onRequest', async (request, reply) => {
    if (!request.url.startsWith('/api/')) return;
    if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method) && request.headers.origin !== env.APP_ORIGIN)
      throw new AppError(403, 'invalid_origin', 'This request did not come from the Gavel app.');
    const signed = request.cookies.gavel_session;
    const value = signed ? request.unsignCookie(signed) : null;
    request.sessionId = value?.valid && value.value ? value.value : randomUUID();
    if (!value?.valid) reply.setCookie('gavel_session', request.sessionId, {
      httpOnly: true, signed: true, sameSite: 'lax', secure: env.NODE_ENV === 'production',
      path: '/', maxAge: 60 * 60 * 24 * 30
    });
    reply.header('Cache-Control', 'no-store');
  });
}

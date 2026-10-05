import { resolveAccount, requireAccount, publicUser } from '../modules/auth/service.js';
import { authenticate } from '../modules/external/access.js';
import { randomUUID } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { env } from '../config/env.js';
import { AppError } from './errors.js';
declare module 'fastify' { interface FastifyRequest { sessionId: string; account: ReturnType<typeof publicUser> | null; } }
export function sessions(app: FastifyInstance) {
  app.decorateRequest('sessionId', '');
  app.decorateRequest('account', null);
  app.addHook('onRequest', async (request, reply) => {
    if (!request.url.startsWith('/api/')) return;
    if (request.url.startsWith('/api/external/')) {
      request.sessionId = await authenticate(request.headers.authorization);
      await requireAccount(request.sessionId);
      reply.header('Cache-Control', 'no-store'); return;
    }
    if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method) && request.headers.origin !== env.APP_ORIGIN)
      throw new AppError(403, 'invalid_origin', 'This request did not come from the Agora app.');
    const signed = request.cookies.gavel_session;
    const value = signed ? request.unsignCookie(signed) : null;
    request.sessionId = value?.valid && value.value ? value.value : randomUUID();
    if (!value?.valid) reply.setCookie('gavel_session', request.sessionId, {
      httpOnly: true, signed: true, sameSite: 'lax', secure: env.NODE_ENV === 'production',
      path: '/', maxAge: 60 * 60 * 24 * 30
    });
    const auth = request.cookies.agora_auth ? request.unsignCookie(request.cookies.agora_auth) : null;
    if (auth?.valid && auth.value && !['/api/auth/sign-out','/api/auth/session'].includes(request.url.split('?')[0]!)) {
      const user = await resolveAccount(auth.value);
      if (user) { request.account = publicUser(user); request.sessionId = 'account:' + user.id; }
      else reply.clearCookie('agora_auth', { path: '/' });
    }
    reply.header('Cache-Control', 'no-store');
  });
  app.addHook('preHandler', async request => {
    if (request.url.startsWith('/api/') && !request.url.startsWith('/api/auth/') && !['GET','HEAD','OPTIONS'].includes(request.method))
      await requireAccount(request.sessionId);
  });
}

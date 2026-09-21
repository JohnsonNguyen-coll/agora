import Fastify from 'fastify';
import { sql } from 'drizzle-orm';
import { query } from './db/client.js';
import cookie from '@fastify/cookie';
import rateLimit from '@fastify/rate-limit';
import staticPlugin from '@fastify/static';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { ZodError } from 'zod';
import { env, projectRoot } from './config/env.js';
import { sessions } from './lib/session.js';
import { loggerOptions } from './lib/logger.js';
import { AppError } from './lib/errors.js';
import { roomRoutes } from './modules/rooms/controller.js';
export async function buildApp() {
  const app = Fastify({ logger: loggerOptions, bodyLimit: 16000, requestTimeout: 30000 });
  await app.register(cookie, { secret: env.SESSION_SECRET });
  await app.register(rateLimit, { max: 120, timeWindow: '1 minute', keyGenerator: request => {
    const cookie = request.cookies.gavel_session;
    const session = cookie ? request.unsignCookie(cookie) : null;
    return session?.valid && session.value ? session.value : request.ip;
  } });
  sessions(app);
  app.setErrorHandler((error, request, reply) => {
    if (error instanceof ZodError) return reply.code(400).send({
      code: 'invalid_input', error: 'Check the form fields and try again.',
      details: error.issues.map(issue => ({ path: issue.path.join('.'), message: issue.message }))
    });
    if (error instanceof AppError) return reply.code(error.statusCode).send({
      code: error.code, error: error.message, details: error.details
    });
    if (error instanceof Error && 'statusCode' in error && typeof error.statusCode === 'number' && error.statusCode < 500)
      return reply.code(error.statusCode).send({ code: 'request_rejected', error: error.message });
    request.log.error({ errorType: error instanceof Error ? error.name : 'UnknownError' }, 'Request failed');
    return reply.code(500).send({ code: 'server_error', error: 'The request could not be completed.' });
  });
  app.get('/health', async (_request, reply) => {
    reply.header('Cache-Control', 'no-store');
    try { await query(sql`SELECT 1`); return { status: 'ok' }; }
    catch { return reply.code(503).send({ status: 'unavailable' }); }
  });
  roomRoutes(app);
  const root = resolve(projectRoot, 'frontend/dist');
  if (env.SERVE_FRONTEND === 'true' && existsSync(root)) {
    await app.register(staticPlugin, { root });
    app.setNotFoundHandler((req, reply) => req.url.startsWith('/api/')
      ? reply.code(404).send({ code: 'not_found', error: 'Route not found.' })
      : reply.sendFile('index.html'));
  }
  return app;
}

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { resolve } from 'node:path';
import type { FastifyBaseLogger } from 'fastify';
import { env, projectRoot } from './env.js';
const run = promisify(execFile);

// Each production container verifies its own real connection before accepting matches.
export async function verifyDeployment(log: FastifyBaseLogger) {
  if (env.NODE_ENV !== 'production') return;
  const checks = [
    { name: 'hosted', script: 'latch-smoke', configured: Boolean(process.env.LATCH_SMOKE_TOKEN && process.env.LATCH_MODEL) },
    { name: 'judge', script: 'judge-smoke', configured: Boolean(env.JUDGE_LATCH_TOKEN && env.JUDGE_MODEL) }
  ];
  for (const check of checks) {
    if (!check.configured) {
      log.warn({ check: check.name }, 'Live verification requires the configured Latch token and model.');
      continue;
    }
    try {
      await run(process.execPath, [resolve(projectRoot, 'backend/dist/backend/scripts', check.script + '.js')],
        { cwd: resolve(projectRoot, 'backend'), timeout: 90000, maxBuffer: 65536 });
      log.info({ check: check.name }, 'Deployment live streaming verification passed.');
    } catch {
      log.error({ check: check.name }, 'Deployment live streaming verification failed. Matches remain gated.');
    }
  }
}

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { env, projectRoot } from './env.js';
export function hostedAvailability(): string | null {
  try {
    const proof = JSON.parse(readFileSync(resolve(projectRoot, 'data/latch-smoke.json'), 'utf8'));
    if (proof.passed === true && proof.proxy === env.LATCH_PROXY_BASE && proof.deltas > 0 && proof.observation?.status === 200) return null;
  } catch { /* A real streaming proof is required. */ }
  return 'Run npm run smoke:latch against the configured proxy before starting hosted matches.';
}
export const runtime = { get debateAvailable() { return hostedAvailability() === null; }, get reason() { return hostedAvailability(); } };

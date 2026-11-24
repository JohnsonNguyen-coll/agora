import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { env, projectRoot } from './env.js';
export function hostedAvailability(): string | null {
  for (const file of ['latch-smoke.json', 'judge-smoke.json']) {
    try {
      const proof = JSON.parse(readFileSync(resolve(projectRoot, 'data', file), 'utf8'));
      if (proof.passed === true && proof.proxy === env.LATCH_PROXY_BASE && proof.deltas > 0 && proof.observation?.status === 200) return null;
    } catch { /* Only a successful real stream through this proxy unlocks hosting. */ }
  }
  return env.NODE_ENV === 'production'
    ? 'Automated matches are waiting for live Latch verification on this deployment. Configure a judge latch or LATCH_SMOKE_TOKEN and LATCH_MODEL on Railway, then redeploy. If already configured, check the deployment verification logs.'
    : 'Run npm run smoke:latch against the configured proxy before starting hosted matches.';
}
export const runtime = { get debateAvailable() { return hostedAvailability() === null; }, get reason() { return hostedAvailability(); } };

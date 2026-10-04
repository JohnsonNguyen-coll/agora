import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { env, projectRoot } from '../../config/env.js';
export function judgeFingerprint() {
  return createHash('sha256').update(JSON.stringify([env.JUDGE_LATCH_TOKEN, env.JUDGE_MODEL, env.LATCH_PROXY_BASE])).digest('hex');
}
export function judgeAvailability() {
  if (!env.JUDGE_LATCH_TOKEN || !env.JUDGE_MODEL) return 'Configure JUDGE_LATCH_TOKEN and JUDGE_MODEL to enable real judging.';
  try {
    const proof: unknown = JSON.parse(readFileSync(resolve(projectRoot, 'data/judge-smoke.json'), 'utf8'));
    if (typeof proof === 'object' && proof !== null && 'passed' in proof && proof.passed === true &&
      'fingerprint' in proof && proof.fingerprint === judgeFingerprint()) return null;
  } catch { /* A missing live verification is not a pass. */ }
  return 'Run npm run smoke:judge with the configured judge latch before enabling judging.';
}
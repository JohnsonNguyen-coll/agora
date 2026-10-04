import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { env, projectRoot } from '../src/config/env.js';
import { callModel } from '../src/modules/latch/client.js';
import { LatchError } from '../src/modules/latch/types.js';
import { judgeFingerprint } from '../src/modules/judging/availability.js';
if (!env.JUDGE_LATCH_TOKEN || !env.JUDGE_MODEL) {
  console.error('Set JUDGE_LATCH_TOKEN and JUDGE_MODEL in agora/.env. No simulated run is available.');
  process.exitCode = 1;
} else {
  try {
    let deltas = 0;
    const result = await callModel(env.JUDGE_LATCH_TOKEN, { model: env.JUDGE_MODEL, stream: true, max_tokens: 40,
      messages: [{ role: 'user', content: 'State one short principle for impartial debate judging.' }] }, () => { deltas++; });
    if (!deltas || !result.text.trim()) throw new Error('No real streaming text received.');
    const proof = { passed: true, checkedAt: new Date().toISOString(), fingerprint: judgeFingerprint(),
      model: result.model, inputTokens: result.inputTokens, outputTokens: result.outputTokens, observation: result.observation };
    await mkdir(resolve(projectRoot, 'data'), { recursive: true });
    await writeFile(resolve(projectRoot, 'data/judge-smoke.json'), JSON.stringify(proof, null, 2));
    console.log('Real judge latch streaming passed. Run a complete real match to verify the rubric and verdict end to end.');
  } catch (error) {
    console.error(error instanceof LatchError ? JSON.stringify({ code: error.code, observation: error.observation }) : 'Live judge smoke failed.');
    process.exitCode = 1;
  }
}
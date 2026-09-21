import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { env, projectRoot } from '../src/config/env.js';
import { callModel } from '../src/modules/latch/client.js';
import { LatchError } from '../src/modules/latch/types.js';
const token = process.env.LATCH_SMOKE_TOKEN, model = process.env.LATCH_MODEL;
if (!token || !model) {
  console.error('Live smoke blocked: set LATCH_SMOKE_TOKEN and LATCH_MODEL in agora/.env. No simulated run is available.');
  process.exitCode = 1;
} else {
  try {
    let deltas = 0;
    const result = await callModel(token, {
      model, stream: true, max_tokens: 40,
      messages: [{ role: 'user', content: 'State one concise reason that public debate can improve a decision.' }]
    }, () => { deltas += 1; });
    if (!deltas || !result.text.trim()) throw new Error('No real text deltas received.');
    const report = { passed: true, checkedAt: new Date().toISOString(), proxy: env.LATCH_PROXY_BASE,
      model: result.model, deltas, inputTokens: result.inputTokens, outputTokens: result.outputTokens,
      observation: result.observation };
    await mkdir(resolve(projectRoot, 'data'), { recursive: true });
    await writeFile(resolve(projectRoot, 'data/latch-smoke.json'), JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
  } catch (error) {
    console.error(error instanceof LatchError ? JSON.stringify({ code: error.code, observation: error.observation }) : 'Live smoke failed.');
    process.exitCode = 1;
  }
}

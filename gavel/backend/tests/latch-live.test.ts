import test from 'node:test';
import assert from 'node:assert/strict';
import '../src/config/env.js';
import { callModel } from '../src/modules/latch/client.js';
test('a participant-owned latch streams a real model completion', { timeout: 95000 }, async () => {
  const token = process.env.LATCH_SMOKE_TOKEN, model = process.env.LATCH_MODEL;
  assert.ok(token, 'Set LATCH_SMOKE_TOKEN in gavel/.env; this test never substitutes a proxy.');
  assert.ok(model, 'Set LATCH_MODEL to a model allowed by the throwaway latch.');
  const deltas: string[] = [];
  const result = await callModel(token, {
    model, max_tokens: 40, stream: true,
    messages: [{ role: 'user', content: 'Give one short argument for transparent public debate.' }]
  }, text => { deltas.push(text); });
  assert.ok(deltas.length > 0);
  assert.equal(deltas.join(''), result.text);
  assert.ok(result.text.trim());
  assert.equal(result.observation.status, 200);
});

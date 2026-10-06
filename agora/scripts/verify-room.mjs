import { config } from 'dotenv';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { finalVerdict } from '../shared/src/judging.ts';
config({ path: '.env' });
const id = process.env.ROOM_VERIFY_ID;
if (!id || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) throw new Error('Set ROOM_VERIFY_ID to a real completed room UUID. No room is seeded.');
const base = process.env.ROOM_VERIFY_BASE || 'http://localhost:3001';
async function read(path) {
  const response = await fetch(base + '/api' + path, { signal: AbortSignal.timeout(15000) });
  assert.equal(response.status, 200, 'The real room API must succeed');
  return response.json();
}
const [room, audit] = await Promise.all([read('/rooms/' + id), read('/rooms/' + id + '/audit')]);
assert.equal(room.id, id); assert.equal(room.status, 'closed');
assert.ok(room.startsAt && room.endsAt, 'The match must actually have started and ended');
assert.equal(room.agents.length, 2); assert.equal(new Set(room.agents.map(a => a.side)).size, 2);
for (const side of ['FOR', 'AGAINST']) assert.ok(room.transcript.some(t => t.side === side && t.status === 'completed' && t.content.trim()), 'Each side must complete a real argument');
assert.equal(room.votingRule, 'verified-account-v1');
assert.equal(room.judgement?.status, 'completed'); assert.equal(room.judgement.passes.length, 2);
assert.ok(room.verdict, 'A real completed judge assessment must produce a verdict');
assert.deepEqual(room.verdict, finalVerdict(room.votes, room.judgement), 'The verdict must match actual votes and judge scores');
assert.equal(audit.valid, true); assert.ok(audit.checked > 0);
const responses = audit.events.filter(e => e.type === 'judge.proxy_response' && e.payload?.observation?.status === 200);
assert.ok(responses.length >= 2, 'Two successful real judge proxy responses must be recorded');
const proof = { passed: true, checkedAt: new Date().toISOString(), roomId: id, mode: room.mode, completedTurns: room.transcript.filter(t => t.status === 'completed').length, audienceVotes: room.votes.FOR + room.votes.AGAINST, verdict: room.verdict, auditChecked: audit.checked, liveOtpDeliveryChecked: false, latchMcpRoutingProven: false, latchSignedReceipt: false };
await mkdir('data/qa', { recursive: true });
await writeFile('data/qa/room-' + id + '.json', JSON.stringify(proof, null, 2));
console.log(JSON.stringify(proof));

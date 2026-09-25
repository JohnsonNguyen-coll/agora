import assert from 'node:assert/strict';
import { checkExternalRoomUi } from './check-external-room-ui.mjs';
import { randomBytes, randomUUID } from 'node:crypto';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
const inputPath = process.argv[2];
assert.ok(inputPath, 'Supply a JSON file with a real topic, forArgument and againstArgument. No transcripts are seeded.');
const input = JSON.parse(await readFile(inputPath, 'utf8'));
for (const key of ['topic', 'forArgument', 'againstArgument']) assert.equal(typeof input[key], 'string');
const temporary = await mkdtemp(resolve(tmpdir(), 'agora-mcp-'));
Object.assign(process.env, { NODE_ENV: 'test', DATABASE_URL: 'file:' + resolve(temporary, 'smoke.db'),
  SESSION_SECRET: randomBytes(32).toString('hex'), TOKEN_ENCRYPTION_KEY: randomBytes(32).toString('hex'),
  APP_ORIGIN: 'http://localhost:5173', SERVE_FRONTEND: 'true' });
const { migrate, closeDb } = await import('../backend/dist/backend/src/db/client.js');
const { buildApp } = await import('../backend/dist/backend/src/app.js');
await migrate(); await migrate();
const app = await buildApp(); app.log.level = 'silent';
const base = await app.listen({ port: 0, host: '127.0.0.1' });
const clients = [];
async function http(path, { cookie, body, method } = {}) {
  const res = await fetch(base + '/api' + path, { method: method ?? (body ? 'POST' : 'GET'),
    headers: { Origin: process.env.APP_ORIGIN, ...(cookie ? { Cookie: cookie } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}) });
  return { status: res.status, body: await res.json(), cookie: res.headers.get('set-cookie')?.split(';')[0] };
}
async function connect(name) {
  const issued = await http('/agent-access', { body: { name } });
  assert.equal(issued.status, 201);
  const transport = new StdioClientTransport({ command: process.execPath, args: [resolve('mcp/dist/server.js')],
    env: { ...process.env, AGORA_API_URL: base, AGORA_ACCESS_TOKEN: issued.body.token }, stderr: 'pipe' });
  const client = new Client({ name: 'agora-integration-check', version: '0.1.0' });
  clients.push(client); await client.connect(transport);
  return { client, access: issued.body, cookie: issued.cookie };
}
async function tool(owner, name, args = {}, expected = 200) {
  const result = await owner.client.callTool({ name, arguments: args });
  const envelope = JSON.parse(result.content[0].text);
  assert.equal(envelope.httpStatus, expected, envelope.body);
  const body = JSON.parse(envelope.body);
  assert.ok(!JSON.stringify(result).includes(owner.access.token));
  return body;
}
try {
  const a = await connect('FOR verification'), b = await connect('AGAINST verification'), observer = await connect('Observer verification');
  assert.ok((await a.client.listTools()).tools.some(t => t.name === 'agora_submit_argument'));
  assert.equal((await tool(a, 'agora_status')).externalDebateAvailable, true);
  const room = await tool(a, 'agora_create_room', { topic: input.topic, durationMinutes: 1, side: 'FOR', name: 'Codex verification FOR', model: 'external-self-reported' }, 201);
  const roomId = room.id;
  assert.equal(room.mode, 'external');
  assert.equal(room.transcript.length, 0);
  await tool(b, 'agora_join_room', { roomId, name: 'Codex verification AGAINST', model: 'external-self-reported' });
  await tool(observer, 'agora_ready', { roomId }, 403);
  await tool(a, 'agora_ready', { roomId });
  const started = await tool(b, 'agora_ready', { roomId }); assert.equal(started.status, 'live');
  const first = { roomId, expectedTurnIndex: 0, submissionId: randomUUID(), content: input.forArgument };
  await tool(b, 'agora_submit_argument', first, 409);
  await tool(observer, 'agora_submit_argument', first, 403);
  const accepted = await tool(a, 'agora_submit_argument', first);
  assert.equal((await tool(a, 'agora_submit_argument', first)).turnId, accepted.turnId);
  await tool(a, 'agora_submit_argument', { ...first, content: input.againstArgument }, 409);
  await tool(b, 'agora_submit_argument', { roomId, expectedTurnIndex: 1, submissionId: randomUUID(), content: input.againstArgument });
  await tool(a, 'agora_submit_argument', { ...first, expectedTurnIndex: 2, submissionId: randomUUID() }, 429);
  const recorded = await tool(a, 'agora_get_room', { roomId });
  assert.equal(recorded.transcript.length, 2); assert.equal(recorded.transcript[0].tokensUsed, null);
  await checkExternalRoomUi(base, roomId, input);
  const audit = await tool(a, 'agora_get_audit', { roomId }); assert.equal(audit.valid, true);
  assert.equal((await http('/agent-access/' + a.access.id, { method: 'DELETE', cookie: b.cookie })).status, 404);
  const extra = await http('/agent-access', { cookie: a.cookie, body: { name: 'Same identity' } });
  const selfJoin = await fetch(base + '/api/external/rooms/' + roomId + '/join', {
    method: 'POST', headers: { Authorization: 'Bearer ' + extra.body.token, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Same owner', model: 'self-reported' }) });
  assert.equal(selfJoin.status, 409);
  console.log('MCP transport, real submissions, retry safety, turn enforcement, cooldown and ownership checks passed. Waiting for the real deadline.');
  await new Promise(r => setTimeout(r, Math.max(0, Date.parse(started.endsAt) - Date.now()) + 1200));
  assert.equal((await tool(a, 'agora_get_room', { roomId })).status, 'voting');
  await tool(a, 'agora_submit_argument', { ...first, expectedTurnIndex: 2, submissionId: randomUUID() }, 409);
  assert.equal((await http('/rooms/' + roomId + '/vote', { cookie: observer.cookie, body: { side: 'FOR' } })).status, 200);
  assert.equal((await http('/rooms/' + roomId + '/vote', { cookie: observer.cookie, body: { side: 'FOR' } })).status, 409);
  const voting = await tool(a, 'agora_get_room', { roomId });
  console.log('Real deadline opened voting and rejected late arguments. Waiting for the voting deadline.');
  await new Promise(r => setTimeout(r, Math.max(0, Date.parse(voting.votingEndsAt) - Date.now()) + 1200));
  assert.equal((await tool(a, 'agora_get_room', { roomId })).status, 'closed');
  assert.equal((await tool(a, 'agora_get_audit', { roomId })).valid, true);
  assert.equal((await http('/agent-access/' + a.access.id, { method: 'DELETE', cookie: a.cookie })).status, 200);
  assert.equal((await tool(a, 'agora_status', {}, 401)).code, 'access_revoked');
  assert.equal((await http('/external/status')).status, 401);
  console.log(JSON.stringify({ passed: true, realMcpClients: 3, externalTurns: 2, deadlineAndVoting: true, revocation: true, productionRoomsCreated: 0 }));
} finally {
  await Promise.allSettled(clients.map(client => client.close()));
  await app.close(); await closeDb();
}

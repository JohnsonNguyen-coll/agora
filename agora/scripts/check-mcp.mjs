import assert from 'node:assert/strict';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { parse } from 'dotenv';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
const mode = process.argv[2] ?? 'allow';
assert.ok(['allow', 'deny', 'auth-rejected'].includes(mode), 'Choose allow, deny or auth-rejected.');
const envFile = resolve('.env.mcp');
const settings = parse(await readFile(envFile, 'utf8'));
if (!settings.LATCH_MCP_TOKEN?.trim()) {
  console.error('Live MCP check blocked: configure LATCH_MCP_TOKEN in .env.mcp with a real latch pointing to a reachable HTTPS Agora deployment.');
  process.exitCode = 1;
} else {
  const client = new Client({ name: 'agora-latch-live-check', version: '0.1.0' });
  const transport = new StdioClientTransport({ command: process.execPath, args: [resolve('mcp/dist/server.js'), envFile], stderr: 'inherit' });
  try {
    await client.connect(transport);
    assert.ok((await client.listTools()).tools.some(t => t.name === 'agora_status'));
    const result = await client.callTool({ name: 'agora_status', arguments: {} });
    assert.equal(result.content[0].type, 'text');
    const observed = JSON.parse(result.content[0].text);
    assert.ok(!JSON.stringify(result).includes(settings.LATCH_MCP_TOKEN));
    if (mode === 'allow') {
      assert.equal(observed.httpStatus, 200, 'Expected a real successful Latch proxy response.');
      assert.equal(JSON.parse(observed.body).externalDebateAvailable, true);
    } else if (mode === 'deny') {
      assert.equal(observed.httpStatus, 403, 'Expected the configured policy to deny this path.');
      assert.equal(observed.category, 'policy_denial', 'A generic upstream 403 does not establish a Latch policy denial.');
      assert.equal(observed.auditSaved, true);
    } else {
      assert.equal(observed.httpStatus, 401, 'Expected an observed authentication rejection after manual revocation.');
      assert.equal(observed.category, 'auth_rejection');
      assert.equal(observed.auditSaved, true);
    }
    await mkdir(resolve('data/mcp'), { recursive: true });
    await writeFile(resolve('data/mcp/live-' + mode + '.json'), JSON.stringify({
      checkedAt: new Date().toISOString(), mode, httpStatus: observed.httpStatus,
      category: observed.category, headers: observed.headers, note: 'Observed live response; no signed origin proof. A 401 does not distinguish expiry from revocation.'
    }, null, 2));
    console.log(JSON.stringify({ passed: true, mode, httpStatus: observed.httpStatus, category: observed.category }));
  } finally { await client.close(); }
}

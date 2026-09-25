import { config } from 'dotenv';
import { dirname, resolve } from 'node:path';
const envFile = process.argv[2];
if (envFile) {
  const result = config({ path: resolve(envFile), override: true });
  if (result.error) throw new Error('Cannot read the configured MCP credential file.');
}
if (process.env.AGORA_ACCESS_TOKEN?.trim())
  throw new Error('Remove AGORA_ACCESS_TOKEN from the MCP environment. Store it in Latch Secrets instead.');
export const latchToken = process.env.LATCH_MCP_TOKEN?.trim();
if (!latchToken || !/^lat_[A-Za-z0-9_-]+$/.test(latchToken))
  throw new Error('Set LATCH_MCP_TOKEN in the private MCP env file. No direct Agora fallback is available.');
// Fixed production origin prevents a config typo from leaking the latch to another host.
export const proxyBase = 'https://onlatch.com/proxy';
export const auditPath = resolve(envFile ? dirname(resolve(envFile)) : process.cwd(), 'data/mcp/latch-observations.jsonl');

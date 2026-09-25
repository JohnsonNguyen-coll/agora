import { mkdir, writeFile, access, readFile, appendFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
const root = fileURLToPath(new URL('../', import.meta.url));
const envFile = resolve(root, '.env.mcp');
try { await access(envFile); } catch {
  await writeFile(envFile, '# Store the Agora access token in Latch Secrets, not here.\nLATCH_MCP_TOKEN=\n', { mode: 0o600, flag: 'wx' });
}
const existing = await readFile(envFile, 'utf8');
if (!/^LATCH_MCP_TOKEN=/m.test(existing)) await appendFile(envFile, '\n# Agora MCP now routes through Latch. Move old Agora credentials into Latch Secrets.\nLATCH_MCP_TOKEN=\n');
const command = process.execPath, args = [resolve(root, 'mcp/dist/server.js'), envFile];
const destination = resolve(root, 'data/mcp');
await mkdir(destination, { recursive: true });
await writeFile(resolve(destination, 'codex.toml'), '[mcp_servers.agora]\ncommand = ' + JSON.stringify(command.replaceAll('\\', '/')) +
  '\nargs = ' + JSON.stringify(args.map(p => p.replaceAll('\\', '/'))) + '\n');
const config = JSON.stringify({ mcpServers: { agora: { command, args } } }, null, 2) + '\n';
await writeFile(resolve(destination, 'claude-code.json'), config);
await writeFile(resolve(destination, 'claude-desktop.json'), config);
console.log('Config snippets saved under data/mcp. Set LATCH_MCP_TOKEN in .env.mcp. Remove old AGORA_ACCESS_TOKEN and AGORA_API_URL entries; store the Agora credential in Latch Secrets. Existing env files and client settings were not overwritten.');

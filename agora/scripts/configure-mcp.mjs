import { mkdir, writeFile, access } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
const root = fileURLToPath(new URL('../', import.meta.url));
const envFile = resolve(root, '.env.mcp');
try { await access(envFile); } catch {
  await writeFile(envFile, 'AGORA_API_URL=http://localhost:5173\nAGORA_ACCESS_TOKEN=\n', { mode: 0o600, flag: 'wx' });
}
const command = process.execPath, args = [resolve(root, 'mcp/dist/server.js'), envFile];
const destination = resolve(root, 'data/mcp');
await mkdir(destination, { recursive: true });
await writeFile(resolve(destination, 'codex.toml'), '[mcp_servers.agora]\ncommand = ' + JSON.stringify(command.replaceAll('\\', '/')) +
  '\nargs = ' + JSON.stringify(args.map(p => p.replaceAll('\\', '/'))) + '\n');
const config = JSON.stringify({ mcpServers: { agora: { command, args } } }, null, 2) + '\n';
await writeFile(resolve(destination, 'claude-code.json'), config);
await writeFile(resolve(destination, 'claude-desktop.json'), config);
console.log('Config snippets saved under data/mcp. Add an Agora access token to .env.mcp locally. Existing env files and client settings were not overwritten.');

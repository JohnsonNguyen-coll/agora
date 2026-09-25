import { config } from 'dotenv';
import { resolve } from 'node:path';
const envFile = process.argv[2];
if (envFile) {
  const result = config({ path: resolve(envFile) });
  if (result.error) throw new Error('Cannot read the configured Agora credential file.');
}
const rawBase = process.env.AGORA_API_URL, token = process.env.AGORA_ACCESS_TOKEN;
if (!rawBase || !token || !/^agora_[a-f0-9]{64}$/.test(token))
  throw new Error('Set AGORA_API_URL and AGORA_ACCESS_TOKEN in the private MCP env file.');
const base = new URL(rawBase);
if (base.origin !== rawBase || base.username || base.password ||
    (base.protocol !== 'https:' && !(base.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(base.hostname))))
  throw new Error('AGORA_API_URL must be an HTTPS origin, or loopback HTTP for local development.');
export async function call(path: string, body?: unknown) {
  let response: Response;
  try {
    response = await fetch(base.origin + '/api/external' + path, {
      method: body === undefined ? 'GET' : 'POST', redirect: 'error',
      headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }), signal: AbortSignal.timeout(15000)
    });
  } catch {
    return { isError: true, content: [{ type: 'text' as const, text: 'Agora could not be reached. Retry by reading the room first; a previous submission may have been saved.' }] };
  }
  const text = await response.text();
  if (text.includes(token!)) return { isError: true, content: [{ type: 'text' as const, text: 'Credential reflection blocked.' }] };
  return { isError: !response.ok, content: [{ type: 'text' as const, text: JSON.stringify({ httpStatus: response.status, body: text }) }] };
}

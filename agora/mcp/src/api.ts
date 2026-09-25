import { mkdir, appendFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { latchToken, proxyBase, auditPath } from './config.js';
interface Observation {
  timestamp: string; path: string; method: string; source: 'mcp-client-observation';
  category: string; httpStatus: number | null; body: string; headers: Record<string, string>;
}
function category(status: number, body: string) {
  if (status === 401) return 'auth_rejection'; // Expired and revoked are not distinguishable from status alone.
  if (status === 429) return 'rate_rejection';
  if (status === 403) {
    try {
      const parsed: unknown = JSON.parse(body);
      if (typeof parsed === 'object' && parsed !== null && 'deniedBy' in parsed && typeof parsed.deniedBy === 'string')
        return 'policy_denial';
    } catch { /* Preserve the original body even when it is not JSON. */ }
  }
  if (status === 502) return 'gateway_failure';
  return status >= 400 ? 'http_rejection' : 'success';
}
async function result(observation: Observation, isError: boolean) {
  if (JSON.stringify(observation).includes(latchToken!)) {
    observation.body = 'Credential reflection blocked; the response was not recorded.';
    observation.headers = {}; observation.category = 'credential_reflection'; isError = true;
  }
  let auditSaved: boolean | null = null;
  if (isError) {
    try {
      await mkdir(dirname(auditPath), { recursive: true });
      await appendFile(auditPath, JSON.stringify(observation) + '\n', { mode: 0o600 });
      auditSaved = true;
    } catch { auditSaved = false; }
  }
  // body is the verbatim observed response, encoded as a JSON string without rewriting it.
  return { isError, content: [{ type: 'text' as const, text: JSON.stringify({ ...observation, auditSaved }) }] };
}
export async function call(path: string, body?: unknown) {
  if (!/^\/(status|rooms(?:\/[a-f0-9-]{36}(?:\/(audit|join|ready|arguments))?)?)$/.test(path))
    throw new Error('Unsupported Agora MCP route.');
  const method = body === undefined ? 'GET' : 'POST';
  const observation: Observation = { timestamp: new Date().toISOString(), path: '/api/external' + path,
    method, source: 'mcp-client-observation', category: 'network_failure', httpStatus: null, body: '', headers: {} };
  let response: Response | undefined;
  try {
    response = await fetch(proxyBase + observation.path, {
      method, redirect: 'error', headers: { Authorization: 'Bearer ' + latchToken,
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }), signal: AbortSignal.timeout(15000)
    });
    observation.httpStatus = response.status;
    for (const key of ['x-latch-request-id', 'x-latch-link-id', 'x-latch-mount', 'retry-after']) {
      const value = response.headers.get(key); if (value !== null) observation.headers[key] = value;
    }
    observation.body = await response.text();
    if (JSON.stringify(observation).includes(latchToken!)) {
      observation.body = 'Credential reflection blocked; the response was not recorded.';
      observation.headers = {}; observation.category = 'credential_reflection';
      return result(observation, true);
    }
    observation.category = category(response.status, observation.body);
    return result(observation, !response.ok);
  } catch (error) {
    observation.category = error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError') ? 'local_timeout' : 'network_failure';
    observation.body = 'The Latch request did not complete. Read the room before retrying: an earlier submission may have been saved.';
    return result(observation, true);
  }
}

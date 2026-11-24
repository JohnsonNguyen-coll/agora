import type { ApiError } from '../../../shared/src/types';
export class RequestError extends Error {
  constructor(public status: number, public payload: ApiError) { super(payload.error); }
}
export async function api<T>(path: string, body?: unknown, method: 'GET' | 'POST' | 'DELETE' = body === undefined ? 'GET' : 'POST'): Promise<T> {
  let response: Response;
  try {
    response = await fetch('/api' + path, {
      method, credentials: 'same-origin',
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body)
    });
  } catch { throw new Error('Unable to reach Agora. Check your connection and try again.'); }
  let value: unknown;
  try {
    value = await response.json();
  } catch {
    throw new Error(`Agora could not load this request (HTTP ${response.status}). Please try again shortly.`);
  }
  if (!response.ok) {
    if (value && typeof value === 'object' && 'error' in value && typeof value.error === 'string')
      throw new RequestError(response.status, value as ApiError);
    throw new Error(`Agora could not complete this request (HTTP ${response.status}).`);
  }
  return value as T;
}

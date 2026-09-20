import type { ApiError } from '../../../shared/src/types';
export class RequestError extends Error {
  constructor(public status: number, public payload: ApiError) { super(payload.error); }
}
export async function api<T>(path: string, body?: unknown): Promise<T> {
  let response: Response;
  try {
    response = await fetch('/api' + path, {
      method: body === undefined ? 'GET' : 'POST', credentials: 'same-origin',
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body)
    });
  } catch { throw new Error('Unable to reach Gavel. Check your connection and try again.'); }
  const value: unknown = await response.json();
  if (!response.ok) throw new RequestError(response.status, value as ApiError);
  return value as T;
}

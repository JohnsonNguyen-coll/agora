import { z } from 'zod';
import { env } from '../../config/env.js';
import { consumeStream } from './stream.js';
import { LatchError, modelBody, type CallOptions, type ModelBody, type Observation } from './types.js';
const denial = z.object({ error: z.string(), deniedBy: z.string(), reason: z.string().optional() });
function classify(status: number, raw: string) {
  if (status === 429) return 'rate_limit';
  if (status === 401) return 'authentication_rejected';
  if (status === 403) {
    try { if (denial.safeParse(JSON.parse(raw)).success) return 'policy_denial'; } catch { /* Raw body is retained. */ }
  }
  return status === 502 ? 'gateway_failure' : 'http_error';
}
export async function callModel(token: string, input: ModelBody, onDelta: (text: string) => void | Promise<void>, options: CallOptions = {}) {
  z.string().regex(/^lat_[A-Za-z0-9_-]+$/).parse(token);
  const body = modelBody.parse(input);
  const signal = options.signal
    ? AbortSignal.any([options.signal, AbortSignal.timeout(90000)]) : AbortSignal.timeout(90000);
  let observation: Observation | undefined;
  try {
    const response = await fetch(env.LATCH_PROXY_BASE.replace(/\/$/, '') + '/v1/messages', {
      method: 'POST', redirect: 'error', signal,
      headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json', 'anthropic-version': '2023-06-01' },
      body: JSON.stringify(body)
    });
    observation = {
      status: response.status, rawBody: null, contentType: response.headers.get('content-type'),
      requestId: response.headers.get('x-latch-request-id'), latchId: response.headers.get('x-latch-link-id'),
      retryAfter: response.headers.get('retry-after')
    };
    if (!response.ok) {
      const raw = await response.text();
      if (raw.includes(token)) throw new LatchError('credential_reflection', 'The proxy reflected a credential; response withheld.');
      observation.rawBody = raw;
      await options.onResponse?.(observation);
      throw new LatchError(classify(response.status, raw), raw || 'Proxy returned HTTP ' + response.status, observation);
    }
    await options.onResponse?.(observation);
    if (!response.body || !observation.contentType?.includes('text/event-stream'))
      throw new LatchError('protocol_error', 'Expected a model event stream.', observation);
    const completion = await consumeStream(response.body, onDelta);
    return { ...completion, observation };
  } catch (error) {
    if (error instanceof LatchError) throw error;
    if (signal.aborted) throw new LatchError(options.signal?.aborted ? 'cancelled' : 'local_timeout',
      options.signal?.aborted ? 'The request was cancelled locally.' : 'The local request deadline was exceeded.', observation);
    if (error instanceof z.ZodError || error instanceof SyntaxError)
      throw new LatchError('protocol_error', 'The model returned an invalid event payload.', observation);
    throw new LatchError('network_error', 'Could not complete the connection to Latch.', observation);
  }
}

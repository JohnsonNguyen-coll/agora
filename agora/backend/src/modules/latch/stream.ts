import { z } from 'zod';
import { LatchError } from './types.js';
const envelope = z.object({ type: z.string() }).passthrough();
const start = z.object({ message: z.object({
  model: z.string(), usage: z.object({ input_tokens: z.number().int().nonnegative(), output_tokens: z.number().int().nonnegative() })
}) });
const delta = z.object({ delta: z.discriminatedUnion('type', [
  z.object({ type: z.literal('text_delta'), text: z.string() }),
  z.object({ type: z.literal('input_json_delta'), partial_json: z.string() }),
  z.object({ type: z.literal('thinking_delta'), thinking: z.string() }),
  z.object({ type: z.literal('signature_delta'), signature: z.string() })
]) });
const usage = z.object({ usage: z.object({ output_tokens: z.number().int().nonnegative() }) });
export async function consumeStream(body: ReadableStream<Uint8Array>, onDelta: (text: string) => void | Promise<void>) {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '', text = '', model: string | null = null;
  let inputTokens: number | null = null, outputTokens: number | null = null;
  let complete = false, started = false;
  async function frame(value: string) {
    const lines = value.split(/\r?\n/).filter(line => line.startsWith('data:'));
    if (!lines.length) return;
    const raw = lines.map(line => line.slice(5).replace(/^ /, '')).join('\n');
    const parsed: unknown = JSON.parse(raw);
    const event = envelope.parse(parsed);
    if (event.type === 'message_start') {
      const item = start.parse(event).message;
      started = true; model = item.model;
      inputTokens = item.usage.input_tokens; outputTokens = item.usage.output_tokens;
    } else if (event.type === 'content_block_delta') {
      const result = delta.safeParse(event);
      if (!result.success) {
        const type = z.object({ delta: z.object({ type: z.string() }) }).parse(event).delta.type;
        if (type === 'text_delta') throw new LatchError('protocol_error', 'Invalid text delta.');
        return;
      }
      if (result.data.delta.type === 'text_delta') {
        text += result.data.delta.text;
        if (text.length > 100000) throw new LatchError('protocol_error', 'Response exceeded the text limit.');
        await onDelta(result.data.delta.text);
      }
    } else if (event.type === 'message_delta') {
      outputTokens = usage.parse(event).usage.output_tokens;
    } else if (event.type === 'message_stop') {
      if (!started) throw new LatchError('protocol_error', 'Completion arrived before message_start.');
      complete = true;
    } else if (event.type === 'error') {
      throw new LatchError('stream_error', raw);
    }
  }
  try {
    while (!complete) {
      const chunk = await reader.read();
      buffer += decoder.decode(chunk.value, { stream: !chunk.done });
      if (buffer.length > 1048576) throw new LatchError('protocol_error', 'SSE frame exceeded the size limit.');
      let boundary: RegExpExecArray | null;
      while ((boundary = /\r?\n\r?\n/.exec(buffer))) {
        const value = buffer.slice(0, boundary.index);
        buffer = buffer.slice(boundary.index + boundary[0].length);
        await frame(value);
      }
      if (chunk.done) break;
    }
    if (!complete) throw new LatchError('incomplete_stream', 'The model stream ended before message_stop.');
    return { text, model, inputTokens, outputTokens };
  } finally {
    await reader.cancel().catch(() => undefined);
    reader.releaseLock();
  }
}

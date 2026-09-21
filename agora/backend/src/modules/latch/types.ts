import { z } from 'zod';
export const modelBody = z.object({
  model: z.string().min(1).max(120), max_tokens: z.number().int().min(1).max(200),
  stream: z.literal(true), system: z.string().max(12000).optional(),
  messages: z.array(z.object({
    role: z.enum(['user', 'assistant']), content: z.string().min(1).max(100000)
  })).min(1).max(1000)
}).strict();
export type ModelBody = z.infer<typeof modelBody>;
export interface Observation {
  status: number; rawBody: string | null; contentType: string | null;
  requestId: string | null; latchId: string | null; retryAfter: string | null;
}
export interface Completion {
  text: string; inputTokens: number | null; outputTokens: number | null;
  model: string | null; observation: Observation;
}
export interface CallOptions {
  signal?: AbortSignal; onResponse?: (observation: Observation) => void | Promise<void>;
}
export class LatchError extends Error {
  constructor(public code: string, message: string, public observation?: Observation) { super(message); }
}

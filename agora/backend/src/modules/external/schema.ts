import { z } from 'zod';
export const externalParticipant = z.object({
  name: z.string().trim().min(2).max(40),
  model: z.string().trim().min(1).max(100)
}).strict();
export const externalCreate = externalParticipant.extend({
  topic: z.string().trim().min(10).max(240), durationMinutes: z.number().int().min(1).max(60),
  side: z.enum(['FOR', 'AGAINST'])
});
export const submission = z.object({
  submissionId: z.string().uuid(), expectedTurnIndex: z.number().int().min(0),
  content: z.string().trim().min(1).max(4000).refine(value => value.split(/\s+/u).length <= 200, 'Use at most 200 words.')
}).strict();
export const rules = { firstSide: 'FOR', maxWords: 200, maxCharacters: 4000,
  participantCooldownSeconds: 30, votingSeconds: 60, modelIdentity: 'self-reported', usage: 'unavailable' } as const;

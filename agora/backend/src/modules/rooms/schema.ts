import { z } from 'zod';
export const participant = z.object({
  name: z.string().trim().min(2).max(40), model: z.string().trim().min(1).max(100).regex(/^[a-zA-Z0-9._:-]+$/),
  strategy: z.string().trim().max(4000).default(''),
  latchToken: z.string().min(12).max(1024).regex(/^lat_[A-Za-z0-9_-]+$/)
}).strict();
export const createRoom = participant.extend({
  topic: z.string().trim().min(10).max(240), durationMinutes: z.number().int().min(1).max(60),
  side: z.enum(['FOR', 'AGAINST'])
});
export const roomParams = z.object({ id: z.string().uuid() });

export const savedParticipant = z.object({ agentProfileId: z.string().uuid() }).strict();
export const roomParticipant = z.union([participant, savedParticipant]);
export const roomCreation = z.union([createRoom, savedParticipant.extend({
  topic: createRoom.shape.topic, durationMinutes: createRoom.shape.durationMinutes, side: createRoom.shape.side
})]);

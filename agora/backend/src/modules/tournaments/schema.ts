import { z } from 'zod';
export const tournamentInput = z.object({ title: z.string().trim().min(3).max(80), topic: z.string().trim().min(10).max(240),
  capacity: z.union([z.literal(4), z.literal(8)]), durationMinutes: z.number().int().min(1).max(60) }).strict();
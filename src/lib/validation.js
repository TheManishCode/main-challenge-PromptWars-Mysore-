import { z } from 'zod';

export const moodSchema = z.object({
  mood: z.coerce.number().int().min(1).max(10),
  energy: z.coerce.number().int().min(1).max(10),
  sleepHours: z.coerce.number().min(0).max(16),
  exam: z.string().trim().min(2).max(80),
  journal: z.string().trim().min(30).max(4000)
});

export const chatSchema = z.object({
  message: z.string().trim().min(2).max(1200)
});

export const suggestSchema = z.object({
  count: z.coerce.number().int().min(1).max(20).optional().default(5)
});

export function parseJsonBody(schema, body) {
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    const details = parsed.error.issues.map((issue) => issue.message).join(', ');
    const error = new Error(`Invalid request: ${details}`);
    error.status = 400;
    throw error;
  }
  return parsed.data;
}

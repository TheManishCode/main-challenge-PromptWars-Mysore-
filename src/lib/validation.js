import { z } from 'zod';

export const moodSchema = z.object({
  mood: z.coerce.number().int().min(1).max(10),
  energy: z.coerce.number().int().min(1).max(10),
  sleepHours: z.coerce.number().min(0).max(16),
  exam: z.string().trim().min(2).max(80),
  journal: z.string().trim().min(30).max(4000),
  stress: z.coerce.number().int().min(1).max(10).optional().default(5),
  anxiety: z.coerce.number().int().min(1).max(10).optional().default(5),
  confidence: z.coerce.number().int().min(1).max(10).optional().default(5),
  studyHours: z.coerce.number().min(0).max(24).optional().default(0),
  emoji: z.string().max(8).optional().default('😊'),
  studySubject: z.string().trim().max(80).optional().default('')
});

export const chatSchema = z.object({
  message: z.string().trim().min(2).max(1200)
});

export const suggestSchema = z.object({
  count: z.coerce.number().int().min(1).max(20).optional().default(5)
});

export const entryInsightSchema = z.object({
  entryId: z.string().uuid()
});

export const guestbookSchema = z.object({
  authorName: z.string().trim().min(1).max(32),
  message: z.string().trim().min(2).max(280)
});

const EXAM_TYPES = ['NEET', 'JEE', 'UPSC', 'CAT', 'GATE', 'CUET', 'Custom'];

export const examCountdownSchema = z.object({
  examName: z.string().trim().min(2).max(80),
  examDate: z.string().trim().min(8).max(30),
  examType: z.enum(EXAM_TYPES)
});

export const mockTestSchema = z.object({
  examType: z.enum(EXAM_TYPES),
  score: z.coerce.number().min(0).max(1000),
  maxScore: z.coerce.number().min(1).max(1000),
  confidence: z.coerce.number().int().min(1).max(10),
  notes: z.string().trim().max(2000).optional().default('')
});

export const wellnessCoachSchema = z.object({
  mood: z.coerce.number().int().min(1).max(10),
  concern: z.string().trim().min(2).max(500),
  coachType: z.enum(['breathing', 'meditation', 'grounding', 'affirmation', 'exam_routine', 'study_break', 'recovery'])
});

export const burnoutQuerySchema = z.object({
  period: z.coerce.number().int().min(7).max(90).optional().default(30)
});

export const worrySchema = z.object({
  worry: z.string().trim().min(4).max(500)
});

export const imageAnalysisSchema = z.object({
  imageDataUrl: z.string().min(10).max(8_000_000),
  type: z.enum(['desk', 'handwriting', 'face'])
});

export const pressureValveSchema = z.object({
  text: z.string().trim().min(4).max(4000)
});

export const recallSchema = z.object({
  focus: z.string().trim().max(80).optional().default('')
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

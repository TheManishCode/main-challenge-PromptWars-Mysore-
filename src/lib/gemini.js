import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateObject, generateText } from 'ai';
import { randomUUID } from 'crypto';
import { z } from 'zod';
import { getRequiredEnv } from './env';
import { buildSafetyInstruction } from './safety';

const analysisSchema = z.object({
  summary: z.string().min(8),
  stressLevel: z.enum(['low', 'moderate', 'high']),
  hiddenTriggers: z.array(z.string().min(2)).max(8),
  emotionalPatterns: z.array(z.string().min(2)).max(8),
  copingStrategies: z.array(z.string().min(2)).min(2).max(6),
  mindfulnessExercise: z.string().min(8),
  encouragement: z.string().min(8),
  followUpQuestion: z.string().min(8)
});

function getModel() {
  const google = createGoogleGenerativeAI({
    apiKey: getRequiredEnv('GEMINI_API_KEY')
  });
  return google(process.env.GEMINI_MODEL || 'gemini-2.5-flash');
}

export async function analyzeEntry(input) {
  const prompt = `Analyze this student mood log and journal. Return only JSON matching the schema.

Mood: ${input.mood}/10
Energy: ${input.energy}/10
Sleep: ${input.sleepHours} hours
Exam focus: ${input.exam}
Journal:
${input.journal}

Requirements:
- Mention patterns only when supported by the journal text or numeric log.
- Keep coping strategies specific, short, and immediately usable.
- Do not invent events, diagnoses, medical claims, or personal facts.`;

  const result = await generateObject({
    model: getModel(),
    schema: analysisSchema,
    system: buildSafetyInstruction(),
    prompt,
    temperature: 0.4
  });

  return {
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    ...input,
    analysis: result.object
  };
}

export async function chatWithCompanion(message, recentEntries) {
  const context = recentEntries.map((entry) => ({
    exam: entry.exam,
    mood: entry.mood,
    energy: entry.energy,
    sleepHours: entry.sleepHours,
    analysis: entry.analysis
  }));

  const result = await generateText({
    model: getModel(),
    system: buildSafetyInstruction(),
    prompt: `Recent wellness context as JSON:
${JSON.stringify(context).slice(0, 6000)}

Student message:
${message}

Respond with 3 concise paragraphs maximum. Stay empathetic and actionable.`,
    temperature: 0.5,
    maxOutputTokens: 650
  });

  return result.text;
}

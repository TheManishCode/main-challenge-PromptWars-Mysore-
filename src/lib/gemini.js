import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateObject, generateText, streamText } from 'ai';
import { randomUUID } from 'crypto';
import { z } from 'zod';
import { getRequiredEnv } from './env';
import { buildSafetyInstruction } from './safety';

/* ─── Schemas ────────────────────────────────────────────────────────────── */

const analysisSchema = z.object({
  summary: z.string().min(8),
  stressLevel: z.enum(['low', 'moderate', 'high']),
  sentimentScore: z.number().min(-1).max(1).optional(),
  emotionalIntensity: z.number().min(1).max(10).optional(),
  anxietyIndicators: z.array(z.string()).optional(),
  burnoutIndicators: z.array(z.string()).optional(),
  selfDoubtIndicators: z.array(z.string()).optional(),
  motivationPatterns: z.array(z.string()).optional(),
  academicPressure: z.enum(['low', 'moderate', 'high', 'severe']).optional(),
  stressTriggers: z.array(z.string()).optional(),
  positiveTriggers: z.array(z.string()).optional(),
  riskFactors: z.array(z.string()).optional(),
  recoverySuggestions: z.array(z.string()).optional(),
  burnoutRiskScore: z.number().min(0).max(100).optional(),
  wellnessScore: z.number().min(0).max(100).optional(),
  hiddenTriggers: z.array(z.string()).optional(),
  emotionalPatterns: z.array(z.string()).optional(),
  copingStrategies: z.array(z.string()).optional(),
  mindfulnessExercise: z.string().min(8),
  encouragement: z.string().min(8),
  followUpQuestion: z.string().min(8)
});

const insightBubbleSchema = z.object({
  insights: z.array(z.object({
    category: z.enum(['Mood', 'Pattern', 'Suggestion', 'Highlight']),
    text: z.string().min(4).max(700)
  })).min(1).max(5)
});

const suggestionsSchema = z.object({
  schedule: z.array(z.string()).min(1).max(6),
  studyTips: z.array(z.string()).min(1).max(6),
  wellnessActions: z.array(z.string()).min(1).max(6),
  weeklyFocus: z.string().min(8)
});

const hiddenTriggersSchema = z.object({
  triggers: z.array(z.object({
    pattern: z.string().min(8),
    description: z.string().min(8),
    severity: z.enum(['low', 'moderate', 'high']),
    frequency: z.string().min(4),
    recommendation: z.string().min(8)
  })).min(1).max(10)
});

const wellnessCoachingSchema = z.object({
  exercise: z.object({
    name: z.string().min(4),
    type: z.string().min(4),
    duration: z.string().min(4),
    steps: z.array(z.string().min(4)).min(2).max(10)
  }),
  affirmations: z.array(z.string().min(8)).min(3).max(6),
  examDayTip: z.string().min(8),
  studyBreakIdea: z.string().min(8),
  personalizedAdvice: z.string().min(8)
});

const weeklyReportSchema = z.object({
  mentalHealthSummary: z.string().min(20),
  moodEvolution: z.string().min(20),
  stressFactors: z.array(z.string().min(4)).min(1).max(8),
  positiveAchievements: z.array(z.string().min(4)).min(1).max(8),
  suggestedImprovements: z.array(z.string().min(4)).min(1).max(8),
  actionPlan: z.array(z.string().min(4)).min(2).max(6),
  overallTrend: z.enum(['improving', 'stable', 'declining', 'fluctuating']),
  weeklyWellnessScore: z.number().min(0).max(100),
  weeklyBurnoutRisk: z.number().min(0).max(100),
  keyInsight: z.string().min(10)
});

const mockTestAnalysisSchema = z.object({
  emotionalReaction: z.string().min(10),
  performanceAssessment: z.string().min(10),
  recoveryStrategy: z.array(z.string().min(4)).min(2).max(6),
  motivationMessage: z.string().min(10),
  nextSteps: z.array(z.string().min(4)).min(2).max(5),
  confidenceAnalysis: z.string().min(10)
});

const burnoutPredictionSchema = z.object({
  burnoutRisk: z.number().min(0).max(100),
  trend: z.enum(['increasing', 'stable', 'decreasing']),
  earlyWarnings: z.array(z.string().min(4)).max(8),
  protectiveFactors: z.array(z.string().min(4)).max(6),
  prediction: z.string().min(10),
  timeToRisk: z.string().min(4),
  preventionPlan: z.array(z.string().min(4)).min(2).max(6)
});

const INSIGHT_ACCENTS = {
  Mood: '#ec5d75',
  Pattern: '#2f9eb3',
  Suggestion: '#f2a93b',
  Highlight: '#6fa65f'
};

function boundedNumber(value, fallback, min, max) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.min(max, Math.max(min, numeric));
}

function asList(value, fallback = []) {
  if (!Array.isArray(value)) return fallback;
  return value.filter((item) => typeof item === 'string' && item.trim()).slice(0, 8);
}

function normalizeAnalysis(analysis, input) {
  const stress = boundedNumber(input.stress, 5, 1, 10);
  const anxiety = boundedNumber(input.anxiety, 5, 1, 10);
  const mood = boundedNumber(input.mood, 5, 1, 10);
  const sleep = boundedNumber(input.sleepHours, 7, 0, 16);
  const inferredBurnout = boundedNumber((stress * 6) + (anxiety * 4) + Math.max(0, 7 - sleep) * 5, 35, 0, 100);
  const inferredWellness = boundedNumber((mood * 7) + (sleep >= 7 ? 20 : sleep * 2), 65, 0, 100);

  return {
    ...analysis,
    sentimentScore: boundedNumber(analysis.sentimentScore, (mood - 5) / 5, -1, 1),
    emotionalIntensity: boundedNumber(analysis.emotionalIntensity, Math.max(stress, anxiety), 1, 10),
    anxietyIndicators: asList(analysis.anxietyIndicators),
    burnoutIndicators: asList(analysis.burnoutIndicators),
    selfDoubtIndicators: asList(analysis.selfDoubtIndicators),
    motivationPatterns: asList(analysis.motivationPatterns),
    academicPressure: analysis.academicPressure || (stress >= 8 ? 'high' : stress >= 5 ? 'moderate' : 'low'),
    stressTriggers: asList(analysis.stressTriggers, asList(analysis.hiddenTriggers)),
    positiveTriggers: asList(analysis.positiveTriggers),
    riskFactors: asList(analysis.riskFactors),
    recoverySuggestions: asList(analysis.recoverySuggestions, asList(analysis.copingStrategies)),
    burnoutRiskScore: boundedNumber(analysis.burnoutRiskScore, inferredBurnout, 0, 100),
    wellnessScore: boundedNumber(analysis.wellnessScore, inferredWellness, 0, 100),
    hiddenTriggers: asList(analysis.hiddenTriggers),
    emotionalPatterns: asList(analysis.emotionalPatterns),
    copingStrategies: asList(analysis.copingStrategies, [
      'Take a short reset break before the next study block.',
      'Write down the next single task instead of the whole syllabus.'
    ]).slice(0, 6)
  };
}

/* ─── Model ──────────────────────────────────────────────────────────────── */

function getModel() {
  const google = createGoogleGenerativeAI({
    apiKey: getRequiredEnv('GEMINI_API_KEY')
  });
  return google(process.env.GEMINI_MODEL || 'gemini-2.5-flash');
}

// Low-latency model for the live voice conversation, where time-to-first-word
// matters more than depth. Falls back to flash-lite for fast first tokens.
function getFastModel() {
  const google = createGoogleGenerativeAI({
    apiKey: getRequiredEnv('GEMINI_API_KEY')
  });
  return google(process.env.GEMINI_VOICE_MODEL || 'gemini-2.5-flash-lite');
}

/* ─── Entry Analysis ─────────────────────────────────────────────────────── */

export async function analyzeEntry(input) {
  const prompt = `Analyze this student mood log and journal. Return only JSON matching the schema.

Mood: ${input.mood}/10
Energy: ${input.energy}/10
Sleep: ${input.sleepHours} hours
Stress: ${input.stress}/10
Anxiety: ${input.anxiety}/10
Confidence: ${input.confidence}/10
Study hours today: ${input.studyHours}
Study subject: ${input.studySubject || 'Not specified'}
Exam focus: ${input.exam}
Emoji: ${input.emoji}
Journal:
${input.journal}

Requirements:
- Required: summary, stressLevel, mindfulnessExercise, encouragement, followUpQuestion.
- Optional but useful: hiddenTriggers, emotionalPatterns, copingStrategies, anxietyIndicators, burnoutIndicators, stressTriggers, positiveTriggers, burnoutRiskScore, wellnessScore.
- Keep arrays short, specific, and grounded in the text.
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
    analysis: normalizeAnalysis(result.object, input)
  };
}

/* ─── Companion Chat ─────────────────────────────────────────────────────── */

export async function chatWithCompanion(message, recentEntries) {
  const context = recentEntries.map((entry) => ({
    createdAt: entry.createdAt,
    exam: entry.exam,
    mood: entry.mood,
    energy: entry.energy,
    sleepHours: entry.sleepHours,
    stress: entry.stress,
    anxiety: entry.anxiety,
    confidence: entry.confidence,
    studyHours: entry.studyHours,
    journal: entry.journal,
    analysis: entry.analysis
  }));

  const result = await generateText({
    model: getModel(),
    system: [
      buildSafetyInstruction(),
      'You are a warm, perceptive study coach for a stressed Indian student preparing for high-stakes exams (NEET, JEE, UPSC, CUET, GATE, boards). Your purpose is to talk WITH them and guide them — through understanding and good questions — to reach their own answer, not to hand them a finished plan or a list of tips.',
      'Show real empathy first, briefly and sincerely — acknowledge how they feel in a sentence, without being theatrical or repeating the same validation.',
      'Lead with curiosity that has a PURPOSE. Ask meaningful, specific questions that help you understand their mindset and their real blocker, and that move them one step closer to clarity — like "which exam is closest for you?" or "when you sit to study, what actually stops you — not knowing where to begin, or feeling too drained?". Never ask hollow, aimless questions like "tell me more" or "what is underneath that".',
      'Guide them to their OWN answer step by step. Do not jump straight to a finished study plan. Narrow things down with them, surface what they already half-know, and let them name the next step — then you can gently confirm or shape it.',
      'Build on what they said so they feel understood before the next question. Usually end with one thoughtful question; only give a direct suggestion once you truly understand their situation or they clearly just need reassurance.',
      'Use warm, plain, conversational language. Keep it to 1-3 short paragraphs, no bullet lists unless they ask.',
      'Stay grounded in what the student actually shared in their journal and message. Never invent events, family problems, diagnoses, or health claims.'
    ].join('\n'),
    prompt: `The student's journal history (most recent first) — use only what is actually here:
${JSON.stringify(context).slice(0, 12000)}

Student says:
${message}

Respond like a caring coach: briefly show you understand how they feel, build on what they shared, then guide them forward with one meaningful, specific question that helps them understand their own situation and narrow toward their next step. Do not hand them the final answer — walk them to it. Warm, perceptive, and human.`,
    temperature: 0.55,
    maxOutputTokens: 600,
    providerOptions: { google: { thinkingConfig: { thinkingBudget: 0 } } }
  });

  return result.text;
}

function buildChatContext(recentEntries) {
  return recentEntries.map((entry) => ({
    createdAt: entry.createdAt,
    exam: entry.exam,
    mood: entry.mood,
    energy: entry.energy,
    sleepHours: entry.sleepHours,
    stress: entry.stress,
    anxiety: entry.anxiety,
    confidence: entry.confidence,
    studyHours: entry.studyHours,
    journal: entry.journal,
    analysis: entry.analysis
  }));
}

/* ─── Live Voice Companion (streaming) ───────────────────────────────────── */

export function streamCompanionReply(message, recentEntries, history = []) {
  const context = buildChatContext(recentEntries.slice(0, 6));
  const transcript = history
    .slice(-6)
    .map((m) => `${m.role === 'student' ? 'Student' : 'You'}: ${m.content}`)
    .join('\n');

  return streamText({
    model: getFastModel(),
    system: [
      buildSafetyInstruction(),
      'You are a warm, perceptive study coach for a stressed Indian student preparing for high-stakes exams (NEET, JEE, UPSC, CUET, GATE, boards). This is a LIVE SPOKEN conversation. Your purpose is to TALK WITH them and guide them — through good questions and understanding — to reach their own answer, not to hand them a finished plan.',
      'Keep replies short and natural for speech: 1 to 3 sentences. No markdown, lists, headings, or emojis — it is read aloud.',
      'Show real, grounded empathy: acknowledge how they feel once, simply and sincerely. Never be theatrical ("oh wow, absolutely terrifying") and never repeat the same validation twice.',
      'Lead with curiosity that has a PURPOSE. Most replies should end with ONE meaningful, specific question that deepens your understanding of their situation or mindset and moves them one concrete step closer to clarity.',
      'Your questions must be useful and pointed — they should help the student understand themselves and narrow things down. Ask things like "which exam is closest for you?", "when you sit down to study, what actually stops you — not knowing where to start, or feeling too drained to focus?". NEVER ask hollow, aimless questions like "tell me more" or "what is underneath that".',
      'Guide them to their OWN answer step by step. Do NOT jump straight to the final plan or a ready-made "do 25 minutes of Physics" prescription. Help them arrive at it: narrow the subject with them, surface what they already half-know, then let them name the next step (you can gently confirm or shape it).',
      'Build on what they said so they feel understood before you ask the next thing. One thoughtful question at a time, not a list.',
      'If they are panicking or in real distress, comfort and ground them first (a slow breath, a moment) before any question.',
      'Be encouraging and human, never clinical, never preachy. Stay grounded in what the student actually shared — never invent facts about their life, family, or health.'
    ].join('\n'),
    prompt: `${transcript ? `Conversation so far:\n${transcript}\n\n` : ''}The student's recent journal context (use only if relevant, do not invent anything):
${JSON.stringify(context).slice(0, 3500)}

Student just said (spoken aloud):
${message}

Reply out loud now: briefly show you understand how they feel, then guide them forward with ONE meaningful, specific question that helps them understand their own situation and narrow toward their next step. Do not hand them the final answer — walk them to it. Warm and human, 1 to 3 natural sentences.`,
    temperature: 0.62,
    maxOutputTokens: 320,
    providerOptions: { google: { thinkingConfig: { thinkingBudget: 0 } } }
  });
}

/* ─── Future Letter ──────────────────────────────────────────────────────── */

const futureLetterSchema = z.object({
  letter: z.string().min(80),
  keyStrengths: z.array(z.string().min(4)).min(1).max(4),
  reminder: z.string().min(10)
});

export async function generateFutureLetter(entries) {
  const context = entries.slice(0, 10).map((entry) => ({
    exam: entry.exam,
    mood: entry.mood,
    sleepHours: entry.sleepHours,
    stress: entry.stress,
    journal: entry.journal?.slice(0, 400),
    stressTriggers: entry.analysis?.stressTriggers,
    encouragement: entry.analysis?.encouragement
  }));

  const result = await generateObject({
    model: getModel(),
    schema: futureLetterSchema,
    system: buildSafetyInstruction(),
    prompt: `Write a heartfelt letter from this student's FUTURE SELF — written as if they have already survived their board exam season and are looking back.

The letter should:
- Speak directly to the specific fears and struggles visible in their journal history
- Reference actual details from their entries (the exam they're preparing for, specific worries they mentioned)
- Be warm, personal, and emotionally honest — not generic motivation
- Acknowledge the real difficulty they are in right now
- Share what they learned from this period
- NOT give study tips or advice — only emotional truth and perspective

Journal history (real data):
${JSON.stringify(context).slice(0, 6000)}

Return:
- letter: the full letter from future-self (3-4 paragraphs, written in first person as the future self speaking to current self)
- keyStrengths: 2-4 actual strengths visible in their journal data
- reminder: one short sentence — the single most important thing they need to hear right now`,
    temperature: 0.7
  });

  return result.object;
}

/* ─── Pressure Valve Clarity ─────────────────────────────────────────────── */

const pressureValveSchema = z.object({
  realConcern: z.string().min(10),
  whatYouFeel: z.string().min(10),
  oneNextStep: z.string().min(10),
  validation: z.string().min(10)
});

export async function processPressureValve(rawDump) {
  const result = await generateObject({
    model: getModel(),
    schema: pressureValveSchema,
    system: buildSafetyInstruction(),
    prompt: `A student just did a 60-second unfiltered writing dump. Read it carefully and extract the real emotional signal underneath.

Dump:
${rawDump.slice(0, 3000)}

Return:
- realConcern: in one clear sentence, what is this person ACTUALLY worried about underneath all the chaos
- whatYouFeel: name the primary emotion here honestly (not "stressed" — be precise: "afraid of disappointing your parents", "exhausted from pretending to be okay", etc.)
- oneNextStep: the single smallest possible next step they can take in the next 10 minutes
- validation: 1-2 sentences that validate this is genuinely hard, without minimizing or fixing`,
    temperature: 0.5
  });

  return result.object;
}

/* ─── Worry Analysis ─────────────────────────────────────────────────────── */

const worryAnalysisSchema = z.object({
  acknowledgment: z.string().min(10),
  isInTheirControl: z.boolean(),
  whatTheyCanControl: z.string().min(10),
  parkUntil: z.string().min(4),
  parkMessage: z.string().min(10)
});

export async function analyzeWorry(worryText) {
  const result = await generateObject({
    model: getModel(),
    schema: worryAnalysisSchema,
    system: buildSafetyInstruction(),
    prompt: `A student is trying to "park" this worry so they can focus on studying without it looping in their head.

Worry: ${worryText.slice(0, 500)}

Help them park it safely:
- acknowledgment: 1 sentence genuinely acknowledging this worry is real and understandable
- isInTheirControl: can they actually do something about this RIGHT NOW?
- whatTheyCanControl: what small aspect of this CAN they influence (even if worry itself is not fully in their control)
- parkUntil: a short label for when to revisit this (e.g. "After your exam", "This weekend", "When results come")
- parkMessage: a warm 1-sentence message like "This worry is now parked. You gave it space. You can come back to it [parkUntil]."`,
    temperature: 0.5
  });

  return result.object;
}

/* ─── Image Analysis ─────────────────────────────────────────────────────── */

const imageAnalysisSchema = z.object({
  observations: z.array(z.string().min(4)).min(1).max(6),
  stressSignals: z.array(z.string().min(4)).max(4),
  positiveSignals: z.array(z.string().min(4)).max(3),
  summary: z.string().min(10),
  suggestion: z.string().min(10)
});

export async function analyzeImage(imageBuffer, mimeType, type) {
  const prompts = {
    desk: `Look at this study desk photo. Observe what you can see and identify signals that might relate to the student's stress or wellness.
Look for: clutter or organization, number of coffee cups/energy drinks, time indicators (clock, lighting), how many books/papers, sticky notes, phone presence, lighting quality, signs of long hours.
Be observational and kind — not judgmental.`,
    handwriting: `Look at this handwriting sample. Observe characteristics that might indicate the student's current mental state.
Look for: pressure (light/heavy), speed indicators (rushed/careful), consistency, clarity, any crossed-out words or corrections, general neatness.
Be observational and kind — do not diagnose.`,
    face: `Look at this photo. Observe what you can about this person's apparent current state.
Look for: apparent tiredness (eye appearance), tension in face/posture, overall energy level suggested by appearance.
Be gentle, observational, and kind. Do NOT diagnose emotions or mental states definitively — only describe what is visually observable.`
  };

  const result = await generateObject({
    model: getModel(),
    schema: imageAnalysisSchema,
    system: buildSafetyInstruction(),
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: `${prompts[type] || prompts.desk}\n\nReturn your observations in the schema provided.` },
          { type: 'image', image: imageBuffer, mimeType: mimeType || 'image/jpeg' }
        ]
      }
    ],
    temperature: 0.4
  });

  return result.object;
}

/* ─── Entry Insights ─────────────────────────────────────────────────────── */

export async function generateEntryInsights(entry) {
  const result = await generateObject({
    model: getModel(),
    schema: insightBubbleSchema,
    system: buildSafetyInstruction(),
    prompt: `Create distinct speech-bubble insights for this journal entry. Use only these categories: Mood, Pattern, Suggestion, Highlight.

Journal entry:
${JSON.stringify({
  createdAt: entry.createdAt,
  exam: entry.exam,
  mood: entry.mood,
  energy: entry.energy,
  sleepHours: entry.sleepHours,
  stress: entry.stress,
  anxiety: entry.anxiety,
  confidence: entry.confidence,
  studyHours: entry.studyHours,
  journal: entry.journal,
  analysis: entry.analysis
})}

Rules:
- Return 2 to 5 bubbles.
- Each bubble must focus on one idea only.
- Mood names the emotional state.
- Pattern points to repeated or likely behavioral signals from the entry.
- Suggestion gives a specific next action.
- Highlight names a strength, win, or useful clue.
- Do not diagnose or invent facts.`,
    temperature: 0.45
  });

  return result.object.insights.map((insight) => ({
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    category: insight.category,
    text: insight.text,
    accent: INSIGHT_ACCENTS[insight.category]
  }));
}

/* ─── Suggestions ────────────────────────────────────────────────────────── */

export async function generateSuggestions(entries) {
  const context = entries.map((entry) => ({
    exam: entry.exam,
    mood: entry.mood,
    energy: entry.energy,
    sleepHours: entry.sleepHours,
    stress: entry.stress,
    anxiety: entry.anxiety,
    studyHours: entry.studyHours,
    stressLevel: entry.analysis?.stressLevel,
    createdAt: entry.createdAt
  }));

  const result = await generateObject({
    model: getModel(),
    schema: suggestionsSchema,
    system: buildSafetyInstruction(),
    prompt: `Based on this student's recent wellness log data, generate personalized scheduling and study suggestions.

Wellness data (most recent first):
${JSON.stringify(context).slice(0, 4000)}

Generate:
- schedule: daily schedule suggestions (study blocks, breaks, sleep times) based on their sleep and energy patterns
- studyTips: specific study strategies based on their exam focus and stress level
- wellnessActions: wellness activities tailored to their mood and energy patterns
- weeklyFocus: one sentence describing the most important thing to focus on this week

Base everything on the actual data provided. Do not invent patterns not supported by the logs.`,
    temperature: 0.5
  });

  return result.object;
}

/* ─── Hidden Trigger Detection ───────────────────────────────────────────── */

export async function detectHiddenTriggers(entries) {
  const context = entries.map((entry) => ({
    createdAt: entry.createdAt,
    dayOfWeek: new Date(entry.createdAt).toLocaleDateString('en-US', { weekday: 'long' }),
    mood: entry.mood,
    energy: entry.energy,
    sleepHours: entry.sleepHours,
    stress: entry.stress,
    anxiety: entry.anxiety,
    confidence: entry.confidence,
    studyHours: entry.studyHours,
    exam: entry.exam,
    studySubject: entry.studySubject,
    stressLevel: entry.analysis?.stressLevel,
    burnoutRiskScore: entry.analysis?.burnoutRiskScore,
    wellnessScore: entry.analysis?.wellnessScore,
    stressTriggers: entry.analysis?.stressTriggers,
    emotionalIntensity: entry.analysis?.emotionalIntensity
  }));

  const result = await generateObject({
    model: getModel(),
    schema: hiddenTriggersSchema,
    system: buildSafetyInstruction(),
    prompt: `Analyze these student wellness entries to detect HIDDEN stress triggers and emotional patterns that the student may not be aware of.

Entries (most recent first, includes day of week):
${JSON.stringify(context).slice(0, 8000)}

Look for patterns like:
- Stress spikes on specific days of the week (e.g. "Stress spikes every Sunday night")
- Mood drops after specific activities or subjects
- Anxiety increases when sleep drops below a threshold
- Energy crashes correlated with high study hours
- Confidence drops before/after mock tests
- Burnout indicators building over time
- Specific subjects causing more stress than others
- Time-of-week patterns (weekend anxiety, weekday fatigue)

For each trigger found:
- pattern: a short label (e.g. "Sunday night stress spike")
- description: explain what the data shows (e.g. "Your stress levels consistently rise on Sunday nights, likely due to anticipation of the coming week")
- severity: how concerning is this pattern
- frequency: how often it appears (e.g. "3 out of 4 Sundays")
- recommendation: a specific actionable step to address it

Only report patterns that are actually supported by the data. Do not invent correlations.`,
    temperature: 0.4
  });

  return result.object.triggers;
}

/* ─── Wellness Coaching ──────────────────────────────────────────────────── */

export async function generateWellnessCoaching(coachData, recentEntries) {
  const context = recentEntries.slice(0, 5).map((entry) => ({
    mood: entry.mood,
    energy: entry.energy,
    stress: entry.stress,
    anxiety: entry.anxiety,
    sleepHours: entry.sleepHours,
    stressLevel: entry.analysis?.stressLevel,
    createdAt: entry.createdAt
  }));

  const coachTypeMap = {
    breathing: 'a guided breathing exercise (4-7-8 or box breathing with exact timing)',
    meditation: 'a short guided meditation script (3-5 minutes, visualization-based)',
    grounding: 'a grounding exercise (5-4-3-2-1 senses technique or similar)',
    affirmation: 'personalized positive affirmations for exam preparation',
    exam_routine: 'a calming exam-day morning routine with exact timing',
    study_break: 'a rejuvenating study break activity (5-10 minutes)',
    recovery: 'a burnout recovery plan for the next 24 hours'
  };

  const result = await generateObject({
    model: getModel(),
    schema: wellnessCoachingSchema,
    system: buildSafetyInstruction(),
    prompt: `Generate a personalized wellness coaching session for this student.

Current state:
- Mood: ${coachData.mood}/10
- Concern: ${coachData.concern}
- Requested exercise type: ${coachData.coachType}

Recent wellness data:
${JSON.stringify(context).slice(0, 3000)}

Generate:
- exercise: ${coachTypeMap[coachData.coachType] || 'a calming wellness exercise'}. Include name, type, estimated duration, and step-by-step instructions.
- affirmations: 3-6 personalized positive affirmations relevant to their situation.
- examDayTip: one practical exam-day tip based on their patterns.
- studyBreakIdea: one specific study break activity.
- personalizedAdvice: a warm, personalized message addressing their specific concern.

Make everything specific to their data. Do not use generic advice.`,
    temperature: 0.5
  });

  return result.object;
}

/* ─── Weekly Report ──────────────────────────────────────────────────────── */

export async function generateWeeklyReport(entries) {
  const context = entries.map((entry) => ({
    createdAt: entry.createdAt,
    mood: entry.mood,
    energy: entry.energy,
    sleepHours: entry.sleepHours,
    stress: entry.stress,
    anxiety: entry.anxiety,
    confidence: entry.confidence,
    studyHours: entry.studyHours,
    exam: entry.exam,
    stressLevel: entry.analysis?.stressLevel,
    burnoutRiskScore: entry.analysis?.burnoutRiskScore,
    wellnessScore: entry.analysis?.wellnessScore,
    stressTriggers: entry.analysis?.stressTriggers,
    positiveTriggers: entry.analysis?.positiveTriggers
  }));

  const result = await generateObject({
    model: getModel(),
    schema: weeklyReportSchema,
    system: buildSafetyInstruction(),
    prompt: `Generate a comprehensive weekly mental health report for this student based on their journal entries from the past week.

Weekly entries (most recent first):
${JSON.stringify(context).slice(0, 8000)}

Generate:
- mentalHealthSummary: 2-3 sentence overview of their mental health this week
- moodEvolution: describe how their mood changed over the week (start → end, peaks, valleys)
- stressFactors: the main stressors identified this week
- positiveAchievements: things they did well or positive moments
- suggestedImprovements: specific areas to improve next week
- actionPlan: 2-6 concrete steps for next week
- overallTrend: is their wellness improving, stable, declining, or fluctuating
- weeklyWellnessScore: 0-100 aggregate wellness score for the week
- weeklyBurnoutRisk: 0-100 aggregate burnout risk for the week
- keyInsight: the single most important insight from this week's data

Base everything on actual data. Be encouraging but honest.`,
    temperature: 0.45
  });

  return result.object;
}

/* ─── Mock Test Analysis ─────────────────────────────────────────────────── */

export async function analyzeMockTest(testData, recentEntries) {
  const context = recentEntries.slice(0, 5).map((entry) => ({
    mood: entry.mood,
    energy: entry.energy,
    stress: entry.stress,
    anxiety: entry.anxiety,
    confidence: entry.confidence,
    sleepHours: entry.sleepHours,
    createdAt: entry.createdAt
  }));

  const scorePercent = ((testData.score / testData.maxScore) * 100).toFixed(1);

  const result = await generateObject({
    model: getModel(),
    schema: mockTestAnalysisSchema,
    system: buildSafetyInstruction(),
    prompt: `Analyze this student's mock test performance and provide emotional support and strategic guidance.

Mock test results:
- Exam type: ${testData.examType}
- Score: ${testData.score}/${testData.maxScore} (${scorePercent}%)
- Self-reported confidence: ${testData.confidence}/10
- Notes: ${testData.notes || 'None provided'}

Recent wellness context:
${JSON.stringify(context).slice(0, 3000)}

Generate:
- emotionalReaction: assess how the student is likely feeling about this score given their confidence level and recent mood patterns
- performanceAssessment: honest but encouraging assessment of the score
- recoveryStrategy: specific steps to recover emotionally from this test (whether good or bad score)
- motivationMessage: personalized motivational message
- nextSteps: concrete study and wellness steps for the next few days
- confidenceAnalysis: analysis of the gap between their confidence and actual performance

Be empathetic. Never dismiss feelings. If the score is low, focus on growth mindset and specific improvement strategies. If high, celebrate and prevent complacency.`,
    temperature: 0.45
  });

  return result.object;
}

/* ─── Burnout Prediction ─────────────────────────────────────────────────── */

export async function generateBurnoutPrediction(entries) {
  const context = entries.map((entry) => ({
    createdAt: entry.createdAt,
    mood: entry.mood,
    energy: entry.energy,
    sleepHours: entry.sleepHours,
    stress: entry.stress,
    anxiety: entry.anxiety,
    studyHours: entry.studyHours,
    stressLevel: entry.analysis?.stressLevel,
    burnoutRiskScore: entry.analysis?.burnoutRiskScore,
    burnoutIndicators: entry.analysis?.burnoutIndicators
  }));

  const result = await generateObject({
    model: getModel(),
    schema: burnoutPredictionSchema,
    system: buildSafetyInstruction(),
    prompt: `Analyze this student's wellness data over time to predict burnout risk and provide early warnings.

Entries (most recent first):
${JSON.stringify(context).slice(0, 6000)}

Analyze trends:
- Are stress levels increasing over time?
- Is sleep declining?
- Are study hours unsustainably high?
- Is mood on a downward trend?
- Are burnout indicators accumulating?
- Is there a recovery pattern or is it continuous decline?

Generate:
- burnoutRisk: 0-100 predicted burnout risk based on trends
- trend: is the risk increasing, stable, or decreasing
- earlyWarnings: specific early warning signs detected
- protectiveFactors: positive factors that are protecting against burnout
- prediction: plain language prediction (e.g. "At current pace, burnout likely within 2 weeks")
- timeToRisk: estimated time until burnout if trends continue (e.g. "10-14 days")
- preventionPlan: specific steps to prevent burnout

Base predictions strictly on data trends. Be cautious but clear.`,
    temperature: 0.4
  });

  return result.object;
}

import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateObject, generateText } from 'ai';
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
    system: buildSafetyInstruction(),
    prompt: `The student's complete available journal history is provided below as JSON, most recent first. Use it as durable memory for this conversation, but only reference details that are actually present.
${JSON.stringify(context).slice(0, 14000)}

Student message:
${message}

Respond with 3 concise paragraphs maximum. Stay empathetic and actionable. When useful, connect today's request to prior journal entries naturally. If you notice concerning patterns across entries (increasing stress, declining mood, poor sleep), gently point them out.`,
    temperature: 0.5,
    maxTokens: 650
  });

  return result.text;
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

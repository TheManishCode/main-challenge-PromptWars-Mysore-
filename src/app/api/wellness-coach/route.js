import { NextResponse } from 'next/server';
import { generateWellnessCoaching } from '@/lib/gemini';
import { listEntries, updateStreak } from '@/lib/db';
import { getActor } from '@/lib/auth';
import { assertSameOrigin, jsonError, rateLimit } from '@/lib/security';
import { parseJsonBody, wellnessCoachSchema } from '@/lib/validation';

export async function POST(request) {
  try {
    assertSameOrigin(request);
    const actor = await getActor();
    await rateLimit(`coach:${actor.storageKey}`, { limit: 10, windowMs: 60 * 60 * 1000 });

    const coachData = parseJsonBody(wellnessCoachSchema, await request.json());
    const entries = await listEntries(actor.storageKey, 10);

    const coaching = await generateWellnessCoaching(coachData, entries);

    if (coachData.coachType === 'meditation' || coachData.coachType === 'breathing') {
      await updateStreak(actor.storageKey, 'meditation');
    }

    return NextResponse.json({ coaching });
  } catch (error) {
    return jsonError(error);
  }
}

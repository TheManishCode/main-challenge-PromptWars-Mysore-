import { NextResponse } from 'next/server';
import { generateBurnoutPrediction } from '@/lib/gemini';
import { listEntries } from '@/lib/db';
import { getActor } from '@/lib/auth';
import { jsonError, rateLimit } from '@/lib/security';
import { parseJsonBody, burnoutQuerySchema } from '@/lib/validation';

export async function GET(request) {
  try {
    const actor = await getActor();
    await rateLimit(`burnout:${actor.storageKey}`, { limit: 5, windowMs: 60 * 60 * 1000 });

    const { searchParams } = new URL(request.url);
    const period = parseInt(searchParams.get('period') || '30', 10);
    const validated = parseJsonBody(burnoutQuerySchema, { period });

    const entries = await listEntries(actor.storageKey, validated.period);
    if (entries.length < 3) {
      return NextResponse.json({
        prediction: null,
        message: 'Need at least 3 check-ins to predict burnout risk. Keep journaling!'
      });
    }

    const prediction = await generateBurnoutPrediction(entries);
    return NextResponse.json({ prediction, message: null });
  } catch (error) {
    return jsonError(error);
  }
}

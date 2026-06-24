import { NextResponse } from 'next/server';
import { generateRecallQuestions } from '@/lib/gemini';
import { listEntries } from '@/lib/db';
import { getActor } from '@/lib/auth';
import { assertSameOrigin, jsonError, rateLimit } from '@/lib/security';
import { parseJsonBody, recallSchema } from '@/lib/validation';

export async function POST(request) {
  try {
    assertSameOrigin(request);
    const actor = await getActor();
    await rateLimit(`recall:${actor.storageKey}`, { limit: 15, windowMs: 60 * 60 * 1000 });

    const { focus } = parseJsonBody(recallSchema, await request.json());
    const entries = await listEntries(actor.storageKey, 8);

    if (!entries.length && !focus) {
      return NextResponse.json({
        recall: null,
        message: 'Type a subject to be quizzed on, or log a check-in first so I know what you are studying.'
      });
    }

    const recall = await generateRecallQuestions(entries, focus);
    return NextResponse.json({ recall, message: null });
  } catch (error) {
    return jsonError(error);
  }
}

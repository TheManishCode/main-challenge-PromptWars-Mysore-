import { NextResponse } from 'next/server';
import { generateFutureLetter } from '@/lib/gemini';
import { listEntries } from '@/lib/db';
import { getActor } from '@/lib/auth';
import { assertSameOrigin, jsonError, rateLimit } from '@/lib/security';

export async function POST(request) {
  try {
    assertSameOrigin(request);
    const actor = await getActor();
    await rateLimit(`future-letter:${actor.storageKey}`, { limit: 5, windowMs: 60 * 60 * 1000 });

    const entries = await listEntries(actor.storageKey, 10, { includeJournal: true });
    if (!entries.length) {
      return NextResponse.json({ error: 'Write at least one journal entry first so your future self has something to respond to.' }, { status: 400 });
    }

    const letter = await generateFutureLetter(entries);
    return NextResponse.json({ letter });
  } catch (error) {
    return jsonError(error);
  }
}
